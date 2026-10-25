<script setup>
import { useTheme } from '../composables/useTheme'
const { isDark, toggleTheme } = useTheme()
</script>
<template>
  <button class="theme-toggle" type="button" :aria-label="isDark ? 'Ativar Belmar Light' : 'Ativar Belmar Dark'" :title="isDark ? 'Ativar Belmar Light' : 'Ativar Belmar Dark'" :aria-pressed="isDark" @click="toggleTheme">
    <svg v-if="isDark" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
    </svg>
    <svg v-else viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7">
      <path d="M20.5 14.1A9 9 0 0 1 9.9 3.5a9 9 0 1 0 10.6 10.6Z" />
    </svg>
  </button>
</template>
