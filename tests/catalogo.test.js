const { test } = require('node:test')
const assert = require('node:assert/strict')
const { criarServicoMercado } = require('../services/cotacoes')
const { criarCacheMercado } = require('../services/cacheMercado')
const { criarClienteBrapi } = require('../services/brapi')
const { criarCatalogoDinamico } = require('../services/fiis')

function payload(page = 1, limit = 20, total = 40) {
  return { stocks: Array.from({ length: Math.min(limit, Math.max(0, total - (page - 1) * limit)) }, (_, i) => ({
    stock: `TST${String((page - 1) * limit + i).padStart(3, '0')}11`, name: 'Fundo de teste',
    subType: 'fii', type: 'fund', sector: 'Miscellaneous', close: 10,
  })), currentPage: page, itemsPerPage: limit, totalCount: total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit) }
}
function ambiente() {
  let tempo = 0
  let handler = url => Response.json(payload(Number(url.searchParams.get('page')), Number(url.searchParams.get('limit'))))
  const calls = []
  const cliente = criarClienteBrapi({ agora: () => tempo, requisitar: async url => { calls.push(url); return handler(url) } })
  const service = criarServicoMercado({ cliente, cache: criarCacheMercado({ agora: () => tempo }), obterToken: () => 'teste' })
  return { ...service, catalogo: criarCatalogoDinamico({ listar: service.listarFiis }), calls,
    usar: fn => { handler = fn }, avancar: ms => { tempo += ms } }
}

test('lista 20 FIIs sem fan-out; normaliza pesquisa e compartilha cache/deduplicação', async () => {
  const a = ambiente()
  const resultados = await Promise.all(Array.from({ length: 8 }, () => a.listarFiis({ search: ' vghf11 ' })))
  assert.equal(a.calls.length, 1)
  assert.equal(a.calls[0].pathname, '/api/quote/list')
  assert.equal(a.calls[0].searchParams.get('subType'), 'fii')
  assert.equal(a.calls[0].searchParams.get('search'), 'VGHF11')
  assert.equal(a.calls[0].searchParams.get('limit'), '20')
  assert.equal(resultados[0].itens.length, 20)
  assert.equal((await a.listarFiis({ search: 'VGHF11' })).cacheStatus, 'hit')
  assert.equal(resultados[0].itens[0].tipo, null)
  assert.equal(resultados[0].itens[0].dy, null)
  assert.equal(resultados[0].itens[0].pvp, null)
  assert.equal(resultados[0].itens[0].atualizadoEm, null)
})

test('páginas, ordenação e termos distintos têm chaves separadas e TTL de 15 minutos', async () => {
  const a = ambiente()
  await a.listarFiis()
  assert.equal((await a.listarFiis({ page: 2 })).paginacao.page, 2)
  await a.listarFiis({ sortBy: 'close', sortOrder: 'desc' })
  await a.listarFiis({ search: 'MXRF' })
  assert.equal(a.calls.length, 4)
  a.avancar(15 * 60_000)
  await Promise.all([a.listarFiis(), a.listarFiis()])
  assert.equal(a.calls.length, 5)
})

test('parâmetros inválidos não consultam a fonte nem viram fallback', async () => {
  const a = ambiente()
  for (const query of [{ page: 0 }, { page: 1.5 }, { limit: 1000 }, { search: ['x'] }, { search: 'x'.repeat(101) }, { sortBy: 'dy' }, { sortOrder: 'invalid' }]) {
    await assert.rejects(a.catalogo(query), { codigo: 'PARAMETROS_INVALIDOS' })
  }
  assert.equal(a.calls.length, 0)
})

test('stale somente em falha temporária e até 24 horas; depois oferece catálogo local', async () => {
  const a = ambiente()
  const original = await a.catalogo()
  a.avancar(15 * 60_000)
  a.usar(() => new Response('', { status: 503 }))
  const stale = await a.catalogo()
  assert.equal(stale.estado, 'desatualizado')
  assert.equal(stale.consultadoEm, original.consultadoEm)
  a.avancar(24 * 60 * 60_000)
  const fallback = await a.catalogo()
  assert.equal(fallback.estado, 'local')
  assert.ok(fallback.itens.every(f => f.preco === null && f.dy === null))
})

for (const status of [401, 403]) test(`HTTP ${status} não disfarça catálogo antigo como atualizado`, async () => {
  const a = ambiente()
  await a.catalogo()
  a.avancar(15 * 60_000)
  a.usar(() => new Response('', { status }))
  const result = await a.catalogo()
  assert.equal(result.estado, 'local')
  assert.equal(result.motivo, 'acesso_indisponivel')
  assert.equal(result.cacheStatus, null)
  assert.ok(result.itens.every(f => f.preco === null))
})

test('resposta inconsistente não contamina cache nem reutiliza finanças antigas', async () => {
  const a = ambiente()
  await a.catalogo()
  a.avancar(15 * 60_000)
  a.usar(() => { const p = payload(); p.stocks[0].subType = 'etf'; return Response.json(p) })
  assert.equal((await a.catalogo()).motivo, 'resposta_invalida')
  a.usar(() => { const p = payload(); p.stocks[0].close = -1; return Response.json(p) })
  assert.equal((await a.catalogo()).motivo, 'resposta_invalida')
  a.usar(() => Response.json(payload()))
  assert.equal((await a.catalogo()).cacheStatus, 'miss')
})

test('preços ausentes não viram zero; paginação vazia é válida', async () => {
  const a = ambiente()
  a.usar(() => { const p = payload(); p.stocks[0].close = null; p.stocks[1].close = 0; return Response.json(p) })
  const result = await a.catalogo()
  assert.equal(result.itens[0].preco, null)
  assert.equal(result.itens[1].preco, null)
  a.usar(() => Response.json(payload(1, 20, 0)))
  assert.equal((await a.catalogo({ search: 'NAOEXISTE' })).paginacao.total, 0)
})

test('fallback pesquisa e corrige página inexistente sem importar indicadores legados', async () => {
  const a = ambiente()
  a.usar(() => { throw Error('offline') })
  const result = await a.catalogo({ page: 8, search: 'hglg' })
  assert.equal(result.estado, 'local')
  assert.equal(result.paginacao.page, 1)
  assert.deepEqual(result.itens.map(f => f.codigo), ['HGLG11'])
  assert.equal(result.itens[0].preco, null)
  assert.equal(result.itens[0].dy, null)
})

test('listagem e cotações compartilham bloqueio 429; hits não entram na fila externa', async () => {
  const a = ambiente()
  a.usar(() => Response.json({ results: [{ symbol: 'VGHF11', regularMarketPrice: 10 }] }))
  await a.buscarCotacao('VGHF11')
  a.usar(() => Response.json(payload()))
  await a.listarFiis()
  a.usar(() => new Response('', { status: 429, headers: { 'Retry-After': '120' } }))
  assert.equal((await a.catalogo({ page: 2 })).estado, 'local')
  const before = a.calls.length
  assert.equal((await a.listarFiis()).cacheStatus, 'hit')
  assert.equal((await a.buscarCotacao('VGHF11')).cacheStatus, 'hit')
  await assert.rejects(a.buscarHistorico('VGHF11'), { statusFonte: 429 })
  assert.equal(a.calls.length, before)
})
