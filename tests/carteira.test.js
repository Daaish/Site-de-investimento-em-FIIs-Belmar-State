const { test } = require('node:test')
const assert = require('node:assert/strict')
const { validar, validarSaldo, criarServicoCarteira } = require('../services/carteira')
const compra = { tipo: 'compra', ticker: 'TEST11', quantidade: 5, preco: 10, data: '2026-01-01' }
test('validação de operações rejeita valores inválidos e normaliza ticker', () => {
  assert.equal(validar({ ...compra, ticker: ' test11 ' }).ticker, 'TEST11')
  for (const dados of [null, [], {}, { ...compra, tipo: 'outro' }, { ...compra, ticker: '../' },
    { ...compra, quantidade: 1.5 }, { ...compra, quantidade: '2' }, { ...compra, preco: Infinity },
    { ...compra, preco: -1 }, { ...compra, data: '2026-02-30' }, { ...compra, data: '0000-01-01' }]) {
    assert.throws(() => validar(dados), { status: 400 })
  }
})
test('saldo valida cada prefixo da ordem de registro, inclusive exclusão com saldo final positivo', () => {
  const venda = { ...compra, tipo: 'venda' }
  validarSaldo([compra, venda])
  assert.throws(() => validarSaldo([venda, compra]), { status: 409 })
  assert.throws(() => validarSaldo([compra, { ...venda, quantidade: 6 }, compra]), { status: 409 })
})
test('falha de banco executa rollback e libera conexão', async () => {
  const consultas = []; let liberada = false
  const servico = criarServicoCarteira(() => ({ connect: async () => ({
    query: async sql => { consultas.push(sql); if (sql.startsWith('SELECT id')) throw Error('banco'); return { rows: [] } },
    release: () => { liberada = true },
  }) }))
  await assert.rejects(servico.listar('usuario'))
  assert.deepEqual(consultas.map(sql => sql.split(' ')[0]), ['BEGIN', 'SELECT', 'ROLLBACK'])
  assert.equal(liberada, true)
})
