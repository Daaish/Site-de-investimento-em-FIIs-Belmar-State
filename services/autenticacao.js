const { randomUUID } = require('node:crypto')
const { hashSenha, verificarSenha, hashAusente } = require('./senhas')

function erroAuth(codigo) { const erro = new Error(codigo); erro.code = codigo; return erro }
function validarCredenciais(body, cadastro = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.email !== 'string' ||
      typeof body.senha !== 'string') throw erroAuth('DADOS_INVALIDOS')
  const email = body.email.trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      body.senha.length < 8 || body.senha.length > 128) throw erroAuth('DADOS_INVALIDOS')
  if (cadastro && (typeof body.nome !== 'string' || body.nome.trim().length < 2 || body.nome.trim().length > 120)) {
    throw erroAuth('DADOS_INVALIDOS')
  }
  return { email, senha: body.senha, nome: cadastro ? body.nome.trim() : undefined }
}

function criarServicoAutenticacao(obterPool) {
  async function cadastrar(body) {
    const { nome, email, senha } = validarCredenciais(body, true)
    const senhaHash = await hashSenha(senha)
    const client = await obterPool().connect()
    try {
      await client.query('BEGIN')
      const usuario = (await client.query(
        'INSERT INTO belmar.usuarios (id, nome, email, senha_hash) VALUES ($1, $2, $3, $4) RETURNING id, nome, email',
        [randomUUID(), nome, email, senhaHash],
      )).rows[0]
      const carteira = (await client.query(
        'INSERT INTO belmar.carteiras (id, usuario_id, nome) VALUES ($1, $2, $3) RETURNING id, nome',
        [randomUUID(), usuario.id, 'Carteira Patrimonial'],
      )).rows[0]
      await client.query('COMMIT')
      return { usuario, carteira }
    } catch (erro) {
      try { await client.query('ROLLBACK') } catch { /* Keep the original failure. */ }
      if (erro.code === '23505' && erro.constraint === 'usuarios_email_unico') throw erroAuth('EMAIL_DUPLICADO')
      throw erro
    } finally { client.release() }
  }
  async function login(body) {
    const { email, senha } = validarCredenciais(body)
    const usuario = (await obterPool().query('SELECT id, nome, email, senha_hash FROM belmar.usuarios WHERE email = $1', [email])).rows[0]
    const valido = await verificarSenha(senha, usuario?.senha_hash || hashAusente())
    if (!usuario || !valido) throw erroAuth('LOGIN_INVALIDO')
    return { id: usuario.id, nome: usuario.nome, email: usuario.email }
  }
  async function consultarSessao(usuarioId) {
    const usuario = (await obterPool().query('SELECT id, nome, email FROM belmar.usuarios WHERE id = $1', [usuarioId])).rows[0]
    if (!usuario) return null
    const carteira = (await obterPool().query('SELECT id, nome FROM belmar.carteiras WHERE usuario_id = $1', [usuarioId])).rows[0]
    return { usuario, carteira: carteira || null }
  }
  return { cadastrar, login, consultarSessao }
}
module.exports = { criarServicoAutenticacao, validarCredenciais }
