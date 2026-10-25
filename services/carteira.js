const { randomUUID } = require('node:crypto')
const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i
function falha(status, mensagem) { return Object.assign(new Error(mensagem), { status }) }
function validar(body) {
  if (!body || Array.isArray(body)) throw falha(400, 'Operação inválida.')
  const { tipo, quantidade, preco, data } = body
  const ticker = typeof body.ticker === 'string' ? body.ticker.trim().toUpperCase() : ''
  if (!['compra', 'venda'].includes(tipo) || !/^[A-Z0-9]{5,12}$/.test(ticker) ||
      !Number.isSafeInteger(quantidade) || quantidade <= 0 || !Number.isFinite(preco) || preco <= 0 ||
      !Number.isFinite(quantidade * preco) || typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data) ||
      data < '0001-01-01' || !Number.isFinite(Date.parse(data)) || new Date(data).toISOString().slice(0, 10) !== data) {
    throw falha(400, 'Informe tipo, ticker, quantidade inteira positiva, preço positivo e data válida.')
  }
  return { tipo, ticker, quantidade, preco, data }
}
function validarSaldo(ops) {
  const saldos = new Map()
  for (const op of ops) {
    const saldo = (saldos.get(op.ticker) || 0n) + BigInt(op.quantidade) * (op.tipo === 'compra' ? 1n : -1n)
    if (saldo < 0n) throw falha(409, 'Saldo insuficiente: a operação deixaria uma venda sem cotas disponíveis.')
    if (saldo > BigInt(Number.MAX_SAFE_INTEGER)) throw falha(400, 'Quantidade acumulada excede o limite permitido.')
    saldos.set(op.ticker, saldo)
  }
}
function criarServicoCarteira(obterPool) {
  const listar = async (client, carteira) => (await client.query(`SELECT id, tipo, ticker, quantidade::float8 AS quantidade,
    preco::float8 AS preco, to_char(data, 'YYYY-MM-DD') AS data, ordem::float8 AS ordem
    FROM belmar.operacoes WHERE carteira_id = $1 ORDER BY ordem`, [carteira])).rows
  async function executar(usuario, trabalho, bloquear = false) {
    const client = await obterPool().connect()
    try {
      await client.query('BEGIN')
      const carteira = (await client.query('SELECT id FROM belmar.carteiras WHERE usuario_id = $1' + (bloquear ? ' FOR UPDATE' : ''), [usuario])).rows[0]
      if (!carteira) throw falha(404, 'Carteira não encontrada.')
      const resultado = await trabalho(client, carteira.id)
      await client.query('COMMIT')
      return resultado
    } catch (erro) { try { await client.query('ROLLBACK') } catch {} throw erro }
    finally { client.release() }
  }
  return {
    listar: usuario => executar(usuario, listar),
    adicionar(usuario, body, chave) {
      const dados = validar(body)
      if (!uuid.test(chave || '')) throw falha(400, 'Chave de idempotência inválida.')
      return executar(usuario, async (client, carteira) => {
        const recibo = (await client.query('SELECT dados, operacao FROM belmar.requisicoes_operacoes WHERE carteira_id = $1 AND chave = $2', [carteira, chave])).rows[0]
        if (recibo) {
          if (Object.keys(dados).some(k => dados[k] !== recibo.dados[k])) throw falha(409, 'Chave de idempotência já utilizada para outra operação.')
          return { operacao: recibo.operacao, operacoes: await listar(client, carteira), repetida: true }
        }
        const ops = await listar(client, carteira)
        validarSaldo([...ops, dados])
        const ordem = (ops.at(-1)?.ordem ?? -1) + 1
        if (!Number.isSafeInteger(ordem)) throw falha(409, 'Limite de operações atingido.')
        const operacao = { id: randomUUID(), ...dados, ordem }
        await client.query('INSERT INTO belmar.operacoes (id, carteira_id, tipo, ticker, quantidade, preco, data, ordem) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [operacao.id, carteira, dados.tipo, dados.ticker, dados.quantidade, dados.preco, dados.data, ordem])
        await client.query('INSERT INTO belmar.requisicoes_operacoes (carteira_id, chave, dados, operacao) VALUES ($1,$2,$3,$4)', [carteira, chave, dados, operacao])
        return { operacao, operacoes: [...ops, operacao], repetida: false }
      }, true)
    },
    remover(usuario, id) {
      if (!uuid.test(id || '')) throw falha(400, 'Identificador de operação inválido.')
      return executar(usuario, async (client, carteira) => {
        const ops = await listar(client, carteira)
        if (!ops.some(op => op.id === id)) throw falha(404, 'Operação não encontrada.')
        const restantes = ops.filter(op => op.id !== id)
        validarSaldo(restantes)
        await client.query('DELETE FROM belmar.operacoes WHERE carteira_id = $1 AND id = $2', [carteira, id])
        return restantes
      }, true)
    },
  }
}
module.exports = { criarServicoCarteira, validar, validarSaldo }
