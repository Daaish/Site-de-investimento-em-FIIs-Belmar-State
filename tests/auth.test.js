const { test } = require('node:test')
const assert = require('node:assert/strict')
const { hashSenha, verificarSenha } = require('../services/senhas')
const { validarCredenciais } = require('../services/autenticacao')

test('scrypt assíncrono: salts distintos, verificação correta e hash inválido rejeitado', async () => {
  const a = await hashSenha('Senha-fixture-123')
  const b = await hashSenha('Senha-fixture-123')
  assert.notEqual(a, b)
  assert.ok(!a.includes('Senha-fixture-123'))
  assert.equal(await verificarSenha('Senha-fixture-123', a), true)
  assert.equal(await verificarSenha('outra-senha', a), false)
  assert.equal(await verificarSenha('Senha-fixture-123', 'hash-invalido'), false)
})

test('validação normaliza e-mail, limita tamanho e não aceita tipos arbitrários', () => {
  const dados = validarCredenciais({ nome: ' Teste ', email: ' TESTE@EXAMPLE.COM ', senha: 'Senha123!' }, true)
  assert.equal(dados.email, 'teste@example.com')
  assert.equal(dados.nome, 'Teste')
  for (const body of [null, [], {}, { email: ['a@b.com'], senha: 'Senha123!' }, { email: 'a@b.com', senha: 'x' }, { email: 'a@b.com', senha: 'x'.repeat(129) }]) {
    assert.throws(() => validarCredenciais(body), { code: 'DADOS_INVALIDOS' })
  }
})
