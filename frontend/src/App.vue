
<script setup>
import { computed, ref, watch } from 'vue'
import { useAuth } from './composables/useAuth'
import ThemeToggle from './components/ThemeToggle.vue'
import BelmarLogo from './components/BelmarLogo.vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

import { useCarteira } from './composables/useCarteira'
const { carregada: carteiraCarregada, carregando: carteiraCarregando, erro: carteiraErro, carregar: carregarCarteira, temPendente, confirmarPendente, salvando: carteiraSalvando } = useCarteira()
const auth = useAuth()
const router = useRouter()
const { usuario, carregando: authOcupada, verificando, erro: erroAuth } = auth
const iniciais = computed(() => usuario.value?.nome?.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'BS')
async function sair() { if (await auth.sair()) await router.replace({ name: 'login' }) }
watch(verificando, () => {
  if (verificando.value || !route.name) return
  if (!usuario.value && !route.meta.publica) router.replace({ name: 'login' })
  else if (usuario.value && route.meta.somenteVisitante) router.replace({ name: 'dashboard' })
})
const menuAberto = ref(false)
const route = useRoute()
const secaoAtual = computed(() => menu.find(item => item.rota === route.path)?.nome || 'Plataforma')
watch(() => route.path, () => { menuAberto.value = false })

const menu = [
  { nome: 'Visão Geral', rota: '/', icone: '◈' },
  { nome: 'Belmar Digital', rota: '/digital', icone: '◇' },
  { nome: 'Mercado de FIIs', rota: '/explorar', icone: '⌕' },
  { nome: 'Carteira Patrimonial', rota: '/carteira', icone: '▣' },
  { nome: 'Agenda de Proventos', rota: '/calendario', icone: '▦' },
  { nome: 'Jornada do Investidor', rota: '/conquistas', icone: '✦' },
  { nome: 'Perfil do Investidor', rota: '/dna', icone: '◎' },
]
</script>

<template>
  <RouterView v-if="route.meta.authPage" :key="route.name" />
  <div v-else class="app-layout" :class="{ 'belmar-dashboard': route.path === '/' }" @keydown.esc="menuAberto = false">
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
        <div class="profile-avatar">{{ iniciais }}</div>
        <div>
          <strong>{{ usuario?.nome || 'Visitante' }}</strong>
          <small>{{ usuario ? 'Conta local demonstrativa' : 'Mercado de FIIs público' }}</small>
        </div>
      </div>
      <button v-if="usuario" class="logout-button" :disabled="authOcupada" @click="sair">{{ authOcupada ? 'Saindo...' : 'Sair da conta' }}</button>
      <RouterLink v-else to="/login" class="logout-button">Entrar na plataforma</RouterLink>
      <p v-if="erroAuth && usuario" class="sidebar-error" role="alert">{{ erroAuth }}</p>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <div class="breadcrumb"><span>BELMAR STATE / PLATAFORMA</span><strong>{{ secaoAtual }}</strong></div>
        <div class="topbar-right">
          <ThemeToggle />
          <span class="demo-indicator">● Ambiente demonstrativo</span>
          <div class="top-avatar">{{ iniciais }}</div>
        </div>
      </header>

      <div class="page-content">
        <p v-if="usuario && !route.meta.publica" class="local-data-notice">Ambiente demonstrativo por usuário. Os dados antigos deste navegador estão preservados e não foram importados. Compras e vendas são salvas no PostgreSQL da sua conta. Proventos e perfil continuam neste navegador.</p>
        <p v-if="verificando && !route.meta.publica" role="status">Verificando sessão...</p>
        <div v-if="route.meta.publica || usuario" v-show="!verificando || route.meta.publica">
          <div v-if="!route.meta.publica && !carteiraCarregada" role="status" class="local-data-notice">
            <template v-if="carteiraCarregando">Carregando sua carteira...</template>
            <template v-else>{{ carteiraErro || 'Aguardando carregamento da carteira.' }} <button @click="carregarCarteira">Tentar novamente</button></template>
          </div>
          <div v-if="!route.meta.publica && carteiraCarregada && (carteiraErro || temPendente)" class="local-data-notice" role="alert">
            {{ carteiraErro }}
            <template v-if="temPendente">Existe uma operação aguardando confirmação. <button :disabled="carteiraSalvando" @click="confirmarPendente">Confirmar operação pendente</button></template>
            <button v-else :disabled="carteiraCarregando || carteiraSalvando" @click="carregarCarteira">Atualizar carteira</button>
          </div>
          <RouterView v-if="route.meta.publica || carteiraCarregada" :key="route.meta.publica ? 'publico' : usuario?.id || 'publico'" />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.logout-button { margin-top: 16px; padding: 11px; background: var(--bm-navy-secondary); color: var(--bm-gold); border: 1px solid var(--bm-sidebar-border); border-radius: 8px; font: inherit; font-size: 12px; text-align: center; }
.logout-button:disabled { opacity: .6; cursor: not-allowed; }
.sidebar-error { font-size: 11px; color: var(--bm-sidebar-text); }
.sidebar-bottom strong { overflow-wrap: anywhere; }
.sidebar-bottom > div:last-child { min-width: 0; }
.local-data-notice { background: var(--bm-info-bg); border: 1px solid var(--bm-border); padding: 12px 16px; border-radius: 9px; font-size: 11px; margin: 0 0 24px; color: var(--bm-text); }
</style>
