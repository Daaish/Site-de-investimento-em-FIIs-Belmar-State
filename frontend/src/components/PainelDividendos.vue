
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'

import { useCarteira } from '../composables/useCarteira'

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
)

const { operacoes } = useCarteira()

const CHAVE = 'belmar-proventos-v1'
const ano = ref(new Date().getFullYear())
const proventos = ref([])

const meses = [
  'Jan', 'Fev', 'Mar', 'Abr',
  'Mai', 'Jun', 'Jul', 'Ago',
  'Set', 'Out', 'Nov', 'Dez',
]

const moeda = valor =>
  Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

function carregarProventos() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE) || '[]')
    proventos.value = Array.isArray(dados) ? dados : []
  } catch {
    proventos.value = []
  }
}

function aoAlterarStorage(evento) {
  if (evento.key === CHAVE || evento.key === null) {
    carregarProventos()
  }
}

onMounted(() => {
  carregarProventos()
  window.addEventListener('storage', aoAlterarStorage)
})

onUnmounted(() => {
  window.removeEventListener('storage', aoAlterarStorage)
})

// Verifica as cotas que o investidor possuía na data-com.
// Usa o histórico de operações, não a posição atual.
function calcularCotas(ticker, dataCom) {
  let quantidade = 0

  const historico = operacoes.value
    .map((op, indice) => ({ ...op, indice }))
    .filter(op =>
      op.ticker === ticker &&
      typeof op.data === 'string' &&
      op.data <= dataCom
    )
    .sort((a, b) =>
      a.data.localeCompare(b.data) ||
      a.indice - b.indice
    )

  for (const op of historico) {
    const qtd = Number(op.quantidade)

    if (!Number.isSafeInteger(qtd) || qtd <= 0) continue

    if (op.tipo === 'compra') {
      quantidade += qtd
    } else if (op.tipo === 'venda') {
      quantidade = Math.max(0, quantidade - qtd)
    }
  }

  return quantidade
}

// Os registros precisam conter informações válidas
// e pertencer ao ano selecionado.
const eventosAno = computed(() =>
  proventos.value
    .filter(p =>
      typeof p.ticker === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(p.dataCom) &&
      /^\d{4}-\d{2}-\d{2}$/.test(p.pagamento) &&
      p.pagamento.startsWith(`${ano.value}-`) &&
      ['confirmado', 'estimado'].includes(p.status) &&
      Number.isFinite(Number(p.valor)) &&
      Number(p.valor) > 0
    )
    .map(p => {
      const cotas = calcularCotas(p.ticker, p.dataCom)

      return {
        ...p,
        cotas,
        total: cotas * Number(p.valor),
      }
    })
    .filter(p => p.cotas > 0)
)

// Um objeto por mês, com valores confirmados e estimados.
const resumoMensal = computed(() =>
  meses.map((nome, indice) => {
    const numeroMes = String(indice + 1).padStart(2, '0')

    const eventos = eventosAno.value.filter(
      p => p.pagamento.slice(5, 7) === numeroMes
    )

    return {
      mes: nome,
      confirmados: eventos
        .filter(p => p.status === 'confirmado')
        .reduce((soma, p) => soma + p.total, 0),

      estimados: eventos
        .filter(p => p.status === 'estimado')
        .reduce((soma, p) => soma + p.total, 0),
    }
  })
)

const totalConfirmado = computed(() =>
  resumoMensal.value.reduce(
    (soma, mes) => soma + mes.confirmados, 0
  )
)

const totalEstimado = computed(() =>
  resumoMensal.value.reduce(
    (soma, mes) => soma + mes.estimados, 0
  )
)

const totalGeral = computed(() =>
  totalConfirmado.value + totalEstimado.value
)

// Média distribuída pelos 12 meses do ano selecionado.
// Inclui meses sem proventos cadastrados.
const mediaMensal = computed(() => totalGeral.value / 12)

// Contamos somente meses com proventos elegíveis.
const mesesComProventos = computed(() =>
  resumoMensal.value.filter(
    mes => mes.confirmados + mes.estimados > 0
  ).length
)

// Ranking por FII
const ranking = computed(() => {
  const mapa = {}

  for (const p of eventosAno.value) {
    if (!mapa[p.ticker]) {
      mapa[p.ticker] = {
        ticker: p.ticker,
        confirmado: 0,
        estimado: 0,
        total: 0,
      }
    }

    mapa[p.ticker][
      p.status === 'confirmado' ? 'confirmado' : 'estimado'
    ] += p.total

    mapa[p.ticker].total += p.total
  }

  return Object.values(mapa)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
})

const dadosGrafico = computed(() => ({
  labels: meses,
  datasets: [
    {
      label: 'Confirmados',
      data: resumoMensal.value.map(m => m.confirmados),
      backgroundColor: '#168563',
      borderRadius: 6,
      maxBarThickness: 28,
      stack: 'proventos',
    },
    {
      label: 'Estimados',
      data: resumoMensal.value.map(m => m.estimados),
      backgroundColor: '#C5A46D',
      borderRadius: 6,
      maxBarThickness: 28,
      stack: 'proventos',
    },
  ],
}))

const opcoesGrafico = {
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
        padding: 20,
        usePointStyle: true,
      },
    },
    tooltip: {
      callbacks: {
        label: contexto =>
          `${contexto.dataset.label}: ${moeda(contexto.parsed.y)}`,
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      ticks: { color: '#63758C' },
      grid: { display: false },
    },
    y: {
      stacked: true,
      beginAtZero: true,
      ticks: {
        color: '#63758C',
        callback: valor =>
          Number(valor).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0,
          }),
      },
      grid: { color: '#E1E6ED' },
    },
  },
}

function mudarAno(direcao) {
  ano.value += direcao
}
</script>

<template>
  <article class="dividendos-card">
    <div class="cabecalho">
      <div>
        <h2>Inteligência de Dividendos</h2>
        <p>
          Evolução anual dos proventos atribuídos à sua carteira.
        </p>
      </div>

      <div class="seletor-ano">
        <button @click="mudarAno(-1)" aria-label="Ano anterior">
          ‹
        </button>
        <strong>{{ ano }}</strong>
        <button @click="mudarAno(1)" aria-label="Próximo ano">
          ›
        </button>
      </div>
    </div>

    <div class="indicadores">
      <div class="indicador">
        <span>Total do ano</span>
        <strong>{{ moeda(totalGeral) }}</strong>
        <small>Confirmados + estimados</small>
      </div>

      <div class="indicador">
        <span>Confirmados</span>
        <strong class="verde">{{ moeda(totalConfirmado) }}</strong>
        <small>Conforme registros do calendário</small>
      </div>

      <div class="indicador">
        <span>Estimados</span>
        <strong class="amarelo">{{ moeda(totalEstimado) }}</strong>
        <small>Projeções cadastradas</small>
      </div>

      <div class="indicador">
        <span>Média mensal</span>
        <strong>{{ moeda(mediaMensal) }}</strong>
        <small>Distribuição por 12 meses</small>
      </div>
    </div>

    <template v-if="eventosAno.length">
      <div class="grafico">
        <Bar :data="dadosGrafico" :options="opcoesGrafico" />
      </div>

      <div class="rodape-informacoes">
        <span>
          {{ mesesComProventos }} mês(es) com proventos
        </span>
        <span>
          {{ eventosAno.length }} evento(s) elegível(is)
        </span>
      </div>

      <div class="ranking">
        <h3>FIIs que mais contribuíram</h3>
        <p>Participação nos proventos do ano selecionado.</p>

        <div
          v-for="(fii, indice) in ranking"
          :key="fii.ticker"
          class="ranking-item"
        >
          <div class="ranking-posicao">{{ indice + 1 }}</div>

          <div class="ranking-info">
            <div class="ranking-titulo">
              <strong>{{ fii.ticker }}</strong>
              <span>{{ moeda(fii.total) }}</span>
            </div>

            <div class="barra">
              <div
                :style="{
                  width: totalGeral > 0
                    ? fii.total / totalGeral * 100 + '%'
                    : '0%',
                }"
              ></div>
            </div>

            <small>
              Confirmados: {{ moeda(fii.confirmado) }}
              · Estimados: {{ moeda(fii.estimado) }}
            </small>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="estado-vazio">
      <div>📅</div>
      <h3>Nenhum provento encontrado em {{ ano }}</h3>
      <p>
        Cadastre um provento no Calendário Inteligente.
        O gráfico será atualizado quando você retornar.
      </p>
    </div>

    <p class="nota">
      Os valores usam os registros manuais do calendário e a
      quantidade de cotas calculada na data-com. O status
      "confirmado" não significa pagamento efetivamente recebido
      ou anúncio verificado por uma fonte externa. Compras,
      vendas e eventos corporativos registrados incorretamente
      podem afetar os resultados.
    </p>
  </article>
</template>

<style scoped>
.dividendos-card {
  background: var(--bm-surface);
  border: 1px solid var(--bm-border);
  border-radius: var(--bm-radius);
  padding: 26px;
  margin-top: 24px;
}

.cabecalho {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.cabecalho h2 {
  margin: 0;
  font-size: 23px;
}

.cabecalho p {
  font-size: 13px;
  margin: 7px 0;
}

.seletor-ano {
  display: flex;
  align-items: center;
  gap: 15px;
  background: var(--bm-surface-muted);
  border: 1px solid var(--bm-border);
  border-radius: 9px;
  padding: 5px;
}

.seletor-ano button {
  background: var(--bm-navy-secondary);
  border: 0;
  border-radius: 7px;
  width: 32px;
  height: 32px;
  color: var(--bm-text);
  font-size: 22px;
  cursor: pointer;
}

.seletor-ano strong {
  font-size: 14px;
  min-width: 42px;
  text-align: center;
}

.indicadores {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin: 28px 0;
}

.indicador {
  background: var(--bm-surface-muted);
  border: 1px solid var(--bm-border);
  padding: 18px;
  border-radius: 11px;
  min-width: 0;
}

.indicador span,
.indicador small {
  display: block;
  color: var(--bm-text-secondary);
  font-size: 12px;
}

.indicador strong {
  display: block;
  font-family: var(--bm-font-heading);
  font-size: clamp(19px, 2vw, 26px);
  margin: 12px 0 7px;
  overflow-wrap: anywhere;
}

.indicador .verde { color: var(--bm-positive); }
.indicador .amarelo { color: var(--bm-gold); }

.indicador small {
  font-size: 10px;
}

.grafico {
  height: 340px;
  width: 100%;
  position: relative;
}

.rodape-informacoes {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  color: var(--bm-text-secondary);
  font-size: 12px;
  margin: 15px 0;
}

.ranking {
  border-top: 1px solid var(--bm-border);
  padding-top: 25px;
  margin-top: 25px;
}

.ranking h3 {
  font-size: 19px;
  margin: 0;
}

.ranking > p {
  font-size: 12px;
  margin: 7px 0 20px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 15px;
  margin: 18px 0;
}

.ranking-posicao {
  width: 35px;
  height: 35px;
  background: var(--bm-surface-muted);
  color: var(--bm-text);
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-weight: 700;
  flex-shrink: 0;
}

.ranking-info {
  flex: 1;
  min-width: 0;
}

.ranking-titulo {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  font-size: 13px;
  margin-bottom: 9px;
}

.ranking-titulo span { color: var(--bm-text); }

.barra {
  height: 7px;
  background: var(--bm-border);
  border-radius: 10px;
  overflow: hidden;
}

.barra div {
  height: 100%;
  background: var(--bm-positive);
  border-radius: 10px;
}

.ranking-info small {
  display: block;
  font-size: 10px;
  color: var(--bm-text-secondary);
  margin-top: 6px;
}

.estado-vazio {
  text-align: center;
  padding: 45px 15px;
}

.estado-vazio > div { font-size: 45px; }
.estado-vazio h3 { margin: 12px 0 5px; }
.estado-vazio p { font-size: 13px; }

.nota {
  font-size: 11px;
  color: var(--bm-text-secondary);
  margin: 25px 0 0;
  line-height: 1.6;
}

@media (max-width: 1100px) {
  .indicadores {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .dividendos-card { padding: 17px; }
  .cabecalho { flex-direction: column; }
  .indicadores { grid-template-columns: 1fr; }
  .grafico { height: 270px; }
}
</style>

@media (max-width: 760px) {
  .grafico-cabecalho { flex-wrap: wrap; }
  .grafico-cabecalho h2, .cabecalho h2 { font-size: 20px; }
  .ranking-titulo { flex-wrap: wrap; gap: 5px; }
}
