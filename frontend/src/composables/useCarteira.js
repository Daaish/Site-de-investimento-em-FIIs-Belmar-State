import { ref, computed, readonly } from 'vue'
import { aoTrocarUsuarioLocal, usuarioLocalAtual } from './armazenamentoUsuario.js'

export function criarCarteira({ requisitar = (...args) => fetch(...args), obterUsuario = usuarioLocalAtual, observar = aoTrocarUsuarioLocal } = {}) {
  const operacoes = ref([])
  const carregando = ref(false), carregada = ref(false), salvando = ref(false), erro = ref('')
  const pendente = ref(null)
  let geracao = 0, controlador
  const chavePendente = () => `belmar-api-operacao-pendente-v1:${obterUsuario()}`
  function guardarPendente() {
    try {
      if (pendente.value) sessionStorage.setItem(chavePendente(), JSON.stringify(pendente.value))
      else sessionStorage.removeItem(chavePendente())
    } catch { /* A mesma instância ainda mantém a chave para repetição. */ }
  }
  function restaurarPendente() {
    try { pendente.value = JSON.parse(sessionStorage.getItem(chavePendente()) || 'null') } catch { pendente.value = null }
  }
  const ativa = (g, dono) => g === geracao && dono === obterUsuario()
  async function request(path = '', options = {}) {
    const resposta = await requisitar(`/api/carteira/operacoes${path}`, {
      credentials: 'include', signal: controlador ? AbortSignal.any([controlador.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000), ...options,
    })
    const dados = await resposta.json()
    if (!resposta.ok) throw Object.assign(Error(dados.erro || 'Não foi possível acessar a carteira.'), { status: resposta.status })
    return dados
  }
  async function carregar() {
    if (!obterUsuario() || salvando.value) return false
    const g = ++geracao, dono = obterUsuario()
    controlador?.abort()
    controlador = new AbortController()
    carregando.value = true
    erro.value = ''
    try {
      const dados = await request()
      if (!ativa(g, dono)) return false
      operacoes.value = dados.operacoes
      carregada.value = true
      return true
    } catch (e) {
      if (ativa(g, dono)) erro.value = e.status ? e.message : 'Falha de conexão ao carregar a carteira. Tente novamente.'
      return false
    } finally { if (ativa(g, dono)) carregando.value = false }
  }
  async function alterar(dados, id) {
    if (!obterUsuario() || !carregada.value || carregando.value || salvando.value) return false
    const g = geracao, dono = obterUsuario()
    const assinatura = JSON.stringify(dados)
    if (!id) {
      if (pendente.value && pendente.value.assinatura !== assinatura) {
        erro.value = 'Há uma operação sem confirmação. Reenvie os mesmos dados antes de registrar outra operação.'
        return false
      }
      pendente.value ||= { assinatura, chave: crypto.randomUUID() }
      guardarPendente()
    }
    salvando.value = true
    erro.value = ''
    try {
      const resultado = await request(id ? `/${encodeURIComponent(id)}` : '', {
        method: id ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json', ...(!id ? { 'Idempotency-Key': pendente.value.chave } : {}) },
        ...(!id ? { body: assinatura } : {}),
      })
      if (!ativa(g, dono)) return false
      operacoes.value = resultado.operacoes
      if (!id) { pendente.value = null; guardarPendente() }
      return true
    } catch (e) {
      if (ativa(g, dono)) {
        if (!id && e.status && e.status < 500) { pendente.value = null; guardarPendente() }
        erro.value = e.status ? e.message : 'Conexão interrompida. Reenvie os mesmos dados para confirmar a operação sem duplicá-la.'
      }
      return false
    } finally { if (ativa(g, dono)) salvando.value = false }
  }
  function trocar() {
    ++geracao
    controlador?.abort()
    operacoes.value = []
    carregada.value = false
    carregando.value = false
    salvando.value = false
    erro.value = ''
    pendente.value = null
    if (obterUsuario()) { restaurarPendente(); void carregar() }
  }
  const parar = observar(trocar)
  const posicoes = computed(() => {
    const mapa = {}

    for (const op of operacoes.value) {
      if (!mapa[op.ticker]) {
        mapa[op.ticker] = {
          ticker: op.ticker,
          quantidade: 0,
          custo: 0,
        }
      }

      const fii = mapa[op.ticker]

      if (op.tipo === 'compra') {
        fii.quantidade += op.quantidade
        fii.custo += op.quantidade * op.preco
      } else {
        if (op.quantidade > fii.quantidade) continue

        const precoMedio = fii.custo / fii.quantidade
        fii.custo -= precoMedio * op.quantidade
        fii.quantidade -= op.quantidade

        if (fii.quantidade === 0) fii.custo = 0
      }
    }

    return Object.values(mapa)
      .filter(fii => fii.quantidade > 0)
      .map(fii => ({
        ...fii,
        precoMedio: fii.custo / fii.quantidade,
      }))
      .sort((a, b) => a.ticker.localeCompare(b.ticker))
  })

  const patrimonio = computed(() =>
    posicoes.value.reduce((total, fii) => total + fii.custo, 0)
  )

  const totalCotas = computed(() =>
    posicoes.value.reduce((total, fii) => total + fii.quantidade, 0)
  )

  const carteira = {
    operacoes: readonly(operacoes), posicoes, patrimonio, totalCotas,
    carregando: readonly(carregando), carregada: readonly(carregada), salvando: readonly(salvando), erro: readonly(erro),
    temPendente: computed(() => !!pendente.value),
    confirmarPendente: () => pendente.value ? alterar(JSON.parse(pendente.value.assinatura)) : Promise.resolve(false),
    carregar, adicionarOperacao: dados => alterar(dados), removerOperacao: id => alterar(null, id),
    destruir: () => { parar(); ++geracao; controlador?.abort() },
  }
  if (obterUsuario()) { restaurarPendente(); void carregar() }
  return carteira
}
const carteira = criarCarteira()
export function useCarteira() { return carteira }
