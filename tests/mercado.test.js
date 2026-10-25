const { test } = require('node:test')
const assert = require('node:assert/strict')
const { criarCacheMercado } = require('../services/cacheMercado')
const { criarClienteBrapi } = require('../services/brapi')
const { criarServicoMercado } = require('../services/cotacoes')

const minuto = 60_000
const hora = 60 * minuto
const dia = 24 * hora
const cotacao = (preco = 100, symbol = 'TEST11') => ({ results: [{
  symbol, regularMarketPrice: preco, regularMarketTime: '2026-10-20T17:00:00.000Z',
  longName: 'Fundo de teste', regularMarketChangePercent: 1,
}] })
const historico = symbol => ({ results: [{ symbol: symbol || 'TEST11', historicalDataPrice: [
  { date: 1792440000, close: 100 }, { date: 1792526400, close: 101 },
] }] })
const resposta = (json, status = 200, retryAfter = null) => ({
  ok: status >= 200 && status < 300, status,
  headers: { get: () => retryAfter }, json: async () => structuredClone(json),
})
function ambiente({ maxEntradas, maxPendentes, esperaMaxima = 2000 } = {}) {
  let tempo = Date.parse('2026-10-24T12:00:00Z')
  let handler = url => resposta(url.searchParams.has('range') ? historico() : cotacao())
  const chamadas = [], esperas = []
  const cliente = criarClienteBrapi({
    agora: () => tempo, esperaMaxima,
    esperar: async ms => { esperas.push(ms); tempo += ms },
    requisitar: async (url, options) => { chamadas.push({ url, options }); return handler(url, options) },
  })
  const servico = criarServicoMercado({
    cache: criarCacheMercado({ agora: () => tempo, maxEntradas, maxPendentes }),
    cliente, obterToken: () => 'token-de-teste',
  })
  return { ...servico, cliente, chamadas, esperas,
    avancar: ms => { tempo += ms }, agora: () => tempo,
    usar: fn => { handler = fn },
  }
}

test('primeira chamada consulta a fonte; cache normaliza ticker e preserva data e campos', async () => {
  const a = ambiente()
  const first = await a.buscarCotacao(' test11 ')
  assert.equal(first.cacheStatus, 'miss')
  a.avancar(minuto)
  const second = await a.buscarCotacao('TEST11')
  assert.equal(a.chamadas.length, 1)
  assert.equal(second.cacheStatus, 'hit')
  assert.equal(second.desatualizado, false)
  assert.equal(second.atualizadoEm, first.atualizadoEm)
  assert.equal(second.nome, 'Fundo de teste')
  assert.equal(second.preco, 100)
  assert.equal(second.variacaoDia, 1)
  assert.equal(second.fonte, 'brapi.dev')
})

test('deduplica requisições frias e atualizações vencidas', async () => {
  const a = ambiente()
  await Promise.all(Array.from({ length: 20 }, () => a.buscarCotacao('TEST11')))
  assert.equal(a.chamadas.length, 1)
  a.avancar(15 * minuto)
  a.usar(() => resposta(cotacao(110)))
  const resultados = await Promise.all(Array.from({ length: 20 }, () => a.buscarCotacao(' test11 ')))
  assert.equal(a.chamadas.length, 2)
  assert.ok(resultados.every(d => d.preco === 110 && d.cacheStatus === 'miss'))
})

test('históricos: TTL de seis horas, chaves distintas por tipo, período e intervalo', async () => {
  const a = ambiente()
  await a.buscarCotacao('TEST11')
  const first = await a.buscarHistorico('TEST11')
  assert.deepEqual(Object.keys(first).sort(), ['ticker', 'fonte', 'total', 'inicio', 'fim', 'precos', 'cacheStatus', 'desatualizado'].sort())
  a.avancar(6 * hora - 1)
  assert.equal((await a.buscarHistorico('test11')).cacheStatus, 'hit')
  assert.equal(a.chamadas.length, 2)
  a.avancar(1)
  await Promise.all([a.buscarHistorico('TEST11'), a.buscarHistorico('TEST11')])
  assert.equal(a.chamadas.length, 3)
  await a.buscarHistorico('TEST11', { periodo: '1mo' })
  await a.buscarHistorico('TEST11', { intervalo: '1wk' })
  assert.equal(a.chamadas.length, 5)
  assert.equal(a.chamadas[1].url.searchParams.get('range'), '3mo')
  assert.equal(a.chamadas[1].url.searchParams.get('interval'), '1d')
})

for (const [nome, metodo, ttl, max] of [
  ['cotação', 'buscarCotacao', 15 * minuto, dia], ['histórico', 'buscarHistorico', 6 * hora, 7 * dia],
]) {
  test(`${nome}: falha temporária usa stale somente dentro da idade máxima`, async () => {
    const a = ambiente()
    const first = await a[metodo]('TEST11')
    a.avancar(ttl)
    a.usar(() => resposta({}, 503))
    const stale = await a[metodo]('TEST11')
    assert.equal(stale.cacheStatus, 'stale')
    assert.equal(stale.desatualizado, true)
    assert.equal(stale.atualizadoEm, first.atualizadoEm)
    a.avancar(max - ttl - 1)
    assert.equal((await a[metodo]('TEST11')).cacheStatus, 'stale')
    a.avancar(1)
    await assert.rejects(a[metodo]('TEST11'), { statusFonte: 503 })
  })
  test(`${nome}: sem dados prévios, erro não é cacheado e Promise é liberada`, async () => {
    const a = ambiente()
    a.usar(() => { throw new Error('falha de rede com informação privada') })
    await assert.rejects(a[metodo]('TEST11'), { codigo: 'FALHA_REDE' })
    a.usar(() => resposta(metodo === 'buscarCotacao' ? cotacao() : historico()))
    assert.equal((await a[metodo]('TEST11')).cacheStatus, 'miss')
    assert.equal(a.chamadas.length, 2)
  })
  for (const status of [401, 403]) test(`${nome}: HTTP ${status} nunca retorna stale`, async () => {
    const a = ambiente()
    await a[metodo]('TEST11')
    a.avancar(ttl)
    a.usar(() => resposta({}, status))
    await assert.rejects(a[metodo]('TEST11'), { statusFonte: status, temporario: false })
  })
}

test('429 curto: Retry-After é respeitado com apenas uma repetição deduplicada', async () => {
  const a = ambiente()
  let n = 0
  a.usar(() => ++n === 1 ? resposta({}, 429, '1') : resposta(cotacao()))
  const valores = await Promise.all(Array.from({ length: 12 }, () => a.buscarCotacao('TEST11')))
  assert.equal(n, 2)
  assert.deepEqual(a.esperas, [1000])
  assert.ok(valores.every(v => v.preco === 100))
})

test('429 persistente: não entra em loop e libera Promises após o bloqueio', async () => {
  const a = ambiente()
  a.usar(() => resposta({}, 429, '1'))
  await assert.rejects(a.buscarCotacao('TEST11'), { statusFonte: 429 })
  assert.equal(a.chamadas.length, 2)
  a.avancar(1000)
  a.usar(() => resposta(cotacao()))
  assert.equal((await a.buscarCotacao('TEST11')).cacheStatus, 'miss')
})

test('429 longo compartilha bloqueio entre endpoints; hits continuam imediatos', async () => {
  const a = ambiente()
  await a.buscarCotacao('TEST11')
  a.usar(() => resposta({}, 429, '120'))
  await assert.rejects(a.buscarHistorico('TEST11'), { statusFonte: 429, retryAfter: 120 })
  assert.equal((await a.buscarCotacao('TEST11')).cacheStatus, 'hit')
  await assert.rejects(a.buscarCotacao('OTHER11'), { statusFonte: 429 })
  assert.equal(a.chamadas.length, 2)
  assert.deepEqual(a.esperas, [])
  a.avancar(120_000)
  a.usar(() => resposta(historico()))
  assert.equal((await a.buscarHistorico('TEST11')).cacheStatus, 'miss')
})

test('Retry-After aceita data HTTP; cabeçalho ausente usa bloqueio conservador', async () => {
  for (const header of [null, 'inválido', new Date(Date.parse('2026-10-24T12:00:00Z') + 10_000).toUTCString()]) {
    const a = ambiente()
    a.usar(() => resposta({}, 429, header))
    await assert.rejects(a.buscarCotacao('TEST11'), e => e.statusFonte === 429 && e.retryAfter === (header?.startsWith('Sat') ? 10 : 60))
    assert.equal(a.chamadas.length, 1)
  }
})

test('429 retorna stale elegível sem renovar a idade original', async () => {
  const a = ambiente()
  await a.buscarCotacao('TEST11')
  a.avancar(15 * minuto)
  a.usar(() => resposta({}, 429, '120'))
  assert.equal((await a.buscarCotacao('TEST11')).cacheStatus, 'stale')
  assert.equal((await a.buscarCotacao('TEST11')).cacheStatus, 'stale')
  assert.equal(a.chamadas.length, 2)
  a.avancar(dia)
  await assert.rejects(a.buscarCotacao('TEST11'), { statusFonte: 429 })
})

test('tickers e parâmetros inválidos são rejeitados antes de acessar cache ou API', async () => {
  const a = ambiente()
  for (const ticker of ['', 'A/B', 'ABCD', null, ['TEST11'], 'TOO_LONG_TICKER']) {
    assert.throws(() => a.buscarCotacao(ticker), { codigo: 'TICKER_INVALIDO' })
  }
  assert.throws(() => a.buscarHistorico('TEST11', { intervalo: 'inválido' }), { codigo: 'PARAMETROS_INVALIDOS' })
  assert.equal(a.chamadas.length, 0)
})

test('respostas inválidas não usam stale nem contaminam o cache', async () => {
  const invalidos = [{}, { results: [] }, cotacao(-1), cotacao(null), cotacao(100, 'OTHER11')]
  for (const payload of invalidos) {
    const a = ambiente()
    await a.buscarCotacao('TEST11')
    a.avancar(15 * minuto)
    a.usar(() => resposta(payload))
    await assert.rejects(a.buscarCotacao('TEST11'), { codigo: 'RESPOSTA_INVALIDA', temporario: false })
    a.usar(() => resposta(cotacao(120)))
    assert.equal((await a.buscarCotacao('TEST11')).preco, 120)
  }
  const a = ambiente()
  await a.buscarHistorico('TEST11')
  a.avancar(6 * hora)
  a.usar(() => resposta({ results: [{ symbol: 'TEST11', historicalDataPrice: [{ date: 1e100, close: 10 }] }] }))
  await assert.rejects(a.buscarHistorico('TEST11'), { codigo: 'RESPOSTA_INVALIDA' })
  a.usar(() => ({ ...resposta({}), json: async () => { throw Error('JSON inválido') } }))
  await assert.rejects(a.buscarHistorico('TEST11'), { codigo: 'RESPOSTA_INVALIDA' })
})

test('token ausente não reutiliza cache e troca de credenciais isola entradas', async () => {
  const a = ambiente()
  let token = 'primeiro'
  const s = criarServicoMercado({ cliente: a.cliente, obterToken: () => token })
  await s.buscarCotacao('TEST11')
  token = ''
  assert.throws(() => s.buscarCotacao('TEST11'), { codigo: 'TOKEN_AUSENTE' })
  token = 'segundo'
  assert.equal((await s.buscarCotacao('TEST11')).cacheStatus, 'miss')
  assert.equal(a.chamadas.length, 2)
})

test('limite LRU remove entradas antigas e respostas não permitem mutação do cache', async () => {
  const a = ambiente({ maxEntradas: 2 })
  a.usar(url => resposta(cotacao(100, url.pathname.split('/').at(-1))))
  const first = await a.buscarCotacao('FIRST11')
  first.preco = -100
  await a.buscarCotacao('SECOND11')
  assert.equal((await a.buscarCotacao('FIRST11')).preco, 100)
  await a.buscarCotacao('THIRD11')
  assert.equal((await a.buscarCotacao('FIRST11')).cacheStatus, 'hit')
  assert.equal((await a.buscarCotacao('SECOND11')).cacheStatus, 'miss')
  assert.equal(a.chamadas.length, 4)
})

test('deduplicação compartilha exatamente a Promise e capacidade é limitada', async () => {
  const cache = criarCacheMercado({ maxPendentes: 1 })
  let liberar
  const bloqueio = new Promise(resolve => { liberar = resolve })
  const config = { ttl: 1000, idadeMaxima: 5000, carregar: () => bloqueio }
  const first = cache.consultar('primeiro', config)
  assert.equal(cache.consultar('primeiro', config), first)
  await assert.rejects(cache.consultar('segundo', config), { codigo: 'CAPACIDADE' })
  liberar({ preco: 10 })
  await first
  assert.equal((await cache.consultar('segundo', { ...config, carregar: async () => ({ preco: 20 }) })).preco, 20)
})

test('idade máxima também é verificada depois de uma consulta que falhou lentamente', async () => {
  const a = ambiente()
  await a.buscarCotacao('TEST11')
  a.avancar(dia - 1)
  a.usar(() => { a.avancar(2); throw Error('timeout') })
  await assert.rejects(a.buscarCotacao('TEST11'), { codigo: 'FALHA_REDE' })
})

test('resposta de histórico vazia não recebe cache nem stale', async () => {
  const a = ambiente()
  await a.buscarHistorico('TEST11')
  a.avancar(6 * hora)
  a.usar(() => resposta({ results: [{ symbol: 'TEST11', historicalDataPrice: [] }] }))
  await assert.rejects(a.buscarHistorico('TEST11'), { codigo: 'HISTORICO_INDISPONIVEL' })
  a.usar(() => resposta(historico()))
  assert.equal((await a.buscarHistorico('TEST11')).cacheStatus, 'miss')
})

test('429 bloqueia concorrentes de chaves diferentes sem rajada de tentativas externas', async () => {
  const a = ambiente()
  a.usar(() => resposta({}, 429, '120'))
  const resultados = await Promise.allSettled(Array.from({ length: 12 }, (_, i) => a.buscarCotacao(`TEST${i}11`)))
  assert.ok(resultados.every(r => r.status === 'rejected' && r.reason.statusFonte === 429))
  assert.equal(a.chamadas.length, 1)
  assert.deepEqual(a.esperas, [])
})

test('timeout ao ler resposta é temporário; conteúdo JSON inválido continua sendo rejeitado', async () => {
  const a = ambiente()
  await a.buscarCotacao('TEST11')
  a.avancar(15 * minuto)
  a.usar(() => ({ ...resposta({}), json: async () => { const erro = new Error('timeout'); erro.name = 'AbortError'; throw erro } }))
  assert.equal((await a.buscarCotacao('TEST11')).cacheStatus, 'stale')
})

test('VGHF11 fora do catálogo continua aceito em cotações e históricos com cache', async () => {
  const { buscarFiis } = require('../services/fiis')
  assert.equal(buscarFiis().some(f => f.codigo === 'VGHF11'), false)
  const a = ambiente()
  a.usar(url => resposta(url.searchParams.has('range') ? historico('VGHF11') : cotacao(100, 'VGHF11')))
  const preco = await a.buscarCotacao(' vghf11 ')
  const serie = await a.buscarHistorico('VGHF11')
  assert.equal(preco.ticker, 'VGHF11')
  assert.equal(preco.preco, 100)
  assert.equal(serie.ticker, 'VGHF11')
  assert.ok(serie.precos.length > 0)
  assert.equal((await a.buscarCotacao('VGHF11')).cacheStatus, 'hit')
  assert.equal((await a.buscarHistorico('VGHF11')).cacheStatus, 'hit')
  assert.equal(a.chamadas.length, 2)
})
