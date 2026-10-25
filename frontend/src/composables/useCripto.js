import { ref, computed, watch, onScopeDispose } from 'vue'

export function useCripto({ requisitar = (...args) => fetch(...args), agendar = setTimeout, cancelar = clearTimeout,
  agora = Date.now, iniciarRelogio = fn => setInterval(fn, 15000), pararRelogio = clearInterval } = {}) {
  const pesquisa = ref(''), pagina = ref(1), selecionada = ref(null), periodo = ref('7')
  const lista = ref(null), serie = ref(null), carregando = ref(false), carregandoHistorico = ref(false)
  const erro = ref(''), erroHistorico = ref(''), horario = ref(agora())
  let versao = 0, versaoHistorico = 0, controle, controleHistorico, timer
  const relogio = iniciarRelogio(() => { horario.value = agora() })
  const valido = dados => dados && horario.value < Date.parse(dados.validoAte)
  const moedas = computed(() => valido(lista.value) ? lista.value.itens : [])
  const pontos = computed(() => valido(serie.value) ? serie.value.pontos : [])
  const desatualizado = dados => !!dados && (dados.desatualizado || horario.value >= Date.parse(dados.expiraEm))
  const listaDesatualizada = computed(() => desatualizado(lista.value))
  const historicoDesatualizado = computed(() => desatualizado(serie.value))
  const listaExpirada = computed(() => !!lista.value && !valido(lista.value))
  const historicoExpirado = computed(() => !!serie.value && !valido(serie.value))
  async function request(url, signal) {
    let resposta, dados
    try {
      resposta = await requisitar(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(25000)]) })
    } catch { throw Error('Falha de conexão ou tempo limite excedido. Tente novamente.') }
    try { dados = await resposta.json() } catch { throw Error('O serviço retornou uma resposta inválida. Tente novamente.') }
    if (!resposta.ok) throw Error(dados.erro || 'Não foi possível consultar o mercado.')
    if (!Number.isFinite(Date.parse(dados.validoAte)) || !Number.isFinite(Date.parse(dados.expiraEm))) throw Error('Resposta de mercado inválida.')
    return dados
  }
  function invalidarLista() { ++versao; cancelar(timer); controle?.abort() }
  async function buscarMoedas() {
    invalidarLista()
    const atual = versao
    controle = new AbortController()
    carregando.value = true; erro.value = ''
    try {
      const query = new URLSearchParams({ pagina: String(pagina.value), pesquisa: pesquisa.value.trim() })
      const dados = await request(`/api/cripto/moedas?${query}`, controle.signal)
      if (atual !== versao) return
      if (!Array.isArray(dados.itens)) throw Error('Lista de moedas inválida.')
      horario.value = agora(); lista.value = dados
      // Atualiza a cotação da seleção sem mudar a moeda nem o período.
      const atualizada = dados.itens.find(m => m.id === selecionada.value?.id)
      if (atualizada) selecionada.value = atualizada
      if (!selecionada.value && dados.itens.length) selecionar(dados.itens[0])
    } catch (e) {
      if (atual !== versao) return
      lista.value = null
      erro.value = e.message === 'Failed to fetch' ? 'Falha de conexão. Tente novamente.' : e.message || 'Não foi possível carregar as moedas.'
    } finally { if (atual === versao) carregando.value = false }
  }
  async function buscarHistorico() {
    const atual = ++versaoHistorico
    controleHistorico?.abort()
    if (!selecionada.value) { serie.value = null; carregandoHistorico.value = false; return }
    const id = selecionada.value.id, dias = periodo.value
    controleHistorico = new AbortController()
    carregandoHistorico.value = true; erroHistorico.value = ''
    // Nunca exibe a série de outra moeda ou período durante a consulta.
    if (serie.value?.id !== id || String(serie.value?.dias) !== dias) serie.value = null
    try {
      const dados = await request(`/api/cripto/moedas/${encodeURIComponent(id)}/historico?dias=${dias}`, controleHistorico.signal)
      if (atual !== versaoHistorico) return
      if (!Array.isArray(dados.pontos) || dados.id !== id || String(dados.dias) !== dias) throw Error('Histórico inválido.')
      horario.value = agora(); serie.value = dados
    } catch (e) {
      if (atual !== versaoHistorico) return
      serie.value = null
      erroHistorico.value = e.message === 'Failed to fetch' ? 'Falha de conexão ao consultar o histórico.' : e.message || 'Histórico indisponível.'
    } finally { if (atual === versaoHistorico) carregandoHistorico.value = false }
  }
  function selecionar(moeda) {
    if (selecionada.value?.id === moeda.id) return
    selecionada.value = moeda
    buscarHistorico()
  }
  let ajustando = false
  watch(pesquisa, () => {
    invalidarLista(); lista.value = null; erro.value = ''; carregando.value = true
    ajustando = true; pagina.value = 1; ajustando = false
    timer = agendar(buscarMoedas, 450)
  }, { flush: 'sync' })
  watch(pagina, () => { if (!ajustando) { lista.value = null; buscarMoedas() } }, { flush: 'sync' })
  watch(periodo, buscarHistorico, { flush: 'sync' })
  onScopeDispose(() => { invalidarLista(); ++versaoHistorico; controleHistorico?.abort(); pararRelogio(relogio) })
  return { pesquisa, pagina, selecionada, periodo, lista, serie, moedas, pontos, carregando, carregandoHistorico,
    erro, erroHistorico, listaDesatualizada, historicoDesatualizado, listaExpirada, historicoExpirado,
    buscarMoedas, buscarHistorico, selecionar }
}
