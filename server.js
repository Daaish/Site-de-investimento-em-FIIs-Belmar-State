const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('node:path');

require('dotenv').config()

const { buscarCotacao, buscarHistorico } = require('./services/cotacoes')

const app = express();
app.use(cors());

// Lê os dados do arquivo JSON
const dados = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'a0cd551e-ae8e-4657-b557-3a64020a14de.json'), 'utf8')
);

// Rota de busca com filtros
app.get('/buscar', (req, res) => {
  let { tipo, min_dy } = req.query;
  let filtrados = dados;

  if (tipo) {
    filtrados = filtrados.filter(fii =>
      fii.tipo.toLowerCase().includes(tipo.toLowerCase())
    );
  }

  if (min_dy) {
    filtrados = filtrados.filter(fii =>
      fii.dy >= parseFloat(min_dy)
    );
  }

  res.json(filtrados);
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
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`)
  })
}

module.exports = app
