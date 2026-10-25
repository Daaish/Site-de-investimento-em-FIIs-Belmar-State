// Successful values and in-flight work share one bounded, reusable cache.
function criarCacheMercado({ maxEntradas = 500, maxPendentes = 64, agora = Date.now } = {}) {
  if (!Number.isInteger(maxEntradas) || maxEntradas < 1 || !Number.isInteger(maxPendentes) || maxPendentes < 1) {
    throw new TypeError('Limites de cache inválidos')
  }
  const entradas = new Map()
  const pendentes = new Map()
  const resposta = (entrada, status) => ({
    ...structuredClone(entrada.dados),
    cacheStatus: status,
    desatualizado: status === 'stale',
  })

  function consultar(chave, { ttl, idadeMaxima, carregar }) {
    const salvo = entradas.get(chave)
    if (salvo) {
      entradas.delete(chave)
      entradas.set(chave, salvo)
      if (agora() - salvo.salvoEm < ttl) return Promise.resolve(resposta(salvo, 'hit'))
    }
    if (pendentes.has(chave)) return pendentes.get(chave)
    if (pendentes.size >= maxPendentes) {
      const erro = new Error('Limite de consultas em andamento')
      erro.codigo = 'CAPACIDADE'
      erro.temporario = true
      if (salvo && agora() - salvo.salvoEm < idadeMaxima) return Promise.resolve(resposta(salvo, 'stale'))
      return Promise.reject(erro)
    }
    const trabalho = async () => {
      try {
        const dados = await carregar()
        const entrada = { dados: structuredClone(dados), salvoEm: agora() }
        entradas.delete(chave)
        entradas.set(chave, entrada)
        while (entradas.size > maxEntradas) entradas.delete(entradas.keys().next().value)
        return resposta(entrada, 'miss')
      } catch (erro) {
        // Maximum age is counted from the last successful fetch, not from TTL expiry.
        if (erro.temporario === true && salvo && agora() - salvo.salvoEm < idadeMaxima) {
          return resposta(salvo, 'stale')
        }
        throw erro
      }
    }
    // Defer execution until the Promise has been registered, even on synchronous errors.
    const promise = Promise.resolve().then(trabalho).finally(() => pendentes.delete(chave))
    pendentes.set(chave, promise)
    return promise
  }
  return { consultar }
}

module.exports = { criarCacheMercado }
