
import { ref, computed } from 'vue'
import { criarArmazenamentoUsuario, aoTrocarUsuarioLocal, usuarioLocalAtual } from './armazenamentoUsuario.js'

const CHAVE = 'belmar-historico-patrimonio-v1'
let armazenamento = criarArmazenamentoUsuario()
const LIMITE = 730

function carregarHistorico() {
  try {
    const dados = JSON.parse(armazenamento.getItem(CHAVE) || '[]')

    if (!Array.isArray(dados)) return []

    return dados
      .filter(item =>
        /^\d{4}-\d{2}-\d{2}$/.test(item.data) &&
        Number.isFinite(item.investido) &&
        item.investido >= 0 &&
        Number.isFinite(item.mercado) &&
        item.mercado >= 0
      )
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(-LIMITE)
  } catch {
    return []
  }
}

// Estado compartilhado entre componentes
const historico = ref(carregarHistorico())

function dataLocal() {
  const agora = new Date()

  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')

  return `${ano}-${mes}-${dia}`
}

function registrarSnapshot(investido, mercado, referencias = []) {
  if (
    !Number.isFinite(investido) ||
    !Number.isFinite(mercado) ||
    investido <= 0 ||
    mercado <= 0
  ) {
    return false
  }

  const data = dataLocal()

  const registro = {
    data,
    investido: Number(investido.toFixed(2)),
    mercado: Number(mercado.toFixed(2)),
    registradoEm: new Date().toISOString(),
    referencias,
  }

  const indice = historico.value.findIndex(
    item => item.data === data
  )

  const novos = [...historico.value]

  if (indice >= 0) {
    // Mantém somente o registro mais recente de cada dia.
    novos[indice] = registro
  } else {
    novos.push(registro)
  }

  novos.sort((a, b) => a.data.localeCompare(b.data))

  const limitado = novos.slice(-LIMITE)

  try {
    armazenamento.setItem(CHAVE, JSON.stringify(limitado))
    historico.value = limitado
    return true
  } catch (erro) {
    console.error('Erro ao salvar histórico:', erro)
    return false
  }
}

const primeiroRegistro = computed(() =>
  historico.value[0] ?? null
)

const ultimoRegistro = computed(() =>
  historico.value.at(-1) ?? null
)

aoTrocarUsuarioLocal(() => {
  armazenamento = criarArmazenamentoUsuario()
  historico.value = carregarHistorico()
})

export function useHistoricoPatrimonio() {
  const dono = usuarioLocalAtual()
  return {
    historico,
    primeiroRegistro,
    ultimoRegistro,
    registrarSnapshot: (...args) => dono && dono === usuarioLocalAtual() ? registrarSnapshot(...args) : false,
  }
}
