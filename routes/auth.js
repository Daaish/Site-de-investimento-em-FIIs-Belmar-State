const express = require('express')
const session = require('express-session')
const { randomBytes } = require('node:crypto')
const { criarServicoAutenticacao } = require('../services/autenticacao')
const { carregarAmbienteBanco, configuracaoBanco, criarPool } = require('../database/conexao')

function criarRouterAuth({ obterPool, secret = process.env.SESSION_SECRET || randomBytes(32).toString('hex'), store } = {}) {
  let pool
  const getPool = obterPool || (() => {
    if (!pool) { carregarAmbienteBanco(); pool = criarPool(configuracaoBanco()) }
    return pool
  })
  const servico = criarServicoAutenticacao(getPool)
  const router = express.Router()
  const cookie = { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 60 * 60_000, path: '/' }
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    // Private routes deliberately do not use the public market CORS middleware.
    const permitidas = new Set(['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'])
    if ((req.headers.origin && !permitidas.has(req.headers.origin)) || req.headers['sec-fetch-site'] === 'cross-site') {
      return res.status(403).json({ erro: 'Origem não permitida.' })
    }
    next()
  })
  router.use(express.json({ limit: '8kb' }))
  router.use(session({ name: 'belmar.sid', secret, store, resave: false, saveUninitialized: false, cookie }))
  const callback = (objeto, metodo) => new Promise((resolve, reject) => objeto[metodo](erro => erro ? reject(erro) : resolve()))
  const falhar = (res, erro) => {
    if (erro.code === 'DADOS_INVALIDOS') return res.status(400).json({ erro: 'Informe nome válido, e-mail válido e senha de 8 a 128 caracteres.' })
    if (erro.code === 'EMAIL_DUPLICADO') return res.status(409).json({ erro: 'Não foi possível cadastrar esse e-mail.' })
    if (erro.code === 'LOGIN_INVALIDO') return res.status(401).json({ erro: 'E-mail ou senha inválidos.' })
    return res.status(503).json({ erro: 'Serviço de autenticação temporariamente indisponível.' })
  }
  router.post('/cadastro', async (req, res) => {
    try { return res.status(201).json(await servico.cadastrar(req.body)) }
    catch (erro) { return falhar(res, erro) }
  })
  router.post('/login', async (req, res) => {
    try {
      const usuario = await servico.login(req.body)
      await callback(req.session, 'regenerate')
      req.session.usuarioId = usuario.id
      await callback(req.session, 'save')
      return res.json({ usuario })
    } catch (erro) { return falhar(res, erro) }
  })
  router.get('/me', async (req, res) => {
    try {
      if (!req.session.usuarioId) return res.status(401).json({ erro: 'Sessão não autenticada.' })
      const dados = await servico.consultarSessao(req.session.usuarioId)
      if (!dados) {
        await callback(req.session, 'destroy')
        res.clearCookie('belmar.sid', { path: '/', httpOnly: true, sameSite: 'lax', secure: false })
        return res.status(401).json({ erro: 'Sessão não autenticada.' })
      }
      return res.json(dados)
    } catch (erro) { return falhar(res, erro) }
  })
  router.post('/logout', async (req, res) => {
    try {
      await callback(req.session, 'destroy')
      res.clearCookie('belmar.sid', { path: '/', httpOnly: true, sameSite: 'lax', secure: false })
      return res.sendStatus(204)
    } catch (erro) { return falhar(res, erro) }
  })
  router.use((erro, req, res, next) => {
    if (res.headersSent) return next(erro)
    if (erro.type === 'entity.too.large') return res.status(413).json({ erro: 'Requisição muito grande.' })
    if (erro.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido.' })
    return falhar(res, erro)
  })
  return router
}
module.exports = { criarRouterAuth }
