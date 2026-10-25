import { test } from 'node:test'
import assert from 'node:assert/strict'
import { criarCarteira } from '../src/composables/useCarteira.js'
const op = { id: 'compra', tipo: 'compra', ticker: 'TEST11', quantidade: 10, preco: 20, data: '2026-01-01' }
const defer = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }

test('carregando, vazio e erro são distintos; falhas preservam dados; respostas antigas são ignoradas', async () => {
  let usuario = 'A', trocar, proxima = defer()
  const carteira = criarCarteira({ obterUsuario: () => usuario, observar: fn => { trocar = fn; return () => {} }, requisitar: () => proxima.promise })
  assert.equal(carteira.carregando.value, true)
  assert.equal(carteira.carregada.value, false)
  proxima.resolve(Response.json({ operacoes: [op] }))
  await new Promise(r => setTimeout(r, 0))
  assert.equal(carteira.patrimonio.value, 200)
  proxima = defer()
  const falha = carteira.carregar()
  proxima.resolve(Response.json({ erro: 'Banco indisponível' }, { status: 503 }))
  await falha
  assert.equal(carteira.carregada.value, true)
  assert.equal(carteira.patrimonio.value, 200)
  assert.match(carteira.erro.value, /Banco/)
  proxima = defer()
  const antiga = carteira.carregar(), respostaAntiga = proxima
  usuario = 'B'; proxima = defer(); trocar()
  assert.equal(carteira.carregada.value, false)
  assert.deepEqual(carteira.operacoes.value, [])
  proxima.resolve(Response.json({ operacoes: [] }))
  await new Promise(r => setTimeout(r, 0))
  respostaAntiga.resolve(Response.json({ operacoes: [op] })); await antiga
  assert.equal(carteira.carregada.value, true)
  assert.deepEqual(carteira.operacoes.value, [])
  usuario = null; trocar()
  assert.equal(carteira.carregada.value, false)
  carteira.destruir()
})

test('resposta perdida mantém chave de idempotência; cliques repetidos e gravação antiga não alteram outra conta', async () => {
  let usuario = 'A', trocar, modo = 'listar', pendente, chamadas = []
  const carteira = criarCarteira({ obterUsuario: () => usuario, observar: fn => { trocar = fn; return () => {} }, requisitar: async (url, options) => {
    if (!options.method) return Response.json({ operacoes: [] })
    chamadas.push(options.headers['Idempotency-Key'])
    if (modo === 'falhar') throw Error('rede')
    pendente = defer(); return pendente.promise
  } })
  await carteira.carregar()
  modo = 'falhar'
  assert.equal(await carteira.adicionarOperacao(op), false)
  modo = 'salvar'
  const envio = carteira.adicionarOperacao(op)
  assert.equal(await carteira.adicionarOperacao(op), false)
  assert.equal(chamadas[0], chamadas[1])
  usuario = 'B'; trocar()
  pendente.resolve(Response.json({ operacoes: [op] }))
  assert.equal(await envio, false)
  assert.deepEqual(carteira.operacoes.value, [])
  carteira.destruir()
})

test('F5 recupera chave pendente sem tocar localStorage e confirmação explícita mantém preço médio e ordem', async () => {
  const original = globalThis.sessionStorage, localOriginal = globalThis.localStorage
  const valores = new Map(), legado = new Map([
    ['belmar-carteira-v1', 'legado-global'], ['belmar-demo-v1:A:belmar-carteira-v1', 'legado-conta'],
  ])
  globalThis.sessionStorage = { getItem: k => valores.get(k) ?? null, setItem: (k, v) => valores.set(k, v), removeItem: k => valores.delete(k) }
  globalThis.localStorage = { getItem: () => { throw Error('carteira não deve ler legado') }, setItem: () => { throw Error('carteira não deve escrever legado') } }
  let primeira, segunda, chave
  const args = { obterUsuario: () => 'A', observar: () => () => {} }
  try {
    primeira = criarCarteira({ ...args, requisitar: async (url, options) => {
      if (!options.method) return Response.json({ operacoes: [] })
      chave = options.headers['Idempotency-Key']; throw Error('resposta perdida')
    } })
    await primeira.carregar()
    await primeira.adicionarOperacao(op)
    primeira.destruir()
    segunda = criarCarteira({ ...args, requisitar: async (url, options) => {
      if (!options.method) return Response.json({ operacoes: [] })
      assert.equal(options.headers['Idempotency-Key'], chave)
      return Response.json({ operacoes: [op,
        { ...op, id: '2', quantidade: 10, preco: 30, data: '2025-01-01' },
        { ...op, id: '3', tipo: 'venda', quantidade: 5, preco: 99 },
      ] })
    } })
    await segunda.carregar()
    assert.equal(segunda.temPendente.value, true)
    assert.equal(await segunda.confirmarPendente(), true)
    assert.equal(segunda.temPendente.value, false)
    assert.equal(segunda.posicoes.value[0].quantidade, 15)
    assert.equal(segunda.posicoes.value[0].precoMedio, 25)
    assert.equal(segunda.patrimonio.value, 375)
    assert.deepEqual(segunda.operacoes.value.map(o => o.id), ['compra', '2', '3'])
    assert.equal(valores.size, 0)
    assert.equal(legado.get('belmar-carteira-v1'), 'legado-global')
    assert.equal(legado.get('belmar-demo-v1:A:belmar-carteira-v1'), 'legado-conta')
  } finally { primeira?.destruir(); segunda?.destruir(); globalThis.sessionStorage = original; globalThis.localStorage = localOriginal }
})

test('erro na primeira carga não transforma carteira desconhecida em carteira vazia confirmada', async () => {
  const carteira = criarCarteira({ obterUsuario: () => 'A', observar: () => () => {}, requisitar: async () => { throw Error('sem rede') } })
  await carteira.carregar()
  assert.equal(carteira.carregando.value, false)
  assert.equal(carteira.carregada.value, false)
  assert.match(carteira.erro.value, /conexão/)
  carteira.destruir()
})
