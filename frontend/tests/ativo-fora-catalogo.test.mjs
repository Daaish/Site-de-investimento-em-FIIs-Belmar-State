import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { nextTick } from 'vue'
import { definirUsuarioLocal, criarArmazenamentoUsuario } from '../src/composables/armazenamentoUsuario.js'
import { useCotacoes } from '../src/composables/useCotacoes.js'
import { buscarHistoricos, reconstruirHistorico } from '../src/services/reconstruirHistorico.js'

// Synthetic operation/price fixtures exercise existing calculations, never application data.
test('VGHF11 ausente do catálogo: operações, posições e séries dos gráficos continuam disponíveis', async () => {
  const catalogo = JSON.parse(readFileSync(new URL('../../data/fiis.json', import.meta.url), 'utf8'))
  assert.equal(catalogo.some(f => f.codigo === 'VGHF11'), false)
  const originalStorage = globalThis.localStorage
  const originalFetch = globalThis.fetch
  const operacoes = [
    { id: 1, ticker: 'VGHF11', tipo: 'compra', quantidade: 10, preco: 10, data: '2026-01-02' },
    { id: 2, ticker: 'VGHF11', tipo: 'venda', quantidade: 2, preco: 11, data: '2026-01-05' },
  ]
  const storage = new Map([['belmar-carteira-v1', JSON.stringify(operacoes)]])
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
  definirUsuarioLocal('00000000-0000-4000-8000-000000000001')
  criarArmazenamentoUsuario().setItem('belmar-carteira-v1', JSON.stringify(operacoes))
  const chamadas = []
  globalThis.fetch = async url => {
    chamadas.push(url)
    if (url === '/api/cotacao/VGHF11') return Response.json({ ticker: 'VGHF11', preco: 12 })
    if (url === '/api/historico/VGHF11') return Response.json({ precos: [
      { data: '2026-01-02', fechamento: 10 }, { data: '2026-01-05', fechamento: 12 },
    ] })
    throw Error('Consulta inesperada: ' + url)
  }
  const mercado = useCotacoes()
  try {
    const { useCarteira } = await import('../src/composables/useCarteira.js?fora-catalogo-test')
    const carteira = useCarteira()
    assert.deepEqual(carteira.operacoes.value, operacoes)
    assert.equal(carteira.posicoes.value[0].ticker, 'VGHF11')
    assert.equal(carteira.posicoes.value[0].quantidade, 8)
    await mercado.atualizarCotacoes(carteira.posicoes.value.map(f => f.ticker), true)
    assert.equal(mercado.cotacoes.VGHF11.preco, 12)
    // Same inputs consumed by the distribution and historical evolution graphs.
    assert.equal(carteira.posicoes.value[0].quantidade * mercado.cotacoes.VGHF11.preco, 96)
    const { historicos, falhas } = await buscarHistoricos(carteira.operacoes.value.map(op => op.ticker))
    assert.deepEqual(falhas, [])
    const serie = reconstruirHistorico(carteira.operacoes.value, historicos)
    assert.ok(serie.pontos.length > 0)
    assert.equal(serie.pontos.at(-1).mercado, 96)
    assert.deepEqual(chamadas, ['/api/cotacao/VGHF11', '/api/historico/VGHF11'])
    await nextTick()
    assert.equal(storage.get('belmar-carteira-v1'), JSON.stringify(operacoes))
  } finally {
    definirUsuarioLocal(null)
    delete mercado.cotacoes.VGHF11
    globalThis.fetch = originalFetch
    globalThis.localStorage = originalStorage
  }
})
