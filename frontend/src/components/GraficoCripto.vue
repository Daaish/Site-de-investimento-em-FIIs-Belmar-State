<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js'
import { useChartTheme } from '../composables/useChartTheme'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)
const props = defineProps({ pontos: { type: Array, default: () => [] }, nome: { type: String, default: '' } })
const tema = useChartTheme()
const formatarData = tempo => new Date(tempo).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const moeda = valor => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: valor > 0 && valor < 1 ? 8 : 2 })
const dados = computed(() => ({ labels: props.pontos.map(p => formatarData(p.tempo)), datasets: [{ label: `${props.nome} · Preço em BRL`, data: props.pontos.map(p => p.preco),
  borderColor: tema.value.gold, backgroundColor: tema.value.fill, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, fill: true, tension: 0.1 }] }))
const opcoes = computed(() => ({ responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false },
  plugins: { legend: { display: false }, tooltip: { ...tema.value.tooltip, callbacks: { label: ctx => moeda(ctx.parsed.y) } } },
  scales: { x: { grid: { display: false }, ticks: { color: tema.value.text, maxTicksLimit: 6, maxRotation: 0 }, border: { color: tema.value.border } },
    y: { grid: { color: tema.value.border }, ticks: { color: tema.value.text, callback: valor => moeda(valor) }, border: { display: false } } } }))
</script>
<template><div class="grafico-cripto"><Line :data="dados" :options="opcoes" :aria-label="`Histórico de preços de ${nome} em reais`" role="img" /></div></template>
<style scoped>.grafico-cripto { height: 320px; position: relative; min-width: 0; } @media(max-width: 600px) { .grafico-cripto { height: 250px; } }</style>
