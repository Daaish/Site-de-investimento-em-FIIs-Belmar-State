/* Runs before styles and Vue. This controller has no API or framework dependency. */
;(function () {
  const key = 'belmar-theme-v1'
  const valid = value => value === 'light' || value === 'dark'
  const listeners = new Set()
  let preference = null
  let media = null
  let theme = 'light'

  try { preference = localStorage.getItem(key) } catch { /* Storage may be blocked. */ }
  if (!valid(preference)) preference = null
  try { media = window.matchMedia?.('(prefers-color-scheme: dark)') } catch { /* Fall back to light. */ }

  function apply(value) {
    theme = value
    document.documentElement.dataset.theme = value
    listeners.forEach(listener => listener(value))
  }

  function followPreference() {
    apply(preference || (media?.matches ? 'dark' : 'light'))
  }

  followPreference()
  const onSystemChange = () => { if (!preference) followPreference() }
  if (media?.addEventListener) media.addEventListener('change', onSystemChange)
  else media?.addListener?.(onSystemChange)

  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return
    preference = valid(event.newValue) ? event.newValue : null
    followPreference()
  })

  window.BelmarTheme = Object.freeze({
    getTheme: () => theme,
    setTheme(value) {
      if (!valid(value)) return
      preference = value
      apply(value)
      try { localStorage.setItem(key, value) } catch { /* Keep the session choice. */ }
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  })
})()
