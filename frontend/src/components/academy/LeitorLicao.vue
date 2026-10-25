<script setup>
import { nextTick, ref, watch } from 'vue'
const props = defineProps({ modulo: { type: Object, required: true }, indice: { type: Number, required: true } })
defineEmits(['navegar', 'voltar', 'simular'])
const titulo = ref(null)
watch(() => props.indice, async () => { await nextTick(); titulo.value?.focus() })
</script>
<template>
  <div class="academy-reader">
    <aside class="academy-panel lesson-menu"><button class="academy-link" @click="$emit('voltar')">← Todos os módulos</button><h2>{{ modulo.titulo }}</h2>
      <nav aria-label="Lições do módulo"><button v-for="(item, i) in modulo.licoes" :key="item.id" :aria-current="i === indice ? 'step' : undefined" :class="{ selecionada: i === indice }" @click="$emit('navegar', i)"><span>{{ String(i + 1).padStart(2, '0') }}</span>{{ item.titulo }}<small>{{ item.minutos }} min</small></button></nav>
    </aside>
    <article class="academy-panel lesson-content">
      <div class="academy-kicker">LIÇÃO {{ indice + 1 }} DE {{ modulo.licoes.length }} · {{ modulo.licoes[indice].minutos }} MIN DE LEITURA</div>
      <h2 ref="titulo" tabindex="-1">{{ modulo.licoes[indice].titulo }}</h2><p class="lesson-summary">{{ modulo.licoes[indice].resumo }}</p>
      <div class="lesson-example"><span class="academy-kicker">NA PRÁTICA · EXEMPLO EDUCATIVO</span><p>{{ modulo.licoes[indice].exemplo }}</p></div>
      <div class="lesson-highlight"><strong>Para lembrar</strong><p>{{ modulo.licoes[indice].destaque }}</p></div>
      <p class="lesson-question"><strong>Pense um instante</strong><br>{{ modulo.licoes[indice].pergunta }}</p>
      <div class="lesson-actions"><button class="academy-secondary" :disabled="indice === 0" @click="$emit('navegar', indice - 1)">← Anterior</button><span>{{ indice + 1 }} / {{ modulo.licoes.length }}</span><button v-if="indice < modulo.licoes.length - 1" class="academy-primary" @click="$emit('navegar', indice + 1)">Próxima →</button><button v-else class="academy-primary" @click="$emit('voltar')">Explorar módulos →</button></div>
      <button class="academy-link lesson-simulator" @click="$emit('simular')">Experimente o simulador ↗</button>
    </article>
  </div>
</template>
