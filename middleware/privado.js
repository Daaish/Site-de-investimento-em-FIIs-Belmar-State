const express = require('express')
const session = require('express-session')
const { randomBytes } = require('node:crypto')

function criarMiddlewarePrivado({ secret = process.env.SESSION_SECRET || randomBytes(32).toString('hex'), store } = {}) {
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
  router.use((erro, req, res, next) => {
    if (erro.type === 'entity.too.large') return res.status(413).json({ erro: 'Requisição muito grande.' })
    if (erro.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido.' })
    next(erro)
  })
  return router
}
module.exports = { criarMiddlewarePrivado }
