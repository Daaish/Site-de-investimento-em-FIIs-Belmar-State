import { computed, readonly, ref } from 'vue'
import { definirUsuarioLocal, usuarioLocalAtual } from './armazenamentoUsuario.js'

export const EVENTO_AUTH = 'belmar-auth-event-v1'
export function criarAutenticacao({ requisitar = (...args) => fetch(...args) } = {}) {
  const usuario = ref(null), carteira = ref(null), carregando = ref(false), verificando = ref(false), inicializado = ref(false), erro = ref('')
  let verificacao, versao = 0, reverDepois = false
  function aplicar(dados) {
    definirUsuarioLocal(dados?.usuario?.id || null)
    if (dados?.usuario && usuarioLocalAtual() !== dados.usuario.id) throw Error('Sessão inválida')
    usuario.value = dados?.usuario || null
    carteira.value = dados?.carteira || null
  }
  function notificar() {
    try { localStorage.setItem(EVENTO_AUTH, `${Date.now()}:${Math.random()}`) } catch { /* Cross-tab events are optional. */ }
  }
  async function request(path, body) {
    return requisitar(`/api/auth/${path}`, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'include', signal: AbortSignal.timeout(10000),
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    })
  }
  function restaurarSessao(forcar = false) {
    if (verificacao && !forcar) return verificacao
    if (inicializado.value && !forcar) return Promise.resolve(usuario.value)
    if (carregando.value) { reverDepois = true; verificando.value = true; return Promise.resolve(usuario.value) }
    const atual = ++versao
    verificando.value = true
    const trabalho = (async () => {
      try {
        const resposta = await request('me')
        if (atual !== versao) return usuario.value
        if (resposta.status === 401) { aplicar(null); return null }
        if (!resposta.ok) throw Error('sessao')
        const dados = await resposta.json()
        if (atual === versao) { aplicar(dados); erro.value = '' }
        return usuario.value
      } catch {
        if (atual === versao) { aplicar(null); erro.value = 'Não foi possível verificar sua sessão. Confira a conexão e tente novamente.' }
        return null
      } finally {
        if (atual === versao) { inicializado.value = true; verificando.value = false }
      }
    })()
    const promessa = trabalho.finally(() => { if (verificacao === promessa) verificacao = null })
    verificacao = promessa
    return promessa
  }
  async function executar(tipo, dados) {
    if (carregando.value || verificando.value) return false
    carregando.value = true
    erro.value = ''
    ++versao
    try {
      const resposta = await request(tipo, dados)
      if (!resposta.ok) {
        const mensagens = {
          400: 'Confira os campos. Use um e-mail válido e uma senha de 8 a 128 caracteres.',
          401: 'E-mail ou senha inválidos.', 409: 'Este e-mail já está cadastrado. Entre com sua conta.',
          503: 'O serviço está temporariamente indisponível. Tente novamente.',
        }
        erro.value = mensagens[resposta.status] || 'Não foi possível concluir a solicitação.'
        return false
      }
      if (tipo === 'login') { aplicar(await resposta.json()); notificar() }
      if (tipo === 'logout') { aplicar(null); notificar() }
      inicializado.value = true
      return true
    } catch {
      erro.value = 'Falha de conexão. Confira se o backend está ativo e tente novamente.'
      return false
    } finally {
      carregando.value = false
      if (reverDepois) { reverDepois = false; restaurarSessao(true) }
    }
  }
  return {
    usuario: readonly(usuario), carteira: readonly(carteira), carregando: readonly(carregando), verificando: readonly(verificando),
    inicializado: readonly(inicializado), erro: readonly(erro), autenticado: computed(() => !!usuario.value),
    restaurarSessao, entrar: dados => executar('login', dados), cadastrar: dados => executar('cadastro', dados), sair: () => executar('logout', {}),
    limparErro: () => { erro.value = '' },
  }
}
const auth = criarAutenticacao()
export function useAuth() { return auth }

// A session cookie is shared by tabs. Revalidate when another tab logs in/out or the app regains focus.
if (typeof window !== 'undefined' && window.addEventListener) {
  const atualizar = () => auth.restaurarSessao(true)
  const storage = e => { if (e.key === EVENTO_AUTH || e.key === null) atualizar() }
  window.addEventListener('focus', atualizar)
  window.addEventListener('storage', storage)
  if (import.meta.hot) import.meta.hot.dispose(() => {
    window.removeEventListener('focus', atualizar)
    window.removeEventListener('storage', storage)
  })
}
