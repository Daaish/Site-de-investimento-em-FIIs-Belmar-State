<script setup>
defineProps({ moedas: { type: Array, default: () => [] }, selecionada: { type: String, default: '' } })
defineEmits(['selecionar'])
const moeda = valor => valor === null ? 'Indisponível' : Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: valor > 0 && valor < 1 ? 8 : 2 })
const percentual = valor => valor === null ? 'Indisponível' : `${valor > 0 ? '+' : ''}${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
const data = valor => valor ? new Date(valor).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'Não informado'
</script>

<template>
  <div class="digital-table-scroll">
    <table>
      <caption class="sr-only">Criptomoedas cotadas em reais. Selecione um ativo para consultar o histórico.</caption>
      <thead><tr><th>Ativo</th><th>Preço (BRL)</th><th>Variação 24h</th><th>Volume 24h (BRL)</th><th>Capitalização (BRL)</th><th>Atualização da fonte</th></tr></thead>
      <tbody>
        <tr v-for="ativo in moedas" :key="ativo.id" :class="{ selecionado: ativo.id === selecionada }">
          <td><button :aria-pressed="ativo.id === selecionada" @click="$emit('selecionar', ativo)"><span class="coin-symbol">{{ ativo.simbolo.slice(0, 3) }}</span><span><strong>{{ ativo.nome }}</strong><small>{{ ativo.simbolo }}</small></span></button></td>
          <td class="preco">{{ moeda(ativo.preco) }}</td>
          <td :class="{ positivo: ativo.variacao24h > 0, negativo: ativo.variacao24h < 0 }">{{ percentual(ativo.variacao24h) }}</td>
          <td>{{ moeda(ativo.volume) }}</td><td>{{ moeda(ativo.capitalizacao) }}</td><td class="data">{{ data(ativo.atualizadoEm) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.digital-table-scroll { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th { color: var(--bm-text-secondary); font-weight: 500; font-size: 10px; text-transform: uppercase; letter-spacing: .6px; }
th, td { padding: 18px 14px; text-align: right; border-bottom: 1px solid var(--bm-border); white-space: nowrap; }
th:first-child, td:first-child { text-align: left; }
tr.selecionado { background: var(--bm-gold-bg); }
tbody tr:hover { background: var(--bm-surface-muted); }
button { display: flex; align-items: center; gap: 12px; border: 0; background: transparent; color: var(--bm-text); text-align: left; padding: 0; }
button strong { display: block; font: 700 13px var(--bm-font-heading); }
small { display: block; margin-top: 4px; color: var(--bm-text-secondary); font-size: 10px; }
.coin-symbol { display: grid; place-items: center; min-width: 36px; height: 36px; border: 1px solid var(--bm-border); border-radius: 50%; background: var(--bm-surface); color: var(--bm-gold-text); font-size: 9px; font-weight: 700; }
.preco { font-weight: 600; font-variant-numeric: tabular-nums; }
.positivo { color: var(--bm-positive); }.negativo { color: var(--bm-negative); }.data { color: var(--bm-text-secondary); font-size: 10px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
</style>
