import { computed, reactive, ref } from 'vue'
import { modulos } from '../data/academy/modulos.js'
import { perguntasQuiz } from '../data/academy/quiz.js'
import { simularInvestimento, VALORES_INICIAIS } from '../services/simularInvestimento.js'

// Uma instância por visita; não usa APIs, carteira nem armazenamento do navegador.
export function useAcademy() {
  const area = ref('aprender'), moduloId = ref(null), indiceLicao = ref(0), indiceQuiz = ref(0)
  const respostas = ref({}), formulario = reactive({ ...VALORES_INICIAIS })
  const modulo = computed(() => modulos.find(m => m.id === moduloId.value) || null)
  const licao = computed(() => modulo.value?.licoes[indiceLicao.value] || null)
  const pergunta = computed(() => perguntasQuiz[indiceQuiz.value] || null)
  const finalizado = computed(() => indiceQuiz.value === perguntasQuiz.length)
  const respondidas = computed(() => Object.keys(respostas.value).length)
  const acertos = computed(() => perguntasQuiz.filter(p => respostas.value[p.id] === p.correta).length)
  const simulacao = computed(() => {
    try { return { resultado: simularInvestimento(formulario), erro: '' } }
    catch (e) { return { resultado: null, erro: e.message } }
  })
  function abrirModulo(id) {
    if (!modulos.some(m => m.id === id)) return false
    area.value = 'aprender'; moduloId.value = id; indiceLicao.value = 0
    return true
  }
  function irParaLicao(indice) {
    if (!Number.isInteger(indice) || !modulo.value?.licoes[indice]) return false
    indiceLicao.value = indice; return true
  }
  function responder(indice) {
    const p = pergunta.value
    if (!p || Object.hasOwn(respostas.value, p.id) || !Number.isInteger(indice) || !p.opcoes[indice]) return false
    respostas.value = { ...respostas.value, [p.id]: indice }; return true
  }
  function proximaPergunta() {
    if (!pergunta.value || !Object.hasOwn(respostas.value, pergunta.value.id)) return false
    indiceQuiz.value++; return true
  }
  function reiniciarQuiz() { respostas.value = {}; indiceQuiz.value = 0 }
  function recomeçar() {
    area.value = 'aprender'; moduloId.value = null; indiceLicao.value = 0
    Object.assign(formulario, VALORES_INICIAIS); reiniciarQuiz()
  }
  return { area, moduloId, indiceLicao, modulo, licao, formulario, simulacao, indiceQuiz, pergunta, respostas,
    finalizado, respondidas, acertos, abrirModulo, irParaLicao, responder, proximaPergunta, reiniciarQuiz, recomeçar }
}
