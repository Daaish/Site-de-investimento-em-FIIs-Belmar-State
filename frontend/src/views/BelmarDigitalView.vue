<script setup>
import { onMounted } from 'vue'
import { useCripto } from '../composables/useCripto'
import ListaCripto from '../components/ListaCripto.vue'
import GraficoCripto from '../components/GraficoCripto.vue'
const { pesquisa, pagina, selecionada, periodo, lista, serie, moedas, pontos, carregando, carregandoHistorico, erro, erroHistorico,
  listaDesatualizada, historicoDesatualizado, listaExpirada, historicoExpirado, buscarMoedas, buscarHistorico, selecionar } = useCripto()
const data = valor => valor ? new Date(valor).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'Não informado'
onMounted(buscarMoedas)
</script>

<template>
  <section class="digital">
    <div class="eyebrow">BELMAR STATE / MERCADOS DIGITAIS</div>
    <header class="digital-hero">
      <div><span class="digital-label">◇ BELMAR DIGITAL</span><h1>Uma nova perspectiva<br>sobre o mercado<span>.</span></h1><p>Explore criptoativos com informação, contexto e clareza.</p></div>
      <div class="hero-note"><span>MOEDA DE REFERÊNCIA</span><strong>BRL <small>Real brasileiro</small></strong><p>Dados de mercado · CoinGecko<br>Consulta independente da sua carteira</p></div>
    </header>

    <article class="digital-panel" :aria-busy="carregandoHistorico">
      <div class="panel-header"><div><span class="digital-label">HISTÓRICO DE PREÇOS · BRL</span><h2>{{ selecionada ? selecionada.nome : 'Selecione um criptoativo' }} <small v-if="selecionada">{{ selecionada.simbolo }}</small></h2></div>
        <div class="periodos" aria-label="Período do gráfico"><button v-for="dias in ['7', '30', '90']" :key="dias" :class="{ ativo: periodo === dias }" :aria-pressed="periodo === dias" @click="periodo = dias">{{ dias }} dias</button></div>
      </div>
      <p v-if="carregandoHistorico" class="status" role="status">Consultando o histórico em reais...</p>
      <div v-else-if="erroHistorico" class="status aviso" role="alert">{{ erroHistorico }} <button @click="buscarHistorico">Tentar novamente</button></div>
      <p v-else-if="historicoExpirado" class="status aviso">O histórico disponível expirou. <button @click="buscarHistorico">Consultar novamente</button></p>
      <p v-else-if="!pontos.length" class="status">{{ selecionada ? 'Sem preços históricos disponíveis para este ativo e período.' : 'Escolha uma moeda na lista para visualizar o gráfico.' }}</p>
      <template v-if="pontos.length && !historicoExpirado">
        <p v-if="historicoDesatualizado" class="aviso" role="status">Histórico desatualizado. Exibindo a última consulta disponível dentro do prazo permitido.</p>
        <GraficoCripto :pontos="pontos" :nome="selecionada?.nome" />
        <div class="chart-footer"><span>Preço em reais · Horários de Brasília</span><span>Última amostra: {{ data(serie?.ultimaAmostraEm) }}</span><button :disabled="carregandoHistorico" @click="buscarHistorico">↻ Consultar histórico</button></div>
      </template>
    </article>

    <article class="digital-panel mercado" :aria-busy="carregando">
      <div class="panel-header"><div><span class="digital-label">PANORAMA DO MERCADO</span><h2>Criptoativos</h2><p>Ordenados por capitalização de mercado.</p></div>
        <div class="pesquisa"><label for="pesquisa-cripto">Pesquisar por nome ou símbolo</label><input id="pesquisa-cripto" v-model="pesquisa" type="search" maxlength="80" placeholder="Bitcoin, Ethereum, BTC..." /><button :disabled="carregando" @click="buscarMoedas">{{ carregando ? 'Consultando...' : '↻ Atualizar' }}</button></div>
      </div>
      <p v-if="pesquisa.trim() && lista?.totalPesquisa > 20" class="nota">Exibindo até 20 resultados da pesquisa. Refine o nome ou símbolo para encontrar outro ativo.</p>
      <p v-if="carregando" class="status" role="status">Carregando criptoativos...</p>
      <div v-else-if="erro" class="status aviso" role="alert">{{ erro }} <button @click="buscarMoedas">Tentar novamente</button></div>
      <p v-else-if="listaExpirada" class="status aviso">Os dados disponíveis expiraram. Consulte o mercado novamente.</p>
      <p v-else-if="lista && !moedas.length" class="status">{{ pesquisa.trim() ? 'Nenhum criptoativo encontrado para esta pesquisa.' : 'A fonte não retornou criptoativos nesta página.' }}</p>
      <template v-if="moedas.length">
        <p v-if="listaDesatualizada" class="aviso" role="status">Dados desatualizados. Última consulta disponível: {{ data(lista.consultadoEm) }}.</p>
        <ListaCripto :moedas="moedas" :selecionada="selecionada?.id" @selecionar="selecionar" />
      </template>
      <footer class="market-footer"><span v-if="lista">Consulta: {{ data(lista.consultadoEm) }} · Atualizações individuais informadas pela fonte.</span>
        <div v-if="!pesquisa.trim()" class="paginacao"><button :disabled="pagina <= 1 || carregando" @click="pagina--">← Anterior</button><span>Página {{ pagina }}</span><button :disabled="!lista?.temMais || carregando" @click="pagina++">Próxima →</button></div>
      </footer>
    </article>
    <footer class="digital-disclosure"><p>Dados fornecidos por <a href="https://www.coingecko.com/" target="_blank" rel="noopener noreferrer">CoinGecko ↗</a>. Informações de mercado em BRL, sujeitas à disponibilidade da fonte.</p><p>Belmar Digital é uma área de consulta. Criptoativos não integram a Carteira Patrimonial.</p></footer>
  </section>
</template>

<style scoped>
.digital { max-width: 1500px; margin: 0 auto; }
.eyebrow, .digital-label { font-size: 10px; letter-spacing: 1.8px; font-weight: 700; color: var(--bm-gold-text); }
.digital-hero { display: flex; align-items: center; justify-content: space-between; gap: 28px; padding: 32px 0 36px; }
h1 { font-size: clamp(30px, 3.7vw, 48px); line-height: 1.2; margin-top: 14px; letter-spacing: -1.5px; }h1 span { color: var(--bm-gold); }
.digital-hero p { font-size: 13px; margin-bottom: 0; }
.hero-note { border-left: 2px solid var(--bm-gold); padding: 12px 0 12px 24px; min-width: 220px; }
.hero-note > span { display: block; font-size: 9px; letter-spacing: 1.3px; color: var(--bm-text-secondary); }.hero-note strong { display: block; font: 700 28px var(--bm-font-heading); margin-top: 10px; }.hero-note small { display: block; font: 400 12px var(--bm-font-interface); color: var(--bm-text-secondary); margin-top: 5px; }.hero-note p { font-size: 11px; }
.digital-panel { border: 1px solid var(--bm-border); border-radius: var(--bm-radius); background: var(--bm-surface); padding: 26px; margin-bottom: 24px; box-shadow: var(--bm-shadow); min-width: 0; }
.panel-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 24px; }h2 { font-size: 23px; margin: 9px 0 0; }h2 small { font-size: 12px; color: var(--bm-text-secondary); font-weight: 500; }.panel-header p { margin-bottom: 0; font-size: 12px; }
button { border: 1px solid var(--bm-border); border-radius: 7px; padding: 9px 13px; background: var(--bm-surface); color: var(--bm-text); font-size: 11px; }button:hover { border-color: var(--bm-gold); }button:disabled { opacity: .5; cursor: not-allowed; }
.periodos { display: flex; gap: 5px; padding: 4px; background: var(--bm-surface-muted); border: 1px solid var(--bm-border); border-radius: 9px; }.periodos button { border-color: transparent; background: transparent; }.periodos button.ativo { background: var(--bm-gold-bg); color: var(--bm-gold-text); border-color: var(--bm-gold); }
.status { text-align: center; padding: 42px 20px; font-size: 13px; }.aviso { color: var(--bm-warning-text); background: var(--bm-warning-bg); border: 1px solid var(--bm-warning-border); border-radius: 8px; padding: 12px 16px; font-size: 12px; }
.chart-footer, .market-footer { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 20px; font-size: 10px; color: var(--bm-text-secondary); }.chart-footer button { padding: 6px 10px; }
.pesquisa { display: grid; grid-template-columns: minmax(180px, 280px) auto; gap: 7px; }.pesquisa label { grid-column: 1 / -1; color: var(--bm-text-secondary); font-size: 10px; }.pesquisa input { min-width: 0; border: 1px solid var(--bm-input-border); border-radius: 7px; padding: 11px 13px; color: var(--bm-text); background: var(--bm-surface); font-size: 12px; }
.paginacao { display: flex; align-items: center; gap: 12px; }.nota { font-size: 11px; }.digital-disclosure { border-top: 1px solid var(--bm-border); padding: 12px 0; }.digital-disclosure p { font-size: 10px; }.digital-disclosure a { color: var(--bm-gold-text); text-decoration: underline; }
@media(max-width: 900px) { .digital-hero { align-items: flex-start; }.hero-note { min-width: 170px; padding-left: 16px; }.digital-panel { padding: 20px; }.pesquisa { width: 100%; grid-template-columns: 1fr auto; } }
@media(max-width: 600px) { .digital-hero { flex-direction: column; padding: 24px 0; }.hero-note { width: 100%; }.digital-panel { padding: 16px; }.panel-header { align-items: flex-start; gap: 16px; }.periodos { width: 100%; }.periodos button { flex: 1; }.chart-footer { align-items: flex-start; flex-direction: column; }.paginacao { width: 100%; justify-content: space-between; } }
</style>
