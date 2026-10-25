
<script setup>
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'

import { useChartTheme } from '../composables/useChartTheme'
import { useCarteira } from '../composables/useCarteira'
import { useCotacoes } from '../composables/useCotacoes'

ChartJS.register(ArcElement, Tooltip, Legend)

const chartTheme = useChartTheme()

const { posicoes } = useCarteira()
const { cotacoes } = useCotacoes()

const cores = computed(() => chartTheme.value.palette)

const moeda = valor =>
  Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })

const distribuicao = computed(() =>
  posicoes.value.map(fii => {
    const preco = cotacoes[fii.ticker]?.preco

    return {
      ticker: fii.ticker,
      valor: preco != null ? fii.quantidade * preco : null
    }
  })
)

const completo = computed(() =>
  distribuicao.value.length > 0 &&
  distribuicao.value.every(fii =>
    Number.isFinite(fii.valor) && fii.valor > 0
  )
)

const total = computed(() =>
  completo.value
    ? distribuicao.value.reduce((soma, fii) => soma + fii.valor, 0)
    : 0
)

const dadosGrafico = computed(() => ({
  labels: distribuicao.value.map(fii => fii.ticker),
  datasets: [{
    data: distribuicao.value.map(fii => fii.valor ?? 0),
    backgroundColor: distribuicao.value.map(
      (_, indice) => cores.value[indice % cores.value.length]
    ),
    borderColor: chartTheme.value.surface,
    borderWidth: 3,
    hoverOffset: 8,
  }]
}))

const opcoes = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '73%',
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      ...chartTheme.value.tooltip,
      callbacks: {
        label: contexto =>
          `${contexto.label}: ${moeda(contexto.parsed)}`
      }
    }
  }
}))
</script>

<template>
  <article class="grafico-card">
    <div class="grafico-cabecalho">
      <div>
        <h2>Distribuição da Carteira</h2>
        <p>Participação de cada FII no patrimônio de mercado.</p>
      </div>
      <span class="grafico-tag">Por ativo</span>
    </div>

    <div v-if="completo" class="grafico-conteudo">
      <div class="grafico-container">
        <Doughnut :data="dadosGrafico" :options="opcoes" />

        <div class="grafico-centro">
          <span>Patrimônio</span>
          <strong>{{ moeda(total) }}</strong>
        </div>
      </div>

      <div class="legenda">
        <div
          v-for="(fii, indice) in distribuicao"
          :key="fii.ticker"
          class="legenda-item"
        >
          <span
            class="cor"
            :style="{
              background: cores[indice % cores.length]
            }"
          ></span>

          <span class="ticker">{{ fii.ticker }}</span>

          <strong>
            {{ (fii.valor / total * 100).toFixed(1) }}%
          </strong>
        </div>
      </div>
    </div>

    <div v-else class="grafico-vazio">
      <p v-if="!posicoes.length">
        Cadastre seus primeiros FIIs para visualizar a distribuição.
      </p>
      <p v-else>
        Aguardando todas as cotações para calcular a distribuição.
      </p>
    </div>
  </article>
</template>

<style scoped>
.grafico-card {
  background: var(--bm-surface);
  border: 1px solid var(--bm-border);
  border-radius: var(--bm-radius);
  padding: 26px;
  margin-top: 24px;
}

.grafico-cabecalho {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 15px;
}

.grafico-cabecalho h2 {
  font-size: 23px;
  margin: 0;
}

.grafico-cabecalho p {
  font-size: 13px;
  margin: 6px 0;
}

.grafico-tag {
  background: var(--bm-surface-muted);
  color: var(--bm-text);
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 11px;
}

.grafico-conteudo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 55px;
  padding-top: 25px;
}

.grafico-container {
  width: 290px;
  height: 290px;
  position: relative;
  flex-shrink: 0;
}

.grafico-centro {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  text-align: center;
  pointer-events: none;
}

.grafico-centro span {
  color: var(--bm-text-secondary);
  font-size: 12px;
}

.grafico-centro strong {
  font-size: 19px;
  color: var(--bm-text);
  margin-top: 5px;
}

.legenda {
  flex: 1;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.legenda-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.cor {
  width: 11px;
  height: 11px;
  border-radius: 4px;
}

.ticker { flex: 1; color: var(--bm-text-secondary); }
.legenda-item strong { color: var(--bm-text); }

.grafico-vazio {
  text-align: center;
  padding: 60px 15px;
  color: var(--bm-text-secondary);
}

@media (max-width: 760px) {
  .grafico-conteudo {
    flex-direction: column;
    gap: 25px;
  }

  .grafico-container {
    width: min(100%, 290px);
    height: 290px;
  }

  .legenda { width: 100%; max-width: none; }

  .grafico-card { padding: 17px; }
}

@media (max-width: 760px) {
  .grafico-cabecalho { flex-wrap: wrap; }
  .grafico-cabecalho h2 { font-size: 20px; }
}
</style>
