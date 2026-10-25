
<script setup>
import { computed, ref, watch } from 'vue'
import { useTheme } from './composables/useTheme'
import BelmarLogo from './components/BelmarLogo.vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

const { isDark, toggleTheme } = useTheme()
const menuAberto = ref(false)
const route = useRoute()
const secaoAtual = computed(() => menu.find(item => item.rota === route.path)?.nome || 'Plataforma')
watch(() => route.path, () => { menuAberto.value = false })

const menu = [
  { nome: 'Visão Geral', rota: '/', icone: '◈' },
  { nome: 'Mercado de FIIs', rota: '/explorar', icone: '⌕' },
  { nome: 'Carteira Patrimonial', rota: '/carteira', icone: '▣' },
  { nome: 'Agenda de Proventos', rota: '/calendario', icone: '▦' },
  { nome: 'Jornada do Investidor', rota: '/conquistas', icone: '✦' },
  { nome: 'Perfil do Investidor', rota: '/dna', icone: '◎' },
]
</script>

<template>
  <div class="app-layout" :class="{ 'belmar-dashboard': route.path === '/' }" @keydown.esc="menuAberto = false">
    <button class="mobile-menu" aria-controls="belmar-navigation" :aria-expanded="menuAberto" :aria-label="menuAberto ? 'Fechar navegação' : 'Abrir navegação'" @click="menuAberto = !menuAberto">
      ☰
    </button>

    <button v-if="menuAberto" class="menu-backdrop" aria-label="Fechar navegação" @click="menuAberto = false"></button>
    <aside id="belmar-navigation" class="sidebar" :class="{ aberto: menuAberto }">
      <div class="logo">
        <BelmarLogo />
        <div>
          <h2>BELMAR STATE</h2>
          <span>Investment Intelligence</span>
        </div>
      </div>

      <div class="menu-label">PLATAFORMA</div>

      <nav class="navigation" aria-label="Navegação principal">
        <RouterLink
          v-for="item in menu"
          :key="item.rota"
          :to="item.rota"
          class="nav-item"
          @click="menuAberto = false"
        >
          <span class="nav-icon">{{ item.icone }}</span>
          {{ item.nome }}
        </RouterLink>
      </nav>

      <p class="brand-slogan">Patrimônio construído<br>com inteligência.</p>
      <div class="sidebar-bottom">
        <div class="profile-avatar">IV</div>
        <div>
          <strong>Investidor</strong>
          <small>Conta demonstrativa</small>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <div class="breadcrumb"><span>BELMAR STATE / PLATAFORMA</span><strong>{{ secaoAtual }}</strong></div>
        <div class="topbar-right">
          <button
            class="theme-toggle"
            type="button"
            :aria-label="isDark ? 'Ativar Belmar Light' : 'Ativar Belmar Dark'"
            :title="isDark ? 'Ativar Belmar Light' : 'Ativar Belmar Dark'"
            :aria-pressed="isDark"
            @click="toggleTheme"
          >
            <svg v-if="isDark" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M20.5 14.1A9 9 0 0 1 9.9 3.5a9 9 0 1 0 10.6 10.6Z" />
            </svg>
          </button>
          <span class="demo-indicator">● Ambiente demonstrativo</span>
          <div class="top-avatar">IV</div>
        </div>
      </header>

      <div class="page-content">
        <RouterView />
      </div>
    </main>
  </div>
</template>
