const { test } = require('node:test')
const assert = require('node:assert/strict')
const { mkdtemp, writeFile, rm } = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { configuracaoBanco } = require('../database/conexao')
const { executarMigracoes, lerMigracoes } = require('../database/migrar')

const env = { PGHOST: '127.0.0.1', PGPORT: '5432', PGUSER: 'teste', PGDATABASE: 'teste', PGPASSWORD: 'somente-fixture' }
test('configuração PostgreSQL valida ambiente local sem conexão automática', () => {
  const config = configuracaoBanco(env)
  assert.equal(config.max, 5)
  assert.equal(config.connectionTimeoutMillis, 3000)
  assert.throws(() => configuracaoBanco({ ...env, PGPASSWORD: '' }))
  assert.throws(() => configuracaoBanco({ ...env, PGPORT: '0' }))
  assert.throws(() => configuracaoBanco({ ...env, PGHOST: 'banco-remoto.example' }))
})

test('migrações ordenam arquivos, calculam checksum e rejeitam versões duplicadas', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'belmar-migration-'))
  try {
    await writeFile(path.join(dir, '002_segunda.sql'), 'SELECT 2;')
    await writeFile(path.join(dir, '001_primeira.sql'), 'SELECT 1;')
    const migrations = await lerMigracoes(dir)
    assert.deepEqual(migrations.map(m => m.nome), ['001_primeira.sql', '002_segunda.sql'])
    assert.equal(migrations[0].checksum.length, 64)
    await writeFile(path.join(dir, '001_duplicada.sql'), 'SELECT 3;')
    await assert.rejects(lerMigracoes(dir), { code: 'MIGRACAO_NOME_INVALIDO' })
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('erro SQL executa rollback, libera conexão e não marca migração como aplicada', async () => {
  const calls = []
  let released = false
  const client = {
    query: async (sql, args) => {
      calls.push({ sql, args })
      if (sql.startsWith('SELECT versao')) return { rows: [] }
      if (sql.includes('CREATE SCHEMA')) throw new Error('erro SQL simulado')
      return { rows: [] }
    },
    release: () => { released = true },
  }
  await assert.rejects(executarMigracoes({ connect: async () => client }))
  assert.ok(calls.some(c => c.sql === 'ROLLBACK'))
  assert.ok(!calls.some(c => c.sql.startsWith('INSERT INTO')))
  assert.equal(released, true)
})
