const { test } = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const { once } = require('node:events')

function get(port, path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path }, res => {
      let body = ''
      res.on('data', chunk => { body += chunk })
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) }))
    }).on('error', reject)
  })
}

test('Express mantém contratos e busca local/cache válido funcionam durante bloqueio 429', async () => {
  const originalFetch = global.fetch
  const originalToken = process.env.BRAPI_TOKEN
  process.env.BRAPI_TOKEN = 'credencial-privada-de-teste'
  let chamadas = 0
  let modo = 'cotacao'
  global.fetch = async () => {
    chamadas++
    if (modo === 'auth') return new Response('', { status: 401 })
    if (modo === '429') return new Response('', { status: 429, headers: { 'Retry-After': '120' } })
    return Response.json({ results: [{ symbol: 'TEST11', regularMarketPrice: 100, regularMarketTime: '2026-10-20T17:00:00Z' }] })
  }
  const app = require('../server')
  const server = app.listen(0, '127.0.0.1')
  try {
    await once(server, 'listening')
    const port = server.address().port
    assert.equal((await get(port, '/cotacao/INVALID!')).status, 400)
    assert.equal(chamadas, 0)
    modo = 'auth'
    const auth = await get(port, '/cotacao/AUTH11')
    assert.equal(auth.status, 502)
    assert.equal(auth.body.status, 401)
    assert.equal(JSON.stringify(auth).includes(process.env.BRAPI_TOKEN), false)
    modo = 'cotacao'
    const first = await get(port, '/cotacao/%20test11%20')
    assert.equal(first.status, 200)
    assert.equal(first.body.preco, 100)
    assert.equal(first.body.cacheStatus, 'miss')
    modo = '429'
    const blocked = await get(port, '/historico/TEST11')
    assert.equal(blocked.status, 502)
    assert.equal(blocked.body.status, 429)
    assert.equal(blocked.headers['retry-after'], '120')
    const callsBefore = chamadas
    const [hit, local, cold] = await Promise.all([
      get(port, '/cotacao/TEST11'), get(port, '/buscar'), get(port, '/historico/OTHER11'),
    ])
    assert.equal(hit.status, 200)
    assert.equal(hit.body.cacheStatus, 'hit')
    assert.equal(local.status, 200)
    assert.ok(Array.isArray(local.body))
    assert.equal(cold.status, 502)
    assert.equal(cold.body.status, 429)
    assert.equal(chamadas, callsBefore)
    assert.equal(hit.body.atualizadoEm, first.body.atualizadoEm)
  } finally {
    await new Promise(resolve => server.close(resolve))
    global.fetch = originalFetch
    if (originalToken === undefined) delete process.env.BRAPI_TOKEN
    else process.env.BRAPI_TOKEN = originalToken
  }
})
