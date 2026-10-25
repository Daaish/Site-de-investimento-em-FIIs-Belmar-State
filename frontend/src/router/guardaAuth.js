export function criarGuardaAuth(auth) {
  return async to => {
    await auth.restaurarSessao(!to.meta.publica)
    if (to.meta.somenteVisitante && auth.autenticado.value) return { name: 'dashboard' }
    if (!to.meta.publica && !auth.autenticado.value) return { name: 'login' }
    return true
  }
}
