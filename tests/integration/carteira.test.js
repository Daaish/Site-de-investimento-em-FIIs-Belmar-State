const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const express = require('express')
const { once } = require('node:events')
const { carregarAmbienteBanco, configuracaoBanco, criarPool } = require('../../database/conexao')
const { executarMigracoes } = require('../../database/migrar')
const { criarMiddlewarePrivado } = require('../../middleware/privado')
const { criarRouterAuth } = require('../../routes/auth')
const { criarRouterCarteira } = require('../../routes/carteira')

test('carteira PostgreSQL: HTTP autenticado, persistência, concorrência, idempotência, exclusão e isolamento', async () => {
  carregarAmbienteBanco()
  const config = configuracaoBanco(), admin = criarPool(config)
  const database = `belmar_carteira_test_${randomUUID().replaceAll('-', '')}`
  let pool, server, criada = false
  try {
    await admin.query(`CREATE DATABASE "${database}"`); criada = true
    pool = criarPool({ ...config, database })
    await executarMigracoes(pool)
    const app = express()
    app.use(['/auth', '/carteira'], criarMiddlewarePrivado())
    app.use('/auth', criarRouterAuth({ obterPool: () => pool, sessaoCompartilhada: true }))
    app.use('/carteira', criarRouterCarteira({ obterPool: () => pool }))
    server = app.listen(0, '127.0.0.1'); await once(server, 'listening')
    const base = `http://127.0.0.1:${server.address().port}`
    const req = (path, method = 'GET', body, cookie, chave) => fetch(base + path, { method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(chave ? { 'Idempotency-Key': chave } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    async function conta(email) {
      const body = { nome: 'Teste Carteira', email, senha: 'TesteSenha123!' }
      assert.equal((await req('/auth/cadastro', 'POST', body)).status, 201)
      const login = await req('/auth/login', 'POST', body)
      return login.headers.get('set-cookie').split(';')[0]
    }
    const a = await conta('a@example.com'), b = await conta('b@example.com')
    const path = '/carteira/operacoes'
    const compra = { tipo: 'compra', ticker: 'VGHF11', quantidade: 10, preco: 12.34, data: '2026-01-10', usuario_id: randomUUID(), carteira_id: randomUUID() }
    assert.equal((await req(path)).status, 401)
    assert.equal((await req(path, 'POST', { ...compra, data: '2026-02-30' }, a, randomUUID())).status, 400)
    const chave = randomUUID()
    const repetidas = await Promise.all([req(path, 'POST', compra, a, chave), req(path, 'POST', compra, a, chave)])
    assert.deepEqual(repetidas.map(r => r.status).sort(), [200, 201])
    const primeira = (await repetidas[0].json()).operacao
    assert.equal((await pool.query('SELECT * FROM belmar.operacoes')).rowCount, 1)
    assert.equal((await req(path, 'POST', { ...compra, preco: 99 }, a, chave)).status, 409)
    const vendas = await Promise.all([1, 2].map(() => req(path, 'POST', { ...compra, tipo: 'venda', quantidade: 7 }, a, randomUUID())))
    assert.deepEqual(vendas.map(r => r.status).sort(), [201, 409])
    let ops = (await (await req(path, 'GET', null, a)).json()).operacoes
    assert.equal(ops.length, 2)
    assert.deepEqual(ops.map(op => op.ordem), [0, 1])
    assert.equal(ops[0].preco, 12.34)
    assert.equal(ops[0].data, '2026-01-10')
    assert.deepEqual((await (await req(path, 'GET', null, b)).json()).operacoes, [])
    assert.equal((await req(`${path}/${primeira.id}`, 'DELETE', null, b)).status, 404)
    assert.equal((await req(`${path}/${primeira.id}`, 'DELETE', null, a)).status, 409)
    // F5: uma nova leitura HTTP retorna o mesmo histórico.
    assert.deepEqual((await (await req(path, 'GET', null, a)).json()).operacoes, ops)
    await req('/auth/logout', 'POST', {}, a)
    assert.equal((await req(path, 'GET', null, a)).status, 401)
    const login = await req('/auth/login', 'POST', { email: 'a@example.com', senha: 'TesteSenha123!' })
    const novo = login.headers.get('set-cookie').split(';')[0]
    assert.deepEqual((await (await req(path, 'GET', null, novo)).json()).operacoes, ops)
    assert.equal((await req(`${path}/${ops[1].id}`, 'DELETE', null, novo)).status, 200)
    assert.equal((await req(`${path}/${primeira.id}`, 'DELETE', null, novo)).status, 200)
    // Uma resposta perdida e repetida depois da exclusão não recria a compra.
    assert.equal((await req(path, 'POST', compra, novo, chave)).status, 200)
    assert.equal((await pool.query('SELECT * FROM belmar.operacoes')).rowCount, 0)
    assert.equal((await req(path, 'POST', compra, novo, randomUUID())).status, 201)
  } finally {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
    if (pool) await pool.end()
    if (criada) await admin.query(`DROP DATABASE "${database}"`)
    await admin.end()
  }
})
