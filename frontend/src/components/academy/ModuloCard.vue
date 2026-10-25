<script setup>
defineProps({ modulo: { type: Object, required: true } })
defineEmits(['abrir'])
</script>
<template>
  <article class="academy-module">
    <div class="module-top"><span class="module-icon" aria-hidden="true">{{ modulo.icone }}</span><span class="academy-badge">{{ modulo.nivel }}</span></div>
    <h3>{{ modulo.titulo }}</h3><p>{{ modulo.descricao }}</p>
    <footer><span>{{ modulo.licoes.length }} lições · {{ modulo.licoes.reduce((n, l) => n + l.minutos, 0) }} min</span><button class="academy-link" :aria-label="`Abrir módulo ${modulo.titulo}`" @click="$emit('abrir', modulo.id)">Começar →</button></footer>
  </article>
</template>
