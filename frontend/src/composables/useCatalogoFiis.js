import { ref, computed, watch, onScopeDispose } from 'vue'

// Request state only: the existing backend market cache owns all cached data.
export function useCatalogoFiis({ requisitar = (...args) => fetch(...args), agendar = setTimeout, cancelar = clearTimeout } = {}) {
  const fundos = ref([])
  const pesquisa = ref('')
  const ordenacao = ref('nome')
  const pagina = ref(1)
  const paginacao = ref({ page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false })
  const estado = ref('')
  const motivo = ref(null)
  const consultadoEm = ref(null)
  const carregando = ref(false)
  const erro = ref('')
  let versao = 0, timer, controle, ajustando = false

  function invalidar() {
    versao++
    cancelar(timer)
    controle?.abort()
  }
  async function buscarFundos() {
    invalidar()
    const atual = versao
    controle = new AbortController()
    carregando.value = true
    erro.value = ''
    const ordens = { nome: ['name', 'asc'], 'nome-desc': ['name', 'desc'], 'preco-menor': ['close', 'asc'], 'preco-maior': ['close', 'desc'], volume: ['volume', 'desc'], variacao: ['change', 'desc'] }
    const [sortBy, sortOrder] = ordens[ordenacao.value] || ordens.nome
    const query = new URLSearchParams({ page: String(pagina.value), limit: '20', search: pesquisa.value.trim(), sortBy, sortOrder })
    try {
      const resposta = await requisitar(`/api/fiis?${query}`, { signal: controle.signal })
      if (!resposta.ok) throw Error('Não foi possível carregar o catálogo.')
      const dados = await resposta.json()
      if (atual !== versao) return
      if (!Array.isArray(dados.itens) || !dados.paginacao || !['atualizado', 'desatualizado', 'local'].includes(dados.estado)) throw Error('Formato de catálogo inesperado.')
      fundos.value = dados.itens
      paginacao.value = dados.paginacao
      estado.value = dados.estado
      motivo.value = dados.motivo
      consultadoEm.value = dados.consultadoEm
      ajustando = true
      pagina.value = dados.paginacao.page
      ajustando = false
      // A now-empty last page is corrected once; searches returning zero items stay on page 1.
      if (pagina.value > Math.max(1, dados.paginacao.totalPages)) {
        pagina.value = Math.max(1, dados.paginacao.totalPages)
      }
    } catch (e) {
      if (atual !== versao) return
      erro.value = 'Não foi possível carregar o catálogo. Tente novamente.'
      fundos.value = []
      estado.value = ''
    } finally {
      if (atual === versao) carregando.value = false
    }
  }
  watch([pesquisa, ordenacao], () => {
    invalidar()
    ajustando = true
    pagina.value = 1
    ajustando = false
    carregando.value = true
    timer = agendar(buscarFundos, 400)
  }, { flush: 'sync' })
  watch(pagina, () => { if (!ajustando) buscarFundos() }, { flush: 'sync' })
  function limparFiltros() {
    pesquisa.value = ''
    ordenacao.value = 'nome'
    if (pagina.value !== 1) pagina.value = 1
  }
  onScopeDispose(() => { invalidar() })
  const menorPreco = computed(() => {
    const precos = fundos.value.map(f => f.preco).filter(p => typeof p === 'number' && Number.isFinite(p) && p > 0)
    return precos.length ? Math.min(...precos) : null
  })
  return { fundos, pesquisa, ordenacao, pagina, paginacao, estado, motivo, consultadoEm, carregando, erro, buscarFundos, limparFiltros, menorPreco }
}
