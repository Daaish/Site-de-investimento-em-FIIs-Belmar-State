<script setup>
import BelmarLogo from './BelmarLogo.vue'
import ThemeToggle from './ThemeToggle.vue'
defineProps({ titulo: String, descricao: String })
</script>
<template>
  <main class="auth-layout">
    <aside class="auth-brand">
      <div class="auth-wordmark"><BelmarLogo /><div><strong>BELMAR STATE</strong><small>Investment Intelligence</small></div></div>
      <div class="auth-message"><span>INTELIGÊNCIA PATRIMONIAL</span><h1>Patrimônio construído<br>com inteligência.</h1><p>Uma visão organizada para acompanhar sua jornada de investimento em FIIs.</p></div>
      <small>Plataforma acadêmica · Ambiente de demonstração local</small>
    </aside>
    <section class="auth-content">
      <header class="auth-tools"><RouterLink to="/explorar">Conhecer o Mercado de FIIs →</RouterLink><ThemeToggle /></header>
      <div class="auth-panel"><div class="eyebrow">BELMAR STATE</div><h2>{{ titulo }}</h2><p>{{ descricao }}</p><slot /></div>
      <p class="auth-footnote">Seus dados locais antigos permanecem preservados. Nenhuma importação é feita automaticamente.</p>
    </section>
  </main>
</template>
