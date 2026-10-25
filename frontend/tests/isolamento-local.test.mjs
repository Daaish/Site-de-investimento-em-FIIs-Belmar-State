import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nextTick } from 'vue'
import { readFileSync } from 'node:fs'
import { criarAutenticacao } from '../src/composables/useAuth.js'
import { criarArmazenamentoUsuario, definirUsuarioLocal } from '../src/composables/armazenamentoUsuario.js'
import { criarCarteira } from '../src/composables/useCarteira.js'
import { useHistoricoPatrimonio } from '../src/composables/useHistoricoPatrimonio.js'

const A = { id: '00000000-0000-4000-8000-000000000001', nome: 'Conta A' }
const B = { id: '00000000-0000-4000-8000-000000000002', nome: 'Conta B' }
const chaves = ['belmar-carteira-v1', 'belmar-proventos-v1', 'belmar-dna-v1', 'belmar-historico-patrimonio-v1']

test('duas contas ficam isoladas, legado não é lido/escrito/importado e callbacks antigos não gravam na nova conta', async () => {
  const originalStorage = globalThis.localStorage
  const legacy = new Map(chaves.map(key => [key, JSON.stringify([{ marcador: `legado-${key}` }])]))
  const values = new Map(legacy), reads = [], writes = []
  globalThis.localStorage = {
    getItem: key => { reads.push(key); return values.get(key) ?? null },
    setItem: (key, value) => { writes.push(key); values.set(key, value) },
  }
  definirUsuarioLocal(null)
  let user = A
  const auth = criarAutenticacao({ requisitar: async url => url.endsWith('/logout') ? new Response(null, { status: 204 }) : Response.json({ usuario: user }) })
  const registros = new Map()
  const carteira = criarCarteira({ requisitar: async (url, options) => {
    const id = user.id
    const ops = registros.get(id) || []
    if (options.method === 'POST') { ops.push(JSON.parse(options.body)); registros.set(id, ops) }
    return Response.json({ operacoes: ops })
  } })
  try {
    assert.equal(carteira.operacoes.value.length, 0)
    await auth.entrar({})
    const a = criarArmazenamentoUsuario()
    const historicoA = useHistoricoPatrimonio()
    assert.equal(carteira.operacoes.value.length, 0)
    for (const key of chaves) assert.equal(a.getItem(key), null)
    const compra = { id: 'op-demo-a', tipo: 'compra', ticker: 'VGHF11', quantidade: 2, preco: 10, data: '2026-01-01' }
    await carteira.carregar()
    await carteira.adicionarOperacao(compra)
    a.setItem(chaves[1], JSON.stringify([{ ticker: 'VGHF11', valor: 1 }]))
    a.setItem(chaves[2], JSON.stringify({ respostas: [0, 1] }))
    historicoA.registrarSnapshot(20, 22)
    await auth.sair()
    assert.equal(carteira.operacoes.value.length, 0)
    assert.equal(historicoA.historico.value.length, 0)
    user = B
    await auth.entrar({})
    const b = criarArmazenamentoUsuario()
    assert.equal(carteira.operacoes.value.length, 0)
    assert.equal(carteira.patrimonio.value, 0)
    for (const key of chaves) assert.equal(b.getItem(key), null)
    a.setItem(chaves[1], 'callback-antigo')
    assert.equal(b.getItem(chaves[1]), null)
    assert.equal(historicoA.registrarSnapshot(999, 999), false)
    await carteira.carregar()
    await carteira.adicionarOperacao({ ...compra, id: 'op-demo-b', quantidade: 1 })
    await nextTick()
    await auth.sair()
    user = A
    await auth.entrar({})
    await carteira.carregar()
    assert.deepEqual(carteira.operacoes.value, [compra])
    assert.equal(JSON.parse(criarArmazenamentoUsuario().getItem(chaves[1]))[0].valor, 1)
    assert.equal(useHistoricoPatrimonio().historico.value.length, 1)
    for (const [key, value] of legacy) assert.equal(values.get(key), value)
    assert.ok(reads.every(key => !chaves.includes(key)), 'nenhuma leitura de chaves globais legadas')
    assert.ok(writes.every(key => !chaves.includes(key)), 'nenhuma escrita em chaves globais legadas')
    // A fresh auth instance represents restoring the same browser session after F5.
    const reload = criarAutenticacao({ requisitar: async () => Response.json({ usuario: A }) })
    await reload.restaurarSessao()
    await carteira.carregar()
    assert.deepEqual(carteira.operacoes.value, [compra])
  } finally { carteira.destruir(); definirUsuarioLocal(null); globalThis.localStorage = originalStorage }
})

test('todos os consumidores financeiros usam o adaptador por usuário, sem acesso direto ao localStorage', () => {
  for (const path of ['views/CalendarioView.vue', 'views/DnaView.vue', 'views/ConquistasView.vue', 'components/PainelDividendos.vue', 'composables/useCarteira.js', 'composables/useHistoricoPatrimonio.js']) {
    const source = readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
    assert.doesNotMatch(source, /localStorage\.(getItem|setItem|removeItem)/)
    if (!path.endsWith('useCarteira.js')) assert.match(source, /criarArmazenamentoUsuario/)
  }
})
