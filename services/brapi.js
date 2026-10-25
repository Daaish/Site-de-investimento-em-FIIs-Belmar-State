class ErroMercado extends Error {
  constructor(codigo, { statusFonte, temporario = false, retryAfter } = {}) {
    super(codigo)
    this.codigo = codigo
    this.statusFonte = statusFonte
    this.temporario = temporario
    this.retryAfter = retryAfter
  }
}

function lerRetryAfter(valor, agora) {
  if (typeof valor === 'string' && /^\d+(?:\.\d+)?$/.test(valor.trim())) {
    const segundos = Number(valor)
    if (Number.isFinite(segundos)) return Math.min(Number.MAX_SAFE_INTEGER - agora, Math.max(1000, segundos * 1000))
  }
  const data = typeof valor === 'string' ? Date.parse(valor) : NaN
  return Number.isFinite(data) ? Math.max(1000, data - agora) : 60_000
}

function criarClienteBrapi({
  requisitar = (...args) => fetch(...args),
  agora = Date.now,
  esperar = ms => new Promise(resolve => setTimeout(resolve, ms)),
  esperaMaxima = 2000,
  maxFila = 64,
} = {}) {
  let bloqueadoAte = 0
  let fila = Promise.resolve()
  let naFila = 0
  function limitado() {
    return new ErroMercado('LIMITE_BRAPI', {
      statusFonte: 429, temporario: true,
      retryAfter: Math.max(1, Math.ceil((bloqueadoAte - agora()) / 1000)),
    })
  }

  function consultar(url, token, timeout) {
    if (naFila >= maxFila) return Promise.reject(new ErroMercado('CAPACIDADE', { temporario: true }))
    const inicio = agora()
    naFila++
    // Serializing external calls also permits only one probe after a 429 cooldown.
    // Cache hits never enter this queue.
    const executar = async () => {
      for (let tentativa = 0; tentativa < 2; tentativa++) {
        const restante = bloqueadoAte - agora()
        if (restante > 0) {
          if (agora() - inicio + restante > esperaMaxima) throw limitado()
          await esperar(restante)
          if (agora() < bloqueadoAte) throw limitado()
        }
        let resposta
        try {
          resposta = await requisitar(url, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            signal: AbortSignal.timeout(timeout),
          })
        } catch {
          throw new ErroMercado('FALHA_REDE', { temporario: true })
        }
        if (resposta.status === 429) {
          bloqueadoAte = Math.max(bloqueadoAte, agora() + lerRetryAfter(resposta.headers.get('retry-after'), agora()))
          // Release the body before retrying; never log it or its credentials.
          try { await resposta.body?.cancel() } catch { /* Already consumed/closed. */ }
          if (tentativa === 1) throw limitado()
          continue
        }
        if (!resposta.ok) {
          try { await resposta.body?.cancel() } catch { /* Already consumed/closed. */ }
          throw new ErroMercado('HTTP_BRAPI', {
            statusFonte: resposta.status,
            temporario: resposta.status >= 500 && resposta.status <= 599,
          })
        }
        try { return await resposta.json() } catch (erro) {
          if (erro?.name === 'AbortError' || erro?.name === 'TimeoutError') {
            throw new ErroMercado('FALHA_REDE', { temporario: true })
          }
          throw new ErroMercado('RESPOSTA_INVALIDA')
        }
      }
    }
    const resultado = fila.then(executar)
    fila = resultado.catch(() => {})
    return resultado.finally(() => { naFila-- })
  }
  return { consultar }
}

module.exports = { criarClienteBrapi, ErroMercado }
