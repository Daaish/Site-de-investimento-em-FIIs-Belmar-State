<script setup>
import { ref, watch, nextTick } from 'vue'
import { perguntasQuiz } from '../../data/academy/quiz.js'
const props = defineProps({ pergunta: { type: Object, default: null }, indice: { type: Number, required: true }, respostas: { type: Object, required: true }, acertos: { type: Number, required: true }, finalizado: Boolean })
defineEmits(['responder', 'proxima', 'reiniciar'])
const titulo = ref(null)
watch(() => props.indice, async () => { await nextTick(); titulo.value?.focus() })
</script>
<template>
  <section class="academy-quiz" aria-labelledby="quiz-title"><div class="academy-section-heading"><div><span class="academy-kicker">APRENDER TAMBÉM É EXPERIMENTAR</span><h2 id="quiz-title">Um desafio, uma descoberta</h2><p>12 perguntas. Sem cadastro, sem pressa e com explicação a cada resposta.</p></div></div>
    <div class="academy-panel quiz-card">
      <template v-if="finalizado"><span class="academy-kicker">EXPERIÊNCIA CONCLUÍDA</span><h3 ref="titulo" tabindex="-1">Você acertou {{ acertos }} de {{ perguntasQuiz.length }} perguntas.</h3><p>O mais importante é entender as explicações. Revise o que quiser e continue aprendendo.</p>
        <details v-for="item in perguntasQuiz" :key="item.id" class="quiz-review"><summary>{{ respostas[item.id] === item.correta ? '✓' : '↗' }} {{ item.titulo }}</summary><p>Sua resposta: {{ item.opcoes[respostas[item.id]] }}</p><p><strong>Resposta correta: {{ item.opcoes[item.correta] }}</strong></p><p>{{ item.explicacao }}</p></details>
        <button class="academy-primary" @click="$emit('reiniciar')">Tentar o quiz novamente →</button>
      </template>
      <template v-else-if="pergunta"><div class="quiz-progress"><span>Questão {{ indice + 1 }} de {{ perguntasQuiz.length }}</span><span>{{ acertos }} {{ acertos === 1 ? 'acerto' : 'acertos' }}</span></div><progress :value="indice" :max="perguntasQuiz.length" aria-label="Perguntas concluídas" />
        <h3 ref="titulo" tabindex="-1">{{ pergunta.titulo }}</h3>
        <div class="quiz-options" role="group" :aria-label="pergunta.titulo"><button v-for="(opcao, i) in pergunta.opcoes" :key="`${pergunta.id}-${i}`" :disabled="Object.hasOwn(respostas, pergunta.id)" :class="{ correta: Object.hasOwn(respostas, pergunta.id) && i === pergunta.correta, incorreta: respostas[pergunta.id] === i && i !== pergunta.correta }" @click="$emit('responder', i)"><span aria-hidden="true">{{ String.fromCharCode(65 + i) }}</span>{{ opcao }}<strong v-if="Object.hasOwn(respostas, pergunta.id) && i === pergunta.correta">✓ Correta</strong></button></div>
        <div v-if="Object.hasOwn(respostas, pergunta.id)" class="quiz-feedback" role="status" aria-live="polite"><strong>{{ respostas[pergunta.id] === pergunta.correta ? 'Isso mesmo!' : 'Vamos entender juntos.' }}</strong><p>{{ pergunta.explicacao }}</p><button class="academy-primary" @click="$emit('proxima')">{{ indice === perguntasQuiz.length - 1 ? 'Ver resultado →' : 'Próxima pergunta →' }}</button></div>
      </template>
    </div>
  </section>
</template>
