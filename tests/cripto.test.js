const { test } = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const { once } = require('node:events')
const { criarServicoCoingecko } = require('../services/coingecko')
const { criarRouterCripto } = require('../routes/cripto')
const moeda = { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc', current_price: 500000, price_change_percentage_24h: -1.2,
  total_volume: 1234, market_cap: null, last_updated: '2026-10-25T10:00:00Z' }
function ambiente() {
  let tempo = 1000000000, modo = 'ok', chave = 'credencial-sintetica'
  const chamadas = []
  const servico = criarServicoCoingecko({ obterChave: () => chave, agora: () => tempo, intervalo: 0, requisitar: async (url, options) => {
    chamadas.push({ url, options })
    if (modo === 'rede') throw Error('rede')
    if (modo === 'timeout') throw Object.assign(Error('timeout'), { name: 'TimeoutError' })
    if (typeof modo === 'number') return new Response('', { status: modo, headers: { 'Retry-After': '60' } })
    if (modo === 'invalido') return Response.json({ segredo: 'nao-publicar' })
    if (modo === 'vazio') return Response.json(url.includes('market_chart') ? { prices: [] } : [])
    if (url.includes('/search?')) return Response.json({ coins: [{ id: 'bitcoin' }, { id: 'ethereum' }] })
    if (url.includes('market_chart')) return Response.json({ prices: [[1000, 20], [2000, 25], [3000, null]] })
    return Response.json([{ ...moeda, ...(modo === 'nulos' ? { current_price: null, total_volume: null, last_updated: null, price_change_percentage_24h: null } : {}) }])
  } })
  return { servico, chamadas, avancar: ms => { tempo += ms }, modo: m => { modo = m }, chave: k => { chave = k } }
}
test('listagem BRL sem fan-out, normalização, ausência de valores e deduplicação', async () => {
  const a = ambiente()
  const [x, y] = await Promise.all([a.servico.listar(), a.servico.listar()])
  assert.deepEqual(x, y); assert.equal(a.chamadas.length, 1)
  assert.equal(x.itens[0].preco, 500000); assert.equal(x.itens[0].capitalizacao, null)
  assert.equal(x.itens[0].simbolo, 'BTC'); assert.equal(x.moeda, 'BRL')
  assert.match(a.chamadas[0].url, /vs_currency=brl/)
  assert.equal(a.chamadas[0].options.headers['x-cg-demo-api-key'], 'credencial-sintetica')
  assert.doesNotMatch(a.chamadas[0].url, /credencial/)
  assert.doesNotMatch(JSON.stringify(x), /credencial/)
  x.itens[0].preco = 1
  assert.equal((await a.servico.listar()).itens[0].preco, 500000)
  a.avancar(120001); a.modo('nulos')
  const n = await a.servico.listar()
  assert.equal(n.itens[0].preco, null); assert.equal(n.itens[0].atualizadoEm, null)
})
test('campo vazio não pesquisa globalmente; pesquisa usa IDs em uma consulta agrupada e cache', async () => {
  const a = ambiente(); await a.servico.listar({ pesquisa: '  ' })
  assert.equal(a.chamadas.length, 1)
  assert.ok(!a.chamadas[0].url.includes('/search'))
  await a.servico.listar({ pesquisa: 'btc' })
  assert.equal(a.chamadas.length, 3)
  assert.match(a.chamadas[1].url, /search\?query=btc/)
  assert.match(a.chamadas[2].url, /ids=bitcoin%2Cethereum/)
  await a.servico.listar({ pesquisa: ' BTC ' }); assert.equal(a.chamadas.length, 3)
})
test('históricos 7/30/90 têm caches distintos e mantêm timestamps reais', async () => {
  const a = ambiente()
  for (const dias of ['7', '30', '90']) {
    const r = await a.servico.historico('bitcoin', dias)
    assert.equal(r.dias, Number(dias)); assert.equal(r.pontos.length, 2)
    assert.equal(r.ultimaAmostraEm, '1970-01-01T00:00:02.000Z')
  }
  await a.servico.historico('bitcoin', '7'); assert.equal(a.chamadas.length, 3)
  assert.ok(a.chamadas.every(c => !c.url.includes('interval=')))
})
test('valida IDs, períodos, página e pesquisa antes de consultar a fonte', async () => {
  const a = ambiente()
  for (const id of ['../x', 'BITCOIN', '', {}, 'x'.repeat(121)]) assert.throws(() => a.servico.historico(id, '7'))
  for (const dias of ['1', '365', 'max', ['7']]) assert.throws(() => a.servico.historico('bitcoin', dias))
  for (const p of [{ pagina: '0' }, { pagina: ['1'] }, { pesquisa: {} }, { pesquisa: 'x'.repeat(81) }]) await assert.rejects(a.servico.listar(p))
  assert.equal(a.chamadas.length, 0)
})
test('falhas temporárias usam stale com idade máxima e sem renovar a consulta original', async () => {
  const a = ambiente(), salvo = await a.servico.listar()
  a.avancar(120001); a.modo('rede')
  const antigo = await a.servico.listar()
  assert.equal(antigo.desatualizado, true); assert.equal(antigo.consultadoEm, salvo.consultadoEm)
  a.avancar(1800000); await assert.rejects(a.servico.listar())
  for (const modo of [500, 'timeout']) {
    const b = ambiente(); await b.servico.historico('bitcoin'); b.avancar(1800001); b.modo(modo)
    assert.equal((await b.servico.historico('bitcoin')).desatualizado, true)
    b.avancar(21600000); await assert.rejects(b.servico.historico('bitcoin'))
  }
})
test('401/403 e resposta inválida não reutilizam cache expirado; rotação de chave isola cache', async () => {
  for (const modo of [401, 403, 'invalido']) {
    const a = ambiente(); await a.servico.listar(); a.avancar(120001); a.modo(modo)
    await assert.rejects(a.servico.listar())
  }
  const a = ambiente(); await a.servico.listar(); a.chave('nova-chave'); await a.servico.listar(); assert.equal(a.chamadas.length, 2)
  a.chave(''); await assert.rejects(a.servico.listar(), { codigo: 'CONFIGURACAO' })
})
test('429 bloqueia endpoints diferentes, preserva cache válido e libera após Retry-After', async () => {
  const a = ambiente(); await a.servico.listar(); a.avancar(120001); a.modo(429)
  assert.equal((await a.servico.listar()).desatualizado, true)
  await assert.rejects(a.servico.historico('bitcoin'), { status: 429, retryAfter: 60 })
  assert.equal(a.chamadas.length, 2)
  a.avancar(60001); a.modo('ok'); await a.servico.historico('bitcoin'); assert.equal(a.chamadas.length, 3)
})
test('ausência legítima de dados mantém lista e histórico vazios', async () => {
  const a = ambiente(); a.modo('vazio')
  assert.deepEqual((await a.servico.listar()).itens, [])
  const r = await a.servico.historico('bitcoin'); assert.deepEqual(r.pontos, []); assert.equal(r.ultimaAmostraEm, null)
})
test('controle conservador espaça chamadas externas sem afetar cache', async () => {
  let tempo = 0; const momentos = []
  const s = criarServicoCoingecko({ obterChave: () => 'fixture', agora: () => tempo, esperar: async ms => { tempo += ms },
    requisitar: async () => { momentos.push(tempo); return Response.json([moeda]) } })
  await Promise.all([s.listar({ pagina: '1' }), s.listar({ pagina: '2' })])
  assert.deepEqual(momentos, [0, 2100])
  await s.listar({ pagina: '1' }); assert.equal(momentos.length, 2)
})
test('rotas HTTP retornam contratos e erros seguros sem credenciais', async () => {
  const a = ambiente(), app = express(); app.use('/cripto', criarRouterCripto({ servico: a.servico }))
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}/cripto`
  try {
    const r = await fetch(`${base}/moedas`); assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'no-store')
    assert.doesNotMatch(await r.text(), /credencial/)
    assert.equal((await fetch(`${base}/moedas/bitcoin/historico?dias=365`)).status, 400)
    a.avancar(120001); a.modo(401)
    const falha = await fetch(`${base}/moedas`); assert.equal(falha.status, 503); assert.doesNotMatch(await falha.text(), /credencial/)
    a.modo(429)
    const limite = await fetch(`${base}/moedas/bitcoin/historico?dias=7`)
    assert.equal(limite.status, 429); assert.equal(limite.headers.get('retry-after'), '60')
  } finally { server.closeAllConnections(); await new Promise(r => server.close(r)) }
})
