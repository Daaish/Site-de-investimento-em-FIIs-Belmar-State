<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
import { useChartTheme } from '../../composables/useChartTheme'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)
const props = defineProps({ pontos: { type: Array, required: true } })
const tema = useChartTheme()
const corPatrimonio = computed(() => {
  tema.value
  return getComputedStyle(document.documentElement).getPropertyValue('--bs-gold-text').trim()
})
const moeda = valor => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dados = computed(() => ({ labels: props.pontos.map(p => `Mês ${p.mes}`), datasets: [
  { label: 'Patrimônio hipotético', data: props.pontos.map(p => p.patrimonio), borderColor: corPatrimonio.value, borderWidth: 3, pointRadius: 0, pointHoverRadius: 4, tension: 0 },
  { label: 'Total aportado', data: props.pontos.map(p => p.aportado), borderColor: tema.value.blue, borderDash: [6, 4], borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, tension: 0 },
] }))
const opcoes = computed(() => ({ responsive: true, maintainAspectRatio: false, animation: false,
  interaction: { mode: 'index', intersect: false }, plugins: { legend: { labels: { color: tema.value.text, boxWidth: 18, font: { size: 11 } } },
    tooltip: { ...tema.value.tooltip, callbacks: { label: ctx => `${ctx.dataset.label}: ${moeda(ctx.parsed.y)}` } } },
  scales: { x: { grid: { display: false }, border: { color: tema.value.border }, ticks: { color: tema.value.text, maxTicksLimit: 6, maxRotation: 0 } },
    y: { beginAtZero: true, grid: { color: tema.value.border }, ticks: { color: tema.value.text, callback: v => Number(v).toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }) }, title: { display: true, text: 'Valores hipotéticos em R$', color: tema.value.text } } } }))
</script>
<template><div class="academy-chart"><Line :data="dados" :options="opcoes" role="img" aria-label="Projeção hipotética em reais: patrimônio e total aportado por mês. Resumo numérico disponível acima do gráfico." /></div></template>
<style scoped>.academy-chart { position: relative; height: 310px; min-width: 0; } @media(max-width: 600px) { .academy-chart { height: 260px; } }</style>
