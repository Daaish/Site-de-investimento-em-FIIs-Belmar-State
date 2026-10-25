import { computed } from 'vue'
import { useTheme } from './useTheme'

export function useChartTheme() {
  const { theme } = useTheme()
  return computed(() => {
    // Root CSS is changed synchronously before the shared reactive theme is notified.
    theme.value
    const styles = getComputedStyle(document.documentElement)
    const color = name => styles.getPropertyValue(`--bs-${name}`).trim()
    return {
      text: color('text-secondary'),
      border: color('border'),
      surface: color('surface'),
      positive: color('positive'),
      blue: color('chart-blue'),
      fill: color('chart-fill'),
      gold: styles.getPropertyValue('--bm-gold').trim(),
      palette: ['positive', 'chart-blue', 'chart-purple', null, 'negative', 'chart-teal', 'chart-brown', 'chart-gray']
        .map(name => name ? color(name) : styles.getPropertyValue('--bm-gold').trim()),
      tooltip: {
        backgroundColor: color('tooltip-bg'),
        titleColor: color('tooltip-text'),
        bodyColor: color('tooltip-text'),
        borderColor: color('border'),
        borderWidth: 1,
      },
    }
  })
}
