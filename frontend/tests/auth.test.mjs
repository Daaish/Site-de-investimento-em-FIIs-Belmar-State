import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { ref } from 'vue'
import { parse as parseSfc, compileTemplate } from '@vue/compiler-sfc'
import { criarAutenticacao } from '../src/composables/useAuth.js'
import { criarGuardaAuth } from '../src/router/guardaAuth.js'
import { definirUsuarioLocal } from '../src/composables/armazenamentoUsuario.js'

const A = { id: '00000000-0000-4000-8000-000000000001', nome: 'Conta A', email: 'a@example.com' }
const B = { id: '00000000-0000-4000-8000-000000000002', nome: 'Conta B', email: 'b@example.com' }
const require = createRequire(import.meta.url)
const { parse } = require('@babel/parser')
function app(t, requisitar) {
  t.after(() => definirUsuarioLocal(null))
  return criarAutenticacao({ requisitar })
}

test('cadastro não inicia sessão; login/me/logout usam cookie e restauração após F5', async t => {
  let logged = false
  const calls = []
  const fetch = async (url, options) => {
    calls.push({ url, options })
    if (url.endsWith('/cadastro')) return Response.json({ usuario: A }, { status: 201 })
    if (url.endsWith('/login')) { logged = true; return Response.json({ usuario: A }) }
    if (url.endsWith('/logout')) { logged = false; return new Response(null, { status: 204 }) }
    return logged ? Response.json({ usuario: A, carteira: { id: 'carteira-a' } }) : new Response(null, { status: 401 })
  }
  const auth = app(t, fetch)
  assert.equal(await auth.cadastrar({ nome: A.nome, email: A.email, senha: 'fixture-123' }), true)
  assert.equal(auth.autenticado.value, false)
  assert.equal(await auth.entrar({ email: A.email, senha: 'fixture-123' }), true)
  assert.equal(auth.usuario.value.id, A.id)
  const recarregado = app(t, fetch)
  await Promise.all([recarregado.restaurarSessao(), recarregado.restaurarSessao()])
  assert.equal(recarregado.usuario.value.id, A.id)
  assert.equal(calls.filter(c => c.url.endsWith('/me')).length, 1)
  assert.equal(await recarregado.sair(), true)
  assert.equal(recarregado.usuario.value, null)
  assert.ok(calls.every(c => c.options.credentials === 'include'))
})

test('senha incorreta, e-mail duplicado e falha de rede têm mensagens claras', async t => {
  let status = 401
  const auth = app(t, async () => { if (!status) throw Error('network'); return new Response(null, { status }) })
  assert.equal(await auth.entrar({}), false)
  assert.match(auth.erro.value, /E-mail ou senha inválidos/)
  status = 409
  assert.equal(await auth.cadastrar({}), false)
  assert.match(auth.erro.value, /já está cadastrado/)
  status = 0
  assert.equal(await auth.entrar({}), false)
  assert.match(auth.erro.value, /conexão/)
})

test('não envia login duplicado e logout não confirmado não finge encerrar sessão', async t => {
  let finish, count = 0
  const auth = app(t, () => { count++; return new Promise(resolve => { finish = resolve }) })
  const pending = auth.entrar({})
  assert.equal(await auth.entrar({}), false)
  assert.equal(count, 1)
  finish(Response.json({ usuario: A }))
  await pending
  const logout = auth.sair()
  finish(new Response(null, { status: 503 }))
  assert.equal(await logout, false)
  assert.equal(auth.usuario.value.id, A.id)
})

test('guardas protegem páginas privadas, deixam catálogo público e redirecionam autenticado', async t => {
  let logged = false
  const auth = app(t, async () => logged ? Response.json({ usuario: A }) : new Response(null, { status: 401 }))
  const guard = criarGuardaAuth(auth)
  assert.deepEqual(await guard({ meta: {} }), { name: 'login' })
  assert.equal(await guard({ meta: { publica: true } }), true)
  assert.equal(await guard({ meta: { publica: true, somenteVisitante: true } }), true)
  logged = true
  await auth.restaurarSessao(true)
  assert.equal(await guard({ meta: {} }), true)
  assert.deepEqual(await guard({ meta: { publica: true, somenteVisitante: true } }), { name: 'dashboard' })
})

test('verificação antiga não reapresenta outra conta após troca de sessão', async t => {
  const requests = []
  const auth = app(t, () => new Promise(resolve => requests.push(resolve)))
  const older = auth.restaurarSessao()
  const newer = auth.restaurarSessao(true)
  requests[1](Response.json({ usuario: B }))
  await newer
  requests[0](Response.json({ usuario: A }))
  await older
  assert.equal(auth.usuario.value.id, B.id)
})

function view(name, auth, router) {
  let code = parseSfc(readFileSync(new URL(`../src/views/${name}.vue`, import.meta.url), 'utf8')).descriptor.scriptSetup.content
  for (const node of parse(code, { sourceType: 'module' }).program.body.reverse()) {
    if (node.type === 'ImportDeclaration') code = code.slice(0, node.start) + code.slice(node.end)
  }
  return new Function('ref', 'useAuth', 'useRouter', `${code}\nreturn { email, senha, enviar, ${name === 'CadastroView' ? 'nome, confirmacao, erroLocal' : ''} }`)(ref, () => auth, () => router)
}

test('formulários: confirmação protege cadastro e navegação segue cadastro/login/dashboard', async () => {
  const paths = [], requests = []
  const auth = { cadastrar: async data => { requests.push(data); return true }, entrar: async data => { requests.push(data); return true } }
  const router = { replace: async path => { paths.push(path) } }
  const cadastro = view('CadastroView', auth, router)
  cadastro.senha.value = 'fixture-123'; cadastro.confirmacao.value = 'outra-senha'
  await cadastro.enviar()
  assert.equal(requests.length, 0)
  assert.match(cadastro.erroLocal.value, /não coincidem/)
  cadastro.confirmacao.value = 'fixture-123'; cadastro.nome.value = A.nome; cadastro.email.value = A.email
  await cadastro.enviar()
  assert.deepEqual(paths[0], { name: 'login', query: { cadastro: 'ok' } })
  assert.equal(cadastro.senha.value, '')
  const login = view('LoginView', auth, router)
  login.email.value = A.email; login.senha.value = 'fixture-123'
  await login.enviar()
  assert.deepEqual(paths[1], { name: 'dashboard' })
})

test('templates compilam, têm prevenção de envio duplo e tema/monograma compartilhados', () => {
  for (const name of ['views/LoginView', 'views/CadastroView', 'components/AuthLayout', 'components/ThemeToggle', 'App']) {
    const source = readFileSync(new URL(`../src/${name}.vue`, import.meta.url), 'utf8')
    const template = parseSfc(source).descriptor.template.content
    assert.deepEqual(compileTemplate({ source: template, filename: name, id: 'auth-view-test' }).errors, [])
    if (name.includes('View')) assert.match(template, /:disabled="auth.carregando.value/)
    if (name.endsWith('AuthLayout')) { assert.match(template, /<ThemeToggle/); assert.match(template, /<BelmarLogo/); }
  }
})

test('rotas Vue reais: sessão expirada redireciona, catálogo continua público e login autenticado vai ao dashboard', async t => {
  const { createRouter, createMemoryHistory } = await import('vue-router')
  let logged = false
  const auth = app(t, async () => logged ? Response.json({ usuario: A }) : new Response(null, { status: 401 }))
  let source = readFileSync(new URL('../src/router/index.js', import.meta.url), 'utf8')
  const dependencies = { createRouter, createWebHistory: createMemoryHistory, criarGuardaAuth, useAuth: () => auth }
  const ast = parse(source, { sourceType: 'module' })
  for (const node of ast.program.body) if (node.type === 'ImportDeclaration') {
    for (const spec of node.specifiers) dependencies[spec.local.name] ??= { render: () => null }
  }
  for (const node of [...ast.program.body].reverse()) if (node.type === 'ImportDeclaration') source = source.slice(0, node.start) + source.slice(node.end)
  source = source.replace('export default router', 'return router')
  const router = new Function(...Object.keys(dependencies), source)(...Object.values(dependencies))
  await router.push('/')
  assert.equal(router.currentRoute.value.name, 'login')
  await router.push('/explorar')
  assert.equal(router.currentRoute.value.name, 'explorar')
  logged = true
  await auth.entrar({})
  await router.push('/login')
  assert.equal(router.currentRoute.value.name, 'dashboard')
  logged = false
  await router.push('/carteira')
  assert.equal(router.currentRoute.value.name, 'login')
})
