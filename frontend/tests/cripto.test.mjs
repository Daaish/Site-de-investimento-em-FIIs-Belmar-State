import { test } from 'node:test'
import assert from 'node:assert/strict'
import { effectScope, nextTick } from 'vue'
import { readFileSync } from 'node:fs'
import { parse, compileTemplate } from '@vue/compiler-sfc'
import { useCripto } from '../src/composables/useCripto.js'
const ativo = { id: 'bitcoin', nome: 'Bitcoin', simbolo: 'BTC', preco: 12, variacao24h: 1, atualizadoEm: null }
const metadados = { moeda: 'BRL', consultadoEm: '2026-10-25T00:00:00Z', expiraEm: '2026-10-25T00:02:00Z', validoAte: '2026-10-25T00:30:00Z' }
const lista = (itens = [ativo], extra = {}) => Response.json({ ...metadados, itens, temMais: false, ...extra })
const historico = (id = 'bitcoin', dias = '7', extra = {}) => Response.json({ ...metadados, id, dias: Number(dias), pontos: [{ tempo: 1000, preco: 12 }], ...extra })
const defer = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
const turno = () => new Promise(r => setTimeout(r, 0))
function criar(requisitar, options = {}) {
  const scope = effectScope(), chamadas = []
  const api = scope.run(() => useCripto({ agora: () => Date.parse(metadados.consultadoEm), iniciarRelogio: () => 0, pararRelogio() {},
    requisitar: (url, opts) => { chamadas.push({ url, opts }); return requisitar(url, opts) }, ...options }))
  return { api, chamadas, scope }
}
test('listagem, seleção e períodos 7/30/90 consultam apenas endpoints locais em BRL', async () => {
  const c = criar(async url => {
    if (!url.includes('historico')) return lista()
    return historico('bitcoin', new URL(url, 'http://local').searchParams.get('dias'))
  })
  try {
    await c.api.buscarMoedas(); await turno()
    assert.equal(c.api.moedas.value[0].nome, 'Bitcoin')
    assert.equal(c.api.selecionada.value.id, 'bitcoin')
    for (const dias of ['30', '90', '7']) {
      c.api.periodo.value = dias; await turno()
      assert.equal(c.api.serie.value.dias, Number(dias))
    }
    assert.ok(c.chamadas.every(c => c.url.startsWith('/api/cripto/')))
    assert.ok(c.chamadas.every(c => !c.opts.headers))
  } finally { c.scope.stop() }
})
test('pesquisa tem debounce, não consulta imediatamente e descarta listagem antiga mesmo sem cancelamento da rede', async () => {
  let executar, cancelamentos = 0
  const antiga = defer()
  const c = criar(url => url.includes('pesquisa=btc') ? Promise.resolve(lista([{ ...ativo, nome: 'Resultado BTC' }])) : antiga.promise,
    { agendar: fn => { executar = fn; return 1 }, cancelar: () => { cancelamentos++ } })
  try {
    const inicial = c.api.buscarMoedas()
    c.api.pesquisa.value = 'b'; c.api.pesquisa.value = 'btc'
    assert.equal(c.chamadas.length, 1)
    assert.equal(c.chamadas[0].opts.signal.aborted, true)
    await executar()
    // A seleção dispara histórico: responde sem interferir na lista.
    antiga.resolve(lista([{ ...ativo, nome: 'Antiga' }]))
    await inicial; await turno()
    assert.equal(c.api.moedas.value[0].nome, 'Resultado BTC')
    assert.ok(cancelamentos >= 2)
    assert.equal(new URL(c.chamadas[0].url, 'http://local').searchParams.get('pesquisa'), '')
  } finally { c.scope.stop() }
})
test('troca de ativo e período descarta séries atrasadas e desmontagem cancela consultas', async () => {
  const pendentes = []
  const c = criar(() => { const d = defer(); pendentes.push(d); return d.promise })
  c.api.selecionar(ativo)
  c.api.periodo.value = '90'
  c.api.selecionar({ ...ativo, id: 'ethereum', nome: 'Ethereum' })
  pendentes[2].resolve(historico('ethereum', '90')); await turno()
  pendentes[0].resolve(historico()); pendentes[1].resolve(historico('bitcoin', '90')); await turno()
  assert.equal(c.api.serie.value.id, 'ethereum'); assert.equal(c.api.serie.value.dias, 90)
  const proxima = c.api.buscarHistorico(); c.scope.stop()
  assert.equal(c.chamadas.at(-1).opts.signal.aborted, true)
  pendentes[3].resolve(historico('bitcoin', '7')); await proxima
  assert.equal(c.api.serie.value.id, 'ethereum')
})
test('falha, 429, ausência de dados e dados antigos são estados distintos; expiração remove dados exibidos', async () => {
  let modo = 'stale', tick, tempo = Date.parse(metadados.consultadoEm)
  const c = criar(async () => {
    if (modo === 'erro') return Response.json({ erro: 'Limite temporário da CoinGecko' }, { status: 429 })
    if (modo === 'vazio') return lista([])
    return lista([], { itens: [ativo], desatualizado: true })
  }, { agora: () => tempo, iniciarRelogio: fn => { tick = fn; return 1 } })
  try {
    await c.api.buscarMoedas(); await turno()
    assert.equal(c.api.listaDesatualizada.value, true)
    assert.equal(c.api.moedas.value.length, 1)
    tempo = Date.parse(metadados.validoAte); tick()
    assert.equal(c.api.moedas.value.length, 0); assert.equal(c.api.listaExpirada.value, true)
    modo = 'erro'; await c.api.buscarMoedas()
    assert.match(c.api.erro.value, /Limite/); assert.equal(c.api.lista.value, null)
    modo = 'vazio'; await c.api.buscarMoedas()
    assert.equal(c.api.erro.value, ''); assert.deepEqual(c.api.moedas.value, [])
  } finally { c.scope.stop() }
})
test('templates compilam, preservam atribuição, estados acessíveis e layout responsivo sem referências à carteira', () => {
  for (const nome of ['views/BelmarDigitalView', 'components/ListaCripto', 'components/GraficoCripto']) {
    const source = readFileSync(new URL(`../src/${nome}.vue`, import.meta.url), 'utf8')
    const { descriptor } = parse(source)
    assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename: nome, id: 'digital-test' }).errors, [])
    assert.doesNotMatch(source, /useCarteira|COINGECKO_API_KEY|BRAPI_TOKEN/)
    if (nome.includes('View')) {
      assert.match(source, /coingecko\.com/); assert.match(source, /@media/)
      assert.match(source, /role="alert"/); assert.match(source, /role="status"/)
    }
  }
})
