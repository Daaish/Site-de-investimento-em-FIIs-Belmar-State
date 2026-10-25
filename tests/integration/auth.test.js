const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const http = require('node:http')
const { once } = require('node:events')
const express = require('express')
const session = require('express-session')
const { carregarAmbienteBanco, configuracaoBanco, criarPool } = require('../../database/conexao')
const { executarMigracoes } = require('../../database/migrar')
const { criarRouterAuth } = require('../../routes/auth')
const { criarServicoAutenticacao } = require('../../services/autenticacao')

function request(port, method, path, body, cookie, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers } }, res => {
      let text = ''
      res.on('data', data => { text += data })
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text, body: text ? JSON.parse(text) : null,
        cookie: res.headers['set-cookie']?.[0]?.split(';')[0] }))
    })
    req.on('error', reject)
    if (body !== undefined) req.write(typeof body === 'string' ? body : JSON.stringify(body))
    req.end()
  })
}

test('autenticação PostgreSQL isolada: cadastro, sessão, login, logout, transação e isolamento', async t => {
  carregarAmbienteBanco()
  const config = configuracaoBanco()
  const admin = criarPool(config)
  const database = `belmar_auth_test_${randomUUID().replaceAll('-', '')}`
  let pool, server, created = false
  const store = new session.MemoryStore()
  try {
    await admin.query(`CREATE DATABASE "${database}"`)
    created = true
    pool = criarPool({ ...config, database })
    await executarMigracoes(pool)
    const app = express()
    app.use('/auth', criarRouterAuth({ obterPool: () => pool, store }))
    server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const port = server.address().port
    const req = (...args) => request(port, ...args)
    const senha = 'Senha-fixture-123'
    let usuarioA, usuarioB, cookieA, cookieB
    await t.test('cadastro cria uma carteira e não autentica automaticamente nem retorna hash', async () => {
      const result = await req('POST', '/auth/cadastro', { nome: 'Usuário A', email: ' A@EXAMPLE.COM ', senha })
      assert.equal(result.status, 201)
      usuarioA = result.body.usuario
      assert.equal(usuarioA.email, 'a@example.com')
      assert.equal(result.cookie, undefined)
      assert.ok(!result.text.includes('senha_hash') && !result.text.includes(senha))
      const rows = (await pool.query('SELECT u.senha_hash, c.usuario_id FROM belmar.usuarios u JOIN belmar.carteiras c ON c.usuario_id = u.id WHERE u.id = $1', [usuarioA.id])).rows
      assert.equal(rows.length, 1)
      assert.ok(rows[0].senha_hash.startsWith('scrypt$'))
      assert.notEqual(rows[0].senha_hash, senha)
    })
    await t.test('duplicados e cadastro inválido não deixam carteiras/usuários adicionais', async () => {
      assert.equal((await req('POST', '/auth/cadastro', { nome: 'Duplicado', email: 'A@example.com', senha })).status, 409)
      assert.equal((await req('POST', '/auth/cadastro', { nome: '', email: 'invalid', senha })).status, 400)
      assert.equal((await pool.query('SELECT * FROM belmar.usuarios')).rowCount, 1)
      assert.equal((await pool.query('SELECT * FROM belmar.carteiras')).rowCount, 1)
    })
    await t.test('falha na criação da carteira desfaz a inserção do usuário', async () => {
      const service = criarServicoAutenticacao(() => ({ connect: async () => {
        const client = await pool.connect()
        return { query: (sql, args) => {
          if (sql.startsWith('INSERT INTO belmar.carteiras')) throw Error('falha simulada')
          return client.query(sql, args)
        }, release: () => client.release() }
      } }))
      await assert.rejects(service.cadastrar({ nome: 'Rollback', email: 'rollback@example.com', senha }))
      assert.equal((await pool.query('SELECT * FROM belmar.usuarios WHERE email = $1', ['rollback@example.com'])).rowCount, 0)
    })
    await t.test('login inválido é genérico para e-mail inexistente e senha incorreta', async () => {
      const desconhecido = await req('POST', '/auth/login', { email: 'naoexiste@example.com', senha })
      const incorreto = await req('POST', '/auth/login', { email: 'a@example.com', senha: 'Senha-errada-123' })
      assert.equal(desconhecido.status, 401)
      assert.deepEqual(desconhecido.body, incorreto.body)
      assert.ok(!desconhecido.text.includes('scrypt') && !incorreto.text.includes('senha_hash'))
      assert.equal((await req('GET', '/auth/me')).status, 401)
    })
    await t.test('login emite HttpOnly/SameSite=Lax, persiste sessão e renova o identificador', async () => {
      const login = await req('POST', '/auth/login', { email: 'A@EXAMPLE.COM', senha })
      assert.equal(login.status, 200)
      cookieA = login.cookie
      assert.match(login.headers['set-cookie'][0], /HttpOnly/)
      assert.match(login.headers['set-cookie'][0], /SameSite=Lax/)
      assert.equal((await req('GET', '/auth/me', undefined, cookieA)).body.usuario.id, usuarioA.id)
      const again = await req('POST', '/auth/login', { email: 'a@example.com', senha }, cookieA)
      assert.notEqual(again.cookie, cookieA)
      assert.equal((await req('GET', '/auth/me', undefined, cookieA)).status, 401)
      cookieA = again.cookie
      assert.equal((await req('GET', '/auth/me', undefined, cookieA)).headers['cache-control'], 'no-store')
    })
    await t.test('contas isoladas: parâmetros e IDs enviados pelo cliente não mudam o proprietário', async () => {
      usuarioB = (await req('POST', '/auth/cadastro', { nome: 'Usuário B', email: 'b@example.com', senha, usuarioId: usuarioA.id })).body.usuario
      cookieB = (await req('POST', '/auth/login', { email: 'b@example.com', senha, usuarioId: usuarioA.id })).cookie
      const a = await req('GET', `/auth/me?usuarioId=${usuarioB.id}`, undefined, cookieA)
      const b = await req('GET', `/auth/me?usuarioId=${usuarioA.id}`, undefined, cookieB)
      assert.equal(a.body.usuario.id, usuarioA.id)
      assert.equal(b.body.usuario.id, usuarioB.id)
      assert.notEqual(a.body.carteira.id, b.body.carteira.id)
      assert.ok(!a.text.includes(usuarioB.id))
      assert.equal((await req('GET', '/auth/me', undefined, cookieA + 'alterado')).status, 401)
      const carteira = (await pool.query('SELECT id FROM belmar.carteiras WHERE usuario_id = $1', [usuarioA.id])).rows[0].id
      await pool.query('INSERT INTO belmar.operacoes (id, carteira_id, tipo, ticker, quantidade, preco, data, ordem) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [randomUUID(), carteira, 'compra', 'VGHF11', 1, '10.123456789', '2026-01-01', 0])
      assert.equal((await pool.query('SELECT o.id FROM belmar.operacoes o JOIN belmar.carteiras c ON c.id=o.carteira_id WHERE c.usuario_id=$1', [usuarioB.id])).rowCount, 0)
      await assert.rejects(pool.query('INSERT INTO belmar.operacoes (id, carteira_id, tipo, ticker, quantidade, preco, data, ordem) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [randomUUID(), randomUUID(), 'compra', 'VGHF11', 1, 10, '2026-01-01', 0]), { code: '23503' })
    })
    await t.test('origem externa, JSON inválido e corpo excessivo são rejeitados', async () => {
      assert.equal((await req('POST', '/auth/login', { email: 'a@example.com', senha }, undefined, { Origin: 'https://externo.example' })).status, 403)
      assert.equal((await req('POST', '/auth/login', '{invalid')).status, 400)
      assert.equal((await req('POST', '/auth/login', { email: 'a@example.com', senha: 'x'.repeat(10000) })).status, 413)
    })
    await t.test('logout invalida sessão no servidor e mantém a outra conta conectada', async () => {
      const result = await req('POST', '/auth/logout', {}, cookieA)
      assert.equal(result.status, 204)
      assert.match(result.headers['set-cookie'][0], /Expires=Thu, 01 Jan 1970/)
      assert.equal((await req('GET', '/auth/me', undefined, cookieA)).status, 401)
      assert.equal((await req('GET', '/auth/me', undefined, cookieB)).body.usuario.id, usuarioB.id)
      assert.equal((await req('POST', '/auth/logout', {})).status, 204)
    })
    await t.test('sessão expirada no servidor retorna 401', async () => {
      const sessoes = await new Promise((resolve, reject) => store.all((erro, dados) => erro ? reject(erro) : resolve(dados)))
      const [sid, dados] = Object.entries(sessoes).find(([, dados]) => dados.usuarioId === usuarioB.id)
      dados.cookie.expires = new Date(Date.now() - 1000).toISOString()
      await new Promise((resolve, reject) => store.set(sid, dados, erro => erro ? reject(erro) : resolve()))
      assert.equal((await req('GET', '/auth/me', undefined, cookieB)).status, 401)
    })
  } finally {
    if (server) await new Promise(resolve => server.close(resolve))
    if (pool) await pool.end()
    try { if (created) await admin.query(`DROP DATABASE "${database}"`) }
    finally { await admin.end() }
  }
})
