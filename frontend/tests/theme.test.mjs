import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'

const source = readFileSync(new URL('../public/theme-init.js', import.meta.url), 'utf8')
function boot({ saved = null, dark = false, blocked = false, matchMedia = true, legacy = false } = {}) {
  const events = {}
  const store = new Map(saved === null ? [] : [['belmar-theme-v1', saved]])
  const document = { documentElement: { dataset: {} } }
  const media = { matches: dark }
  media[legacy ? 'addListener' : 'addEventListener'] = legacy
    ? callback => { events.system = callback }
    : (_, callback) => { events.system = callback }
  const window = { addEventListener: (event, callback) => { events[event] = callback } }
  if (matchMedia) window.matchMedia = () => media
  const localStorage = {
    getItem(key) { if (blocked) throw Error('blocked'); return store.get(key) ?? null },
    setItem(key, value) { if (blocked) throw Error('blocked'); store.set(key, value) },
  }
  runInNewContext(source, { window, document, localStorage })
  return { controller: window.BelmarTheme, document, store, media, events }
}

test('first visit follows OS, including changes before an explicit choice', () => {
  const app = boot({ dark: true })
  assert.equal(app.document.documentElement.dataset.theme, 'dark')
  app.media.matches = false
  app.events.system()
  assert.equal(app.controller.getTheme(), 'light')
})

test('explicit choice persists across reload and takes precedence over OS', () => {
  const app = boot({ dark: true })
  const notifications = []
  app.controller.subscribe(theme => notifications.push(theme))
  app.controller.setTheme('light')
  assert.equal(app.document.documentElement.dataset.theme, 'light')
  assert.equal(app.store.get('belmar-theme-v1'), 'light')
  app.events.system()
  assert.equal(app.controller.getTheme(), 'light')
  assert.deepEqual(notifications, ['light'])
  assert.equal(boot({ saved: app.store.get('belmar-theme-v1'), dark: true }).controller.getTheme(), 'light')
  assert.deepEqual([...app.store.keys()], ['belmar-theme-v1'])
})

test('storage blocked, missing matchMedia, and invalid values have safe fallbacks', () => {
  const app = boot({ blocked: true, matchMedia: false })
  assert.equal(app.controller.getTheme(), 'light')
  app.controller.setTheme('dark')
  assert.equal(app.controller.getTheme(), 'dark')
  app.controller.setTheme('invalid')
  assert.equal(app.controller.getTheme(), 'dark')
  assert.equal(boot({ saved: 'invalid', dark: true }).controller.getTheme(), 'dark')
})

test('cross-tab updates and clearing preference restore OS behavior', () => {
  const app = boot({ saved: 'light', dark: true, legacy: true })
  app.events.storage({ key: 'belmar-theme-v1', newValue: 'dark' })
  assert.equal(app.controller.getTheme(), 'dark')
  app.events.storage({ key: 'belmar-carteira-v1', newValue: 'ignored' })
  assert.equal(app.controller.getTheme(), 'dark')
  app.events.storage({ key: null, newValue: null })
  app.media.matches = false
  app.events.system()
  assert.equal(app.controller.getTheme(), 'light')
})


test('Vue consumers share the controller state and update immediately', async () => {
  const app = boot({ dark: true })
  const previousWindow = globalThis.window
  globalThis.window = { BelmarTheme: app.controller }
  try {
    const { useTheme } = await import('../src/composables/useTheme.js')
    const first = useTheme()
    const second = useTheme()
    assert.equal(first.isDark.value, true)
    first.toggleTheme()
    assert.equal(second.theme.value, 'light')
    assert.equal(app.document.documentElement.dataset.theme, 'light')
    assert.equal(app.store.get('belmar-theme-v1'), 'light')
  } finally { globalThis.window = previousWindow }
})
