const express = require('express')
const { carregarAmbienteBanco, configuracaoBanco, criarPool } = require('../database/conexao')
const { criarServicoCarteira } = require('../services/carteira')
function criarRouterCarteira({ obterPool } = {}) {
  let pool
  const servico = criarServicoCarteira(obterPool || (() => {
    if (!pool) { carregarAmbienteBanco(); pool = criarPool(configuracaoBanco()) }
    return pool
  }))
  const router = express.Router()
  router.use((req, res, next) => req.session?.usuarioId ? next() : res.status(401).json({ erro: 'Sessão não autenticada.' }))
  router.get('/operacoes', async (req, res, next) => {
    try { res.json({ operacoes: await servico.listar(req.session.usuarioId) }) } catch (e) { next(e) }
  })
  router.post('/operacoes', async (req, res, next) => {
    try {
      const resultado = await servico.adicionar(req.session.usuarioId, req.body, req.get('Idempotency-Key'))
      res.status(resultado.repetida ? 200 : 201).json(resultado)
    } catch (e) { next(e) }
  })
  router.delete('/operacoes/:id', async (req, res, next) => {
    try { res.json({ operacoes: await servico.remover(req.session.usuarioId, req.params.id) }) } catch (e) { next(e) }
  })
  router.use((erro, req, res, next) => {
    if (res.headersSent) return next(erro)
    res.status(erro.status || 503).json({ erro: erro.status ? erro.message : 'Carteira temporariamente indisponível. Tente novamente.' })
  })
  return router
}
module.exports = { criarRouterCarteira }
