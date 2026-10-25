const express = require('express');
const cors = require('cors');
const { buscarFiis, consultarCatalogo } = require('./services/fiis')

require('dotenv').config()

const { buscarCotacao, buscarHistorico } = require('./services/cotacoes')

const app = express();
app.use('/auth', require('./routes/auth').criarRouterAuth());
app.use(cors());

// Catálogo local: não depende da disponibilidade da API de mercado.
app.get('/buscar', (req, res) => {
  try {
    return res.json(buscarFiis(req.query))
  } catch (erro) {
    return res.status(400).json({ erro: erro.message })
  }
});

app.get('/fiis', async (req, res) => {
  try { return res.json(await consultarCatalogo(req.query)) }
  catch { return res.status(400).json({ erro: 'Parâmetros de catálogo inválidos' }) }
});

// Inicia servidor local
const PORT = 3000;


function responderErro(res, erro, historico) {
  if (erro.codigo === 'TICKER_INVALIDO' || erro.codigo === 'PARAMETROS_INVALIDOS') {
    return res.status(400).json({ erro: 'Ticker inválido' })
  }
  if (historico && erro.codigo === 'TOKEN_AUSENTE') {
    return res.status(500).json({ erro: 'Token não configurado' })
  }
  if (historico && erro.codigo === 'HISTORICO_INDISPONIVEL') {
    return res.status(404).json({ erro: 'Histórico não disponível' })
  }
  if (Number.isFinite(erro.retryAfter)) res.set('Retry-After', String(erro.retryAfter))
  // Preserve existing upstream-error response codes and never log raw external errors.
  const corpo = { erro: historico ? 'Erro na consulta histórica' : 'Não foi possível obter a cotação' }
  if (Number.isInteger(erro.statusFonte)) corpo.status = erro.statusFonte
  return res.status(erro.codigo === 'CAPACIDADE' ? 503 : 502).json(corpo)
}

app.get('/cotacao/:ticker', async (req, res) => {
  try { return res.json(await buscarCotacao(req.params.ticker)) }
  catch (erro) { return responderErro(res, erro, false) }
})

app.get('/historico/:ticker', async (req, res) => {
  try { return res.json(await buscarHistorico(req.params.ticker)) }
  catch (erro) { return responderErro(res, erro, true) }
})

if (require.main === module) {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`)
  })
}

module.exports = app
