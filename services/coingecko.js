const { criarCacheMercado } = require('./cacheMercado')
const ID = /^[a-z0-9][a-z0-9_-]{0,119}$/
const erro = (codigo, status = 502, temporario = false, retryAfter) => Object.assign(new Error(codigo), { codigo, status, temporario, retryAfter })
const numero = valor => typeof valor === 'number' && Number.isFinite(valor) ? valor : null
const dataISO = valor => typeof valor === 'string' && Number.isFinite(Date.parse(valor)) ? new Date(valor).toISOString() : null
function criarServicoCoingecko({ requisitar = (...args) => fetch(...args), obterChave = () => process.env.COINGECKO_API_KEY,
  agora = Date.now, esperar = ms => new Promise(resolve => setTimeout(resolve, ms)), intervalo = 2100 } = {}) {
  let credencial, cache, fila = Promise.resolve(), quantidade = 0, proxima = 0, bloqueadoAte = 0
  function contexto() {
    const chave = obterChave()?.trim()
    if (!chave) throw erro('CONFIGURACAO', 503)
    if (chave !== credencial) {
      credencial = chave
      cache = criarCacheMercado({ maxEntradas: 200, maxPendentes: 16, agora })
      proxima = 0; bloqueadoAte = 0
    }
    return { chave, cache }
  }
  function consultar(path, params, ttl, idadeMaxima) {
    const ctx = contexto()
    const query = new URLSearchParams(params)
    return ctx.cache.consultar(`${path}?${query}`, { ttl, idadeMaxima, carregar: async () => {
      if (quantidade >= 5) throw erro('CAPACIDADE', 503, true)
      quantidade++
      const executar = async () => {
        if (credencial !== ctx.chave) throw erro('CONFIGURACAO', 503)
        if (agora() < bloqueadoAte) throw erro('LIMITE', 429, true, Math.ceil((bloqueadoAte - agora()) / 1000))
        if (proxima > agora()) await esperar(proxima - agora())
        if (agora() < bloqueadoAte) throw erro('LIMITE', 429, true, Math.ceil((bloqueadoAte - agora()) / 1000))
        proxima = agora() + intervalo
        let resposta
        try {
          resposta = await requisitar(`https://api.coingecko.com/api/v3/${path}?${query}`, {
            headers: { 'x-cg-demo-api-key': ctx.chave, Accept: 'application/json' }, signal: AbortSignal.timeout(10000),
          })
        } catch { throw erro('REDE', 503, true) }
        if (!resposta.ok) {
          if (resposta.status === 429) {
            const valor = resposta.headers.get('retry-after')
            const espera = valor && /^\d+(\.\d+)?$/.test(valor) ? Number(valor) * 1000 : Date.parse(valor) - agora()
            bloqueadoAte = agora() + (Number.isFinite(espera) ? Math.max(1000, espera) : 60000)
          }
          try { await resposta.body?.cancel() } catch { /* Libera a conexão sem registrar o corpo. */ }
          if (resposta.status === 429) throw erro('LIMITE', 429, true, Math.ceil((bloqueadoAte - agora()) / 1000))
          if ([401, 403].includes(resposta.status)) throw erro('ACESSO', 503)
          if (resposta.status === 404) throw erro('NAO_ENCONTRADO', 404)
          throw erro('FONTE', 502, resposta.status >= 500)
        }
        let dados
        try { dados = await resposta.json() } catch (e) { throw erro('RESPOSTA_INVALIDA', 502, ['AbortError', 'TimeoutError'].includes(e?.name)) }
        if (path === 'coins/markets') {
          if (!Array.isArray(dados) || dados.some(c => !c || typeof c.id !== 'string' || !ID.test(c.id) || typeof c.name !== 'string' || typeof c.symbol !== 'string')) throw erro('RESPOSTA_INVALIDA')
          dados = { itens: dados.map(c => ({ id: c.id, nome: c.name, simbolo: c.symbol.toUpperCase(), preco: numero(c.current_price),
            variacao24h: numero(c.price_change_percentage_24h), volume: numero(c.total_volume), capitalizacao: numero(c.market_cap),
            atualizadoEm: dataISO(c.last_updated) })) }
        } else if (path === 'search') {
          if (!Array.isArray(dados?.coins) || dados.coins.some(c => !c || typeof c.id !== 'string' || !ID.test(c.id))) throw erro('RESPOSTA_INVALIDA')
          dados = { ids: dados.coins.slice(0, 20).map(c => c.id), total: dados.coins.length }
        } else {
          if (!Array.isArray(dados?.prices)) throw erro('RESPOSTA_INVALIDA')
          const pontos = dados.prices.filter(p => Array.isArray(p) && numero(p[0]) !== null && p[0] > 0 && p[0] <= 8640000000000000 && numero(p[1]) !== null && p[1] >= 0)
            .map(([tempo, preco]) => ({ tempo, preco })).sort((a, b) => a.tempo - b.tempo)
          if (dados.prices.length && !pontos.length) throw erro('RESPOSTA_INVALIDA')
          dados = { pontos, ultimaAmostraEm: pontos.length ? new Date(pontos.at(-1).tempo).toISOString() : null }
        }
        const consultadoEm = agora()
        return { ...dados, moeda: 'BRL', origem: 'CoinGecko', consultadoEm: new Date(consultadoEm).toISOString(),
          expiraEm: new Date(consultadoEm + ttl).toISOString(), validoAte: new Date(consultadoEm + idadeMaxima).toISOString() }
      }
      const trabalho = fila.then(executar)
      fila = trabalho.catch(() => {})
      try { return await trabalho } finally { quantidade-- }
    } })
  }
  return {
    async listar({ pagina = '1', pesquisa = '' } = {}) {
      if (typeof pagina !== 'string' || !/^[1-9]\d{0,2}$/.test(pagina) || typeof pesquisa !== 'string' || pesquisa.trim().length > 80) throw erro('PARAMETROS', 400)
      const termo = pesquisa.trim().toLowerCase()
      let busca
      if (termo) {
        busca = await consultar('search', { query: termo }, 900000, 900000)
        if (!busca.ids.length) return { itens: [], moeda: 'BRL', origem: 'CoinGecko', consultadoEm: busca.consultadoEm, expiraEm: busca.expiraEm, validoAte: busca.validoAte, desatualizado: false, pagina: 1, temMais: false, totalPesquisa: 0 }
      }
      const resultado = await consultar('coins/markets', { vs_currency: 'brl', order: 'market_cap_desc', per_page: '20', page: busca ? '1' : pagina,
        sparkline: 'false', precision: 'full', ...(busca ? { ids: busca.ids.join(',') } : {}) }, 120000, 1800000)
      return { ...resultado, pagina: busca ? 1 : Number(pagina), temMais: !busca && resultado.itens.length === 20, totalPesquisa: busca?.total ?? null }
    },
    historico(id, dias = '7') {
      if (typeof id !== 'string' || !ID.test(id) || !['7', '30', '90'].includes(dias)) throw erro('PARAMETROS', 400)
      return consultar(`coins/${encodeURIComponent(id)}/market_chart`, { vs_currency: 'brl', days: dias, precision: 'full' }, 1800000, 21600000)
        .then(dados => ({ ...dados, id, dias: Number(dias) }))
    },
  }
}
module.exports = { criarServicoCoingecko }
