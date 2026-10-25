const { createHash } = require('node:crypto')
const { criarCacheMercado } = require('./cacheMercado')
const { criarClienteBrapi, ErroMercado } = require('./brapi')

function normalizarTicker(ticker) {
  if (typeof ticker !== 'string') throw new ErroMercado('TICKER_INVALIDO')
  const codigo = ticker.trim().toUpperCase()
  if (!/^[A-Z0-9]{5,12}$/.test(codigo)) throw new ErroMercado('TICKER_INVALIDO')
  return codigo
}
const numeroValido = valor =>
  (typeof valor === 'number' || (typeof valor === 'string' && valor.trim() !== '')) &&
  Number.isFinite(Number(valor))

function criarServicoMercado({
  cache = criarCacheMercado(), cliente = criarClienteBrapi(),
  obterToken = () => process.env.BRAPI_TOKEN,
} = {}) {
  function contexto(ticker) {
    const codigo = normalizarTicker(ticker)
    const token = obterToken()
    if (typeof token !== 'string' || !token.trim()) throw new ErroMercado('TOKEN_AUSENTE')
    // Keep caches isolated when credentials change, without storing raw tokens as keys.
    const escopo = createHash('sha256').update(token).digest('hex')
    return { codigo, token, escopo }
  }
  function ativoValido(json, codigo) {
    const resultados = json?.results
    if (!Array.isArray(resultados)) throw new ErroMercado('RESPOSTA_INVALIDA')
    const encontrados = resultados.filter(item => item?.symbol === codigo)
    if (encontrados.length !== 1) throw new ErroMercado('RESPOSTA_INVALIDA')
    return encontrados[0]
  }
  function buscarCotacao(ticker) {
    const { codigo, token, escopo } = contexto(ticker)
    return cache.consultar(JSON.stringify(['cotacao', escopo, codigo]), {
      ttl: 15 * 60_000, idadeMaxima: 24 * 60 * 60_000,
      carregar: async () => {
        const url = new URL(`https://brapi.dev/api/quote/${encodeURIComponent(codigo)}`)
        const resultado = ativoValido(await cliente.consultar(url, token, 10_000), codigo)
        if (!numeroValido(resultado.regularMarketPrice) || Number(resultado.regularMarketPrice) <= 0) {
          throw new ErroMercado('RESPOSTA_INVALIDA')
        }
        return {
          ticker: resultado.symbol,
          nome: resultado.longName || resultado.shortName || codigo,
          preco: Number(resultado.regularMarketPrice),
          variacaoDia: Number.isFinite(Number(resultado.regularMarketChangePercent))
            ? Number(resultado.regularMarketChangePercent) : null,
          atualizadoEm: resultado.regularMarketTime || null,
          fonte: 'brapi.dev',
        }
      },
    })
  }
  function buscarHistorico(ticker, { periodo = '3mo', intervalo = '1d' } = {}) {
    const { codigo, token, escopo } = contexto(ticker)
    // Public routes retain their existing period/interval. Validate service-level parameters.
    if (!['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max'].includes(periodo) ||
        !['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo'].includes(intervalo)) {
      throw new ErroMercado('PARAMETROS_INVALIDOS')
    }
    return cache.consultar(JSON.stringify(['historico', escopo, codigo, periodo, intervalo]), {
      ttl: 6 * 60 * 60_000, idadeMaxima: 7 * 24 * 60 * 60_000,
      carregar: async () => {
        const url = new URL(`https://brapi.dev/api/quote/${encodeURIComponent(codigo)}`)
        url.searchParams.set('range', periodo)
        url.searchParams.set('interval', intervalo)
        const ativo = ativoValido(await cliente.consultar(url, token, 15_000), codigo)
        const historico = ativo.historicalDataPrice
        if (!Array.isArray(historico)) throw new ErroMercado('RESPOSTA_INVALIDA')
        if (!historico.length) throw new ErroMercado('HISTORICO_INDISPONIVEL')
        const precos = historico.map(item => {
          if (!item || !numeroValido(item.date) || !numeroValido(item.close) || Number(item.close) <= 0) {
            throw new ErroMercado('RESPOSTA_INVALIDA')
          }
          const data = new Date(Number(item.date) * 1000)
          if (!Number.isFinite(data.getTime())) throw new ErroMercado('RESPOSTA_INVALIDA')
          const dataISO = data.toISOString().slice(0, 10)
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) throw new ErroMercado('RESPOSTA_INVALIDA')
          return { data: dataISO, fechamento: Number(item.close) }
        }).sort((a, b) => a.data.localeCompare(b.data))
        return {
          ticker: codigo, fonte: 'brapi.dev', total: precos.length,
          inicio: precos[0].data, fim: precos.at(-1).data, precos,
        }
      },
    })
  }
  return { buscarCotacao, buscarHistorico }
}

module.exports = { ...criarServicoMercado(), criarServicoMercado, normalizarTicker }
