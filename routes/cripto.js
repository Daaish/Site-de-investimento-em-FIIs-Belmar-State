const express = require('express')
const { criarServicoCoingecko } = require('../services/coingecko')
function criarRouterCripto({ servico = criarServicoCoingecko() } = {}) {
  const router = express.Router()
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
  router.get('/moedas', async (req, res, next) => {
    try { res.json(await servico.listar(req.query)) } catch (e) { next(e) }
  })
  router.get('/moedas/:id/historico', async (req, res, next) => {
    try { res.json(await servico.historico(req.params.id, req.query.dias)) } catch (e) { next(e) }
  })
  router.use((e, req, res, next) => {
    if (res.headersSent) return next(e)
    if (Number.isFinite(e.retryAfter)) res.set('Retry-After', String(e.retryAfter))
    const mensagens = { PARAMETROS: 'Moeda, página ou período inválido.', CONFIGURACAO: 'O serviço de criptoativos precisa de configuração no backend.',
      ACESSO: 'O acesso à CoinGecko está indisponível.', NAO_ENCONTRADO: 'Moeda ou histórico não encontrado.',
      LIMITE: 'Limite temporário da CoinGecko. Aguarde antes de tentar novamente.', CAPACIDADE: 'Muitas consultas em andamento. Tente novamente em instantes.' }
    res.status(e.status || 503).json({ erro: mensagens[e.codigo] || 'Não foi possível consultar a CoinGecko. Tente novamente.', codigo: e.codigo || 'INDISPONIVEL' })
  })
  return router
}
module.exports = { criarRouterCripto }
