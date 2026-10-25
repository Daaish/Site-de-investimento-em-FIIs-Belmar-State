// Presentation isolation for the local demo, not a replacement for backend authorization.
// Legacy keys are deliberately never read, copied, changed or removed.
let usuarioId = null
const ouvintes = new Set()
export function usuarioLocalAtual() { return usuarioId }
export function definirUsuarioLocal(id) {
  const novo = typeof id === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id) ? id : null
  if (novo === usuarioId) return
  usuarioId = novo
  ouvintes.forEach(fn => fn())
}
export function aoTrocarUsuarioLocal(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn) }
export function criarArmazenamentoUsuario() {
  const dono = usuarioId
  const key = chave => dono ? `belmar-demo-v1:${dono}:${chave}` : null
  return {
    key,
    getItem(chave) {
      if (!dono || dono !== usuarioId) return null
      try { return localStorage.getItem(key(chave)) } catch { return null }
    },
    setItem(chave, valor) {
      if (!dono || dono !== usuarioId) return
      localStorage.setItem(key(chave), valor)
    },
  }
}
