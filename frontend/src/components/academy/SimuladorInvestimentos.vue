<script setup>
import GraficoSimulacao from './GraficoSimulacao.vue'
import { LIMITES_SIMULADOR } from '../../services/simularInvestimento.js'
defineProps({ formulario: { type: Object, required: true }, simulacao: { type: Object, required: true } })
defineEmits(['alterar'])
const campos = [
  { id: 'inicial', label: 'Investimento inicial (R$)', ajuda: 'O valor no início da experiência.', min: 0, max: LIMITES_SIMULADOR.valorMaximo, step: 0.01 },
  { id: 'aporte', label: 'Aporte mensal (R$)', ajuda: 'Adicionado ao fim de cada mês.', min: 0, max: LIMITES_SIMULADOR.valorMaximo, step: 0.01 },
  { id: 'anos', label: 'Prazo (anos)', ajuda: 'De 1 a 50 anos completos.', min: 1, max: 50, step: 1 },
  { id: 'taxaAnual', label: 'Rentabilidade anual hipotética (%)', ajuda: 'De −99,99% a 100%. Experimente também uma perda.', min: -99.99, max: 100, step: 0.01 },
]
const moeda = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
function alterar(id, valor) { return { id, valor: valor === '' ? '' : Number(valor) } }
</script>
<template>
  <section aria-labelledby="simulator-title">
    <div class="academy-section-heading"><div><span class="academy-kicker">EXPERIMENTE SEM ARRISCAR DINHEIRO</span><h2 id="simulator-title">O que o tempo pode mudar?</h2><p>Altere os valores e observe a diferença entre aportar e render.</p></div><span class="academy-badge">Cenário hipotético · BRL</span></div>
    <div class="academy-simulator">
      <form class="academy-panel simulator-form" @submit.prevent>
        <div v-for="campo in campos" :key="campo.id" class="academy-field"><label :for="`academy-${campo.id}`">{{ campo.label }}</label><input :id="`academy-${campo.id}`" :value="formulario[campo.id]" type="number" :min="campo.min" :max="campo.max" :step="campo.step" required :aria-describedby="`ajuda-${campo.id}`" :aria-invalid="!!simulacao.erro" @input="$emit('alterar', alterar(campo.id, $event.target.value))" /><small :id="`ajuda-${campo.id}`">{{ campo.ajuda }}</small></div>
        <p class="simulator-method">Taxa anual efetiva convertida para mensal. Juros calculados antes do aporte do mês; rendimentos permanecem aplicados.</p>
      </form>
      <div class="academy-panel simulator-results">
        <p v-if="simulacao.erro" class="academy-warning" role="alert">{{ simulacao.erro }}</p>
        <template v-else>
          <div class="simulator-numbers" aria-live="polite" aria-atomic="true"><div class="simulator-total"><span>Patrimônio projetado · hipotético</span><strong>{{ moeda(simulacao.resultado.patrimonio) }}</strong></div><div><span>Total aportado</span><strong>{{ moeda(simulacao.resultado.totalAportado) }}</strong></div><div :class="{ 'simulator-loss': simulacao.resultado.rendimento < 0 }"><span>{{ simulacao.resultado.rendimento < 0 ? 'Perda hipotética' : 'Rendimento hipotético' }}</span><strong>{{ moeda(simulacao.resultado.rendimento) }}</strong></div></div>
          <GraficoSimulacao :pontos="simulacao.resultado.pontos" />
          <details class="simulator-details"><summary>Como esta conta funciona?</summary><p>Taxa mensal = (1 + taxa anual ÷ 100) elevado a 1/12, menos 1. Saldo do mês = saldo anterior × (1 + taxa mensal) + aporte.</p><p>Taxa mensal deste cenário: {{ (simulacao.resultado.taxaMensal * 100).toLocaleString('pt-BR', { maximumFractionDigits: 6 }) }}%. O gráfico começa no mês zero. Valores são arredondados apenas na exibição.</p></details>
        </template>
      </div>
    </div>
    <p class="academy-warning">Simulação educativa, sem garantia de rentabilidade e sem recomendação de investimento. Taxas são hipotéticas e constantes. Não considera impostos, taxas, inflação ou oscilações de mercado. Valores projetados não são cotações nem resultados reais.</p>
  </section>
</template>
