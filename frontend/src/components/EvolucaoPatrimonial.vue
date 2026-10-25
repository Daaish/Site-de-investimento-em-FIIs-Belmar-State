
<script setup>
import { ref, computed, watch } from 'vue'
import { Line } from 'vue-chartjs'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

import { useCarteira } from '../composables/useCarteira'
import {
  buscarHistoricos,
  reconstruirHistorico,
} from '../services/reconstruirHistorico'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
)

const { operacoes } = useCarteira()

const carregando = ref(false)
const erro = ref('')
const falhas = ref([])
const alertas = ref([])
const pontos = ref([])
const historicos = ref({})

const intervalo = ref('todos')
const modoGrafico = ref('patrimonio')

const moeda = valor =>
  Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

const dataBR = data =>
  data?.split('-').reverse().join('/') || '—'

const tickersHistoricos = computed(() =>
  [...new Set(
    operacoes.value.map(op =>
      String(op.ticker || '').toUpperCase()
    ).filter(Boolean)
  )].sort()
)

let versaoConsulta = 0

async function atualizarHistorico() {
  const versao = ++versaoConsulta

  erro.value = ''
  falhas.value = []
  alertas.value = []

  if (!tickersHistoricos.value.length) {
    pontos.value = []
    return
  }

  carregando.value = true

  try {
    const resultado = await buscarHistoricos(
      tickersHistoricos.value
    )

    if (versao !== versaoConsulta) return

    historicos.value = resultado.historicos
    falhas.value = resultado.falhas

    const reconstrucao = reconstruirHistorico(
      operacoes.value,
      historicos.value
    )

    pontos.value = reconstrucao.pontos
    alertas.value = reconstrucao.alertas

    if (!pontos.value.length) {
      erro.value =
        'Não foi possível reconstruir o patrimônio com os históricos disponíveis.'
    }
  } catch (e) {
    if (versao !== versaoConsulta) return
    erro.value = e.message
    pontos.value = []
  } finally {
    if (versao === versaoConsulta) {
      carregando.value = false
    }
  }
}

// Busca na API apenas quando muda o conjunto de tickers.
// Alterações de quantidade ou preço da operação
// recalculam a série sem precisar consultar novamente.
watch(
  tickersHistoricos,
  () => atualizarHistorico(),
  { immediate: true }
)

watch(
  operacoes,
  () => {
    const resultado = reconstruirHistorico(
      operacoes.value,
      historicos.value
    )

    pontos.value = resultado.pontos
    alertas.value = resultado.alertas
  },
  { deep: true }
)

const pontosFiltrados = computed(() => {
  if (intervalo.value === 'todos') return pontos.value
  if (!pontos.value.length) return []

  const ultimo = pontos.value.at(-1).data
  const [ano, mes, dia] = ultimo.split('-').map(Number)

  const limite = new Date(ano, mes - 1, dia)

  if (intervalo.value === '1m') {
    limite.setMonth(limite.getMonth() - 1)
  } else if (intervalo.value === '3m') {
    limite.setMonth(limite.getMonth() - 3)
  } else if (intervalo.value === '1a') {
    limite.setFullYear(limite.getFullYear() - 1)
  }

  const limiteISO = [
    limite.getFullYear(),
    String(limite.getMonth() + 1).padStart(2, '0'),
    String(limite.getDate()).padStart(2, '0'),
  ].join('-')

  return pontos.value.filter(p => p.data >= limiteISO)
})

const primeiro = computed(() => pontosFiltrados.value[0] ?? null)
const ultimo = computed(() => pontosFiltrados.value.at(-1) ?? null)

const resultadoAtual = computed(() =>
  ultimo.value
    ? ultimo.value.mercado - ultimo.value.investido
    : null
)


const dadosGrafico = computed(() => {
  const datas = pontosFiltrados.value.map(p => dataBR(p.data))

  if (modoGrafico.value === 'desempenho') {
    return {
      labels: datas,
      datasets: [
        {
          label: 'Desempenho acumulado (%)',
          data: pontosFiltrados.value.map(p => p.desempenho),
          borderColor: '#168563',
          backgroundColor: 'rgba(22,133,99,0.07)',
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.15,
          fill: true,
        },
      ],
    }
  }

  return {
    labels: datas,
    datasets: [
      {
        label: 'Capital investido',
        data: pontosFiltrados.value.map(p => p.investido),
        borderColor: '#526F94',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.15,
        fill: false,
      },
      {
        label: 'Valor de mercado',
        data: pontosFiltrados.value.map(p => p.mercado),
        borderColor: '#168563',
        backgroundColor: 'rgba(22,133,99,0.05)',
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.15,
        fill: true,
      },
    ],
  }
})



const opcoes = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#63758C',
        usePointStyle: true,
        padding: 20,
      },
    },
    tooltip: {
      callbacks: {
        label: ctx => {
          if (modoGrafico.value === 'desempenho') {
            return `Desempenho: ${ctx.parsed.y.toFixed(2)}%`
          }

          return `${ctx.dataset.label}: ${moeda(ctx.parsed.y)}`
        },
      },
    },
  },
  scales: {
    x: {
      ticks: {
        color: '#63758C',
        maxTicksLimit: 9,
        maxRotation: 0,
      },
      grid: { display: false },
    },
    y: {
      ticks: {
        color: '#63758C',
        callback: valor => {
          if (modoGrafico.value === 'desempenho') {
            return `${Number(valor).toFixed(1)}%`
          }

          return Number(valor).toLocaleString('pt-BR', {
            notation: 'compact',
            maximumFractionDigits: 1,
          })
        },
      },
      grid: { color: '#E1E6ED' },
    },
  },
}))

</script>

<template>
  <article class="historico-card">
    <div class="cabecalho">
      <div>
        <h2>Evolução Patrimonial</h2>
        <p>
          Reconstrução histórica com operações e preços
          de fechamento dos FIIs.
        </p>
      </div>

      <button
        class="atualizar"
        :disabled="carregando"
        @click="atualizarHistorico"
      >
        {{ carregando ? 'Consultando...' : '↻ Atualizar histórico' }}
      </button>
    </div>


    
<div class="seletor-modo">
  <button
    :class="{ ativo: modoGrafico === 'patrimonio' }"
    @click="modoGrafico = 'patrimonio'"
  >
    ◈ Patrimônio (R$)
  </button>

  <button
    :class="{ ativo: modoGrafico === 'desempenho' }"
    @click="modoGrafico = 'desempenho'"
  >
    ↗ Desempenho (%)
  </button>
</div>

    <div class="filtros">
      <button
        v-for="opcao in [
          { id: '1m', nome: '1 mês' },
          { id: '3m', nome: '3 meses' },
          { id: '1a', nome: '1 ano' },
          { id: 'todos', nome: 'Tudo' },
        ]"
        :key="opcao.id"
        :class="{ ativo: intervalo === opcao.id }"
        @click="intervalo = opcao.id"
      >
        {{ opcao.nome }}
      </button>
    </div>

    <div v-if="carregando" class="mensagem">
      Buscando preços históricos dos seus FIIs...
    </div>

    <template v-if="pontosFiltrados.length">
      <div class="resumo">
        <div>
          <span>Início do histórico disponível</span>
          <strong>{{ dataBR(primeiro.data) }}</strong>
        </div>

        <div>
          <span>Último pregão disponível</span>
          <strong>{{ dataBR(ultimo.data) }}</strong>
        </div>

        <div>
          
<span>
  {{
    modoGrafico === 'desempenho'
      ? 'Desempenho acumulado'
      : 'Resultado não realizado'
  }}
</span>

          <strong
            :class="{
  positivo: modoGrafico === 'desempenho'
    ? ultimo.desempenho > 0
    : resultadoAtual > 0,
  negativo: modoGrafico === 'desempenho'
    ? ultimo.desempenho < 0
    : resultadoAtual < 0,
}"
          >
            {{
  modoGrafico === 'desempenho'
    ? `${ultimo.desempenho >= 0 ? '+' : ''}${ultimo.desempenho.toFixed(2)}%`
    : moeda(resultadoAtual)
}}
          </strong>
        </div>
      </div>

      <div class="grafico">
        <Line :data="dadosGrafico" :options="opcoes" />
      </div>

      <div class="informacoes">
        <span>{{ pontosFiltrados.length }} pregões</span>
        <span>{{ tickersHistoricos.length }} FIIs no histórico</span>
        <span>Fonte: brapi.dev</span>
      </div>
    </template>

    <div v-else-if="!carregando" class="estado-vazio">
      <div>📈</div>
      <h3>Sem histórico disponível</h3>
      <p>
        {{ erro || 'Cadastre operações para visualizar o gráfico.' }}
      </p>
    </div>

    <div v-if="falhas.length" class="aviso">
      <strong>Históricos indisponíveis:</strong>
      <p v-for="falha in falhas" :key="falha">{{ falha }}</p>
    </div>

    <div v-if="alertas.length" class="aviso">
      <p v-for="alerta in alertas" :key="alerta">{{ alerta }}</p>
    </div>

    <p class="nota">
      O gráfico utiliza fechamentos históricos disponíveis e
      o custo das posições reconstruídas. Não inclui dividendos,
      taxas, impostos ou resultados realizados nas vendas.
      Os valores não são uma rentabilidade ajustada por aportes.
      Eventos corporativos, como desdobramentos e amortizações,
      ainda exigem tratamento específico. A reconstrução pode
      começar depois da primeira compra se faltarem cotações.
      Os snapshots diários existentes permanecem preservados.
    </p>
  </article>
</template>

<style scoped>
.historico-card {
  background: var(--bm-surface);
  border: 1px solid var(--bm-border);
  border-radius: var(--bm-radius);
  padding: 26px;
  margin-top: 24px;
}

.cabecalho {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.cabecalho h2 {
  font-size: 23px;
  margin: 0;
}

.cabecalho p {
  font-size: 13px;
  margin: 7px 0;
}

.atualizar {
  background: var(--bm-navy);
  color: var(--bm-surface);
  border: 1px solid var(--bm-navy);
  border-radius: 9px;
  padding: 11px 16px;
  cursor: pointer;
}

.atualizar:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.filtros {
  display: flex;
  gap: 8px;
  margin: 23px 0;
}

.filtros button {
  border: 1px solid var(--bm-border);
  background: var(--bm-surface);
  color: var(--bm-text-secondary);
  padding: 9px 14px;
  border-radius: 8px;
  cursor: pointer;
}

.filtros button.ativo {
  background: var(--bm-navy-secondary);
  border-color: var(--bm-navy-secondary);
  color: var(--bm-surface);
}

.resumo {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 25px;
}

.resumo > div {
  background: var(--bm-surface-muted);
  border: 1px solid var(--bm-border);
  padding: 18px;
  border-radius: 10px;
}

.resumo span {
  display: block;
  color: var(--bm-text-secondary);
  font-size: 12px;
  margin-bottom: 10px;
}

.resumo strong {
  font-size: 21px;
}

.positivo { color: var(--bm-positive); }
.negativo { color: var(--bm-negative); }

.grafico {
  height: 355px;
  width: 100%;
  position: relative;
}

.informacoes {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  color: var(--bm-text-secondary);
  font-size: 12px;
  margin-top: 18px;
}

.mensagem,
.estado-vazio {
  text-align: center;
  color: var(--bm-text-secondary);
  padding: 40px 15px;
}

.estado-vazio > div {
  font-size: 45px;
}

.estado-vazio h3 {
  margin: 12px 0 5px;
}

.aviso {
  background: var(--bm-warning-bg);
  border: 1px solid var(--bm-warning-border);
  color: var(--bm-warning-text);
  border-radius: 9px;
  padding: 14px;
  margin-top: 18px;
  font-size: 12px;
}

.aviso p { margin: 5px 0; color: inherit; }

.nota {
  font-size: 11px;
  color: var(--bm-text-secondary);
  margin: 24px 0 0;
  line-height: 1.6;
}

@media (max-width: 760px) {
  .historico-card { padding: 17px; }
  .cabecalho { flex-direction: column; }
  .resumo { grid-template-columns: 1fr; }
  .grafico { height: 280px; }
  .filtros { flex-wrap: wrap; }
}


.seletor-modo {
  display: flex;
  width: fit-content;
  gap: 6px;
  padding: 5px;
  margin-top: 25px;
  border: 1px solid var(--bm-border);
  background: var(--bm-surface-muted);
  border-radius: 11px;
}

.seletor-modo button {
  border: 0;
  background: transparent;
  color: var(--bm-text-secondary);
  padding: 12px 19px;
  border-radius: 8px;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  transition: .2s;
}

.seletor-modo button:hover {
  color: var(--bm-text);
}

.seletor-modo button.ativo {
  background: var(--bm-navy-secondary);
  color: var(--bm-surface);
}

@media (max-width: 760px) {
  .seletor-modo {
    width: 100%;
  }

  .seletor-modo button {
    flex: 1;
    padding: 11px 8px;
    font-size: 11px;
  }
}

</style>

@media (max-width: 760px) {
  .grafico-cabecalho { flex-wrap: wrap; }
  .grafico-cabecalho h2, .cabecalho h2 { font-size: 20px; }
  .ranking-titulo { flex-wrap: wrap; gap: 5px; }
}
