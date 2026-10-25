import { computed, readonly, ref } from 'vue'

// The early controller also owns OS/storage listeners, so all consumers share one state.
const controller = window.BelmarTheme
const theme = ref(controller.getTheme())
const unsubscribe = controller.subscribe(value => { theme.value = value })
const isDark = computed(() => theme.value === 'dark')

if (import.meta.hot) import.meta.hot.dispose(unsubscribe)

export function useTheme() {
  return {
    theme: readonly(theme),
    isDark,
    toggleTheme: () => controller.setTheme(isDark.value ? 'light' : 'dark'),
  }
}
