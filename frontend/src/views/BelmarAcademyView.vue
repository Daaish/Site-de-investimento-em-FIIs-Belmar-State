<script setup>
import { ref, nextTick } from 'vue'
import { useAcademy } from '../composables/useAcademy'
import { modulos, fontesAcademy } from '../data/academy/modulos'
import ModuloCard from '../components/academy/ModuloCard.vue'
import LeitorLicao from '../components/academy/LeitorLicao.vue'
import SimuladorInvestimentos from '../components/academy/SimuladorInvestimentos.vue'
import QuizFinanceiro from '../components/academy/QuizFinanceiro.vue'
import '../styles/academy.css'
const { area, moduloId, indiceLicao, modulo, formulario, simulacao, indiceQuiz, pergunta, respostas, finalizado, acertos,
  abrirModulo, irParaLicao, responder, proximaPergunta, reiniciarQuiz, recomeçar } = useAcademy()
const conteudo = ref(null), inicio = ref(null), mensagem = ref('')
async function focarConteudo() { await nextTick(); conteudo.value?.focus() }
function navegar(destino) { area.value = destino; mensagem.value = ''; focarConteudo() }
function abrir(id) { abrirModulo(id); mensagem.value = ''; focarConteudo() }
async function reiniciarExperiencia() { recomeçar(); mensagem.value = 'Experiência reiniciada. Valores iniciais restaurados e respostas apagadas.'; await nextTick(); inicio.value?.focus() }
function alterarCampo({ id, valor }) { if (Object.hasOwn(formulario, id)) formulario[id] = valor }
</script>
<template>
  <section class="academy">
    <div class="academy-kicker">BELMAR STATE / EDUCAÇÃO FINANCEIRA</div>
    <header class="academy-hero"><div><span class="academy-badge">Conhecimento para começar</span><h1 ref="inicio" tabindex="-1">Belmar Academy<span>.</span></h1><p>Seu primeiro passo pode ser uma pergunta.<br>Aprenda, experimente e descubra no seu ritmo.</p>
      <div class="academy-hero-actions"><button class="academy-primary" @click="navegar('simular')">Experimente o simulador ↗</button><button class="academy-secondary" @click="navegar('quiz')">Teste seus conhecimentos →</button></div>
    </div><div class="academy-hero-note"><span class="academy-kicker">APRENDER FAZ PARTE DO PLANO</span><strong>4 módulos<br><span>21 pequenas descobertas</span></strong><p>Sem login. Sem dinheiro real.<br>Com espaço para experimentar.</p></div></header>
    <div class="academy-navigation"><nav aria-label="Áreas da Belmar Academy"><button v-for="item in [{ id: 'aprender', texto: '01 · Aprender' }, { id: 'simular', texto: '02 · Simular' }, { id: 'quiz', texto: '03 · Praticar' }]" :key="item.id" :aria-current="area === item.id ? 'page' : undefined" :class="{ ativo: area === item.id }" @click="navegar(item.id)">{{ item.texto }}</button></nav><button class="academy-reset" @click="reiniciarExperiencia">↻ Recomeçar experiência</button></div>
    <p v-if="mensagem" class="academy-reset-status" role="status">{{ mensagem }}</p>
    <div ref="conteudo" class="academy-content" tabindex="-1">
      <template v-if="area === 'aprender'">
        <LeitorLicao v-if="modulo" :modulo="modulo" :indice="indiceLicao" @navegar="irParaLicao" @voltar="moduloId = null; focarConteudo()" @simular="navegar('simular')" />
        <template v-else><div class="academy-section-heading"><div><span class="academy-kicker">ESCOLHA SEU PONTO DE PARTIDA</span><h2>Pequenos conceitos. Novas perspectivas.</h2><p>Não precisa seguir uma ordem. Comece pelo tema que desperta sua curiosidade.</p></div></div><div class="academy-modules"><ModuloCard v-for="item in modulos" :key="item.id" :modulo="item" @abrir="abrir" /></div>
          <div class="academy-invitation"><div><h3>E se você separasse um pouco por mês?</h3><p>Mude valores, tempo e taxas. Veja como cada escolha altera um cenário hipotético.</p></div><button class="academy-primary" @click="navegar('simular')">Experimente o simulador ↗</button></div></template>
      </template>
      <SimuladorInvestimentos v-else-if="area === 'simular'" :formulario="formulario" :simulacao="simulacao" @alterar="alterarCampo" />
      <QuizFinanceiro v-else :pergunta="pergunta" :indice="indiceQuiz" :respostas="respostas" :acertos="acertos" :finalizado="finalizado" @responder="responder" @proxima="proximaPergunta" @reiniciar="reiniciarQuiz" />
    </div>
    <footer class="academy-footer"><p>Conteúdo educativo. Exemplos e simulações são hipotéticos; não são cotações, garantias de retorno ou recomendações de investimento. Nenhum valor desta área modifica sua carteira.</p><details><summary>Fontes para continuar aprendendo</summary><ul><li v-for="fonte in fontesAcademy" :key="fonte.url"><a :href="fonte.url" target="_blank" rel="noopener noreferrer">{{ fonte.titulo }} ↗</a></li></ul></details><p>Para o próximo visitante, use “Recomeçar experiência”. Ao sair desta página ou recarregá-la, a atividade também é reiniciada. Nenhuma resposta é salva.</p></footer>
  </section>
</template>
