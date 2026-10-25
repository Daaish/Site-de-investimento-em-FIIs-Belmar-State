import assert from 'node:assert/strict'
import { test } from 'node:test'
import { effectScope } from 'vue'
import { readFileSync } from 'node:fs'
import { parse, compileTemplate } from '@vue/compiler-sfc'
import { useCatalogoFiis } from '../src/composables/useCatalogoFiis.js'

const resposta = (page = 1, overrides = {}) => ({
  itens: [{ codigo: 'VGHF11', nome: 'Fundo teste', preco: 10, dy: null, pvp: null }],
  paginacao: { page, limit: 20, total: 40, totalPages: 2, hasNextPage: page < 2 },
  estado: 'atualizado', origem: 'brapi', consultadoEm: null, ...overrides,
})
function setup(t, handler = url => Response.json(resposta(Number(new URL(url, 'http://local').searchParams.get('page'))))) {
  const calls = [], timers = new Map()
  let id = 0
  const scope = effectScope()
  const app = scope.run(() => useCatalogoFiis({
    requisitar: (...args) => { calls.push(args); return handler(...args) },
    agendar: fn => { timers.set(++id, fn); return id }, cancelar: key => timers.delete(key),
  }))
  t.after(() => scope.stop())
  return { app, calls, timers, scope, flush: async () => { const callbacks = [...timers.values()]; timers.clear(); await Promise.all(callbacks.map(fn => fn())) } }
}
const settle = () => new Promise(resolve => setImmediate(resolve))

test('uma listagem por página, sem cotações por card e sem carregar todas as páginas', async t => {
  const { app, calls } = setup(t)
  await app.buscarFundos()
  assert.equal(calls.length, 1)
  assert.match(calls[0][0], /^\/api\/fiis\?/)
  assert.match(calls[0][0], /limit=20/)
  app.pagina.value = 2
  await settle()
  assert.equal(calls.length, 2)
  assert.match(calls[1][0], /page=2/)
})

test('pesquisa aguarda debounce; altera página para 1; atualização preserva página e ordem', async t => {
  const { app, calls, flush, timers } = setup(t)
  app.pagina.value = 2
  await settle()
  await app.buscarFundos()
  assert.equal(app.pagina.value, 2)
  app.pesquisa.value = 'V'
  app.pesquisa.value = 'VG'
  app.pesquisa.value = 'VGHF11'
  app.ordenacao.value = 'preco-maior'
  assert.equal(app.pagina.value, 1)
  assert.equal(timers.size, 1)
  const before = calls.length
  await flush()
  assert.equal(calls.length, before + 1)
  assert.match(calls.at(-1)[0], /search=VGHF11/)
  assert.match(calls.at(-1)[0], /sortBy=close&sortOrder=desc/)
  await app.buscarFundos()
  assert.equal(app.pesquisa.value, 'VGHF11')
  assert.equal(app.ordenacao.value, 'preco-maior')
})

test('resposta antiga não substitui pesquisa nova, mesmo quando cancelamento é ignorado', async t => {
  const pending = []
  const { app, flush } = setup(t, () => new Promise(resolve => pending.push(resolve)))
  const first = app.buscarFundos()
  app.pesquisa.value = 'NOVO'
  const second = flush()
  pending[1](Response.json(resposta(1, { itens: [{ codigo: 'NOVO11', preco: null }] })))
  await second
  pending[0](Response.json(resposta()))
  await first
  assert.equal(app.fundos.value[0].codigo, 'NOVO11')
  assert.equal(app.menorPreco.value, null)
})

test('estados atualizado, desatualizado e local preservam indicação e preços ausentes', async t => {
  let state = 'atualizado'
  const { app } = setup(t, () => Response.json(resposta(1, { estado: state, itens: [{ preco: state === 'local' ? null : 10 }] })))
  for (state of ['atualizado', 'desatualizado', 'local']) {
    await app.buscarFundos()
    assert.equal(app.estado.value, state)
    assert.equal(app.menorPreco.value, state === 'local' ? null : 10)
  }
})

test('falha HTTP não apresenta lista anterior como atualizada', async t => {
  let fail = false
  const { app } = setup(t, () => fail ? new Response('', { status: 502 }) : Response.json(resposta()))
  await app.buscarFundos()
  fail = true
  await app.buscarFundos()
  assert.equal(app.estado.value, '')
  assert.equal(app.fundos.value.length, 0)
  assert.ok(app.erro.value)
})

test('template preserva indicadores indisponíveis e identifica preço como fechamento, sem horário inventado', () => {
  const source = readFileSync(new URL('../src/views/ExplorarView.vue', import.meta.url), 'utf8')
  const template = parse(source).descriptor.template.content
  assert.deepEqual(compileTemplate({ source: template, filename: 'ExplorarView.vue', id: 'catalogo-test' }).errors, [])
  assert.match(template, /<option value="dy" disabled>/)
  assert.match(template, /id="tipo" disabled/)
  assert.match(template, /Fechamento informado pela brapi/)
  assert.match(template, /P\/VP/)
  assert.doesNotMatch(source, /useCotacoes|\/api\/cotacao\//)
})

test('página removida na fonte é corrigida com uma única consulta adicional', async t => {
  const { app, calls } = setup(t, url => {
    const page = Number(new URL(url, 'http://local').searchParams.get('page'))
    return Response.json(resposta(page, {
      itens: page > 1 ? [] : [{ codigo: 'VGHF11', preco: 10 }],
      paginacao: { page, limit: 20, total: 1, totalPages: 1, hasNextPage: false },
    }))
  })
  app.pagina.value = 2
  await settle()
  assert.equal(app.pagina.value, 1)
  assert.equal(app.fundos.value[0].codigo, 'VGHF11')
  assert.equal(calls.length, 2)
})

test('desmontagem cancela consulta e ignora resposta pendente', async t => {
  let finish
  const { app, calls, scope } = setup(t, () => new Promise(resolve => { finish = resolve }))
  const work = app.buscarFundos()
  scope.stop()
  assert.equal(calls[0][1].signal.aborted, true)
  finish(Response.json(resposta()))
  await work
  assert.equal(app.fundos.value.length, 0)
})
