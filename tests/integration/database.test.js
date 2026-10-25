const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { mkdtemp, writeFile, rm } = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const { carregarAmbienteBanco, configuracaoBanco, criarPool } = require('../../database/conexao')
const { executarMigracoes } = require('../../database/migrar')

// Opt-in via npm run test:db. Only the random database created by this test is dropped.
test('PostgreSQL real: conexão, migrações, idempotência, concorrência, checksum e rollback', async () => {
  carregarAmbienteBanco()
  const config = configuracaoBanco()
  const admin = criarPool(config)
  const database = `belmar_test_${randomUUID().replaceAll('-', '')}`
  const dir = await mkdtemp(path.join(os.tmpdir(), 'belmar-db-test-'))
  let pool, created = false
  try {
    await admin.query(`CREATE DATABASE "${database}"`)
    created = true
    pool = criarPool({ ...config, database })
    assert.equal((await pool.query('SELECT 1 AS valor')).rows[0].valor, 1)
    const runs = await Promise.all([executarMigracoes(pool), executarMigracoes(pool)])
    assert.deepEqual(runs.map(r => r.length).sort(), [0, 3])
    assert.deepEqual(await executarMigracoes(pool), [])
    assert.equal((await pool.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'belmar'")).rowCount, 1)
    assert.equal((await pool.query('SELECT * FROM public.belmar_migracoes')).rowCount, 3)
    const tabelas = (await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'belmar' ORDER BY table_name")).rows.map(r => r.table_name)
    assert.deepEqual(tabelas, ['carteiras', 'operacoes', 'requisicoes_operacoes', 'usuarios'])
    const initial = await require('node:fs/promises').readFile(path.join(__dirname, '../../database/migrations/001_criar_schema_belmar.sql'), 'utf8')
    await writeFile(path.join(dir, '001_criar_schema_belmar.sql'), initial)
    await require('node:fs/promises').copyFile(path.join(__dirname, '../../database/migrations/002_modelar_usuarios_carteiras_operacoes.sql'), path.join(dir, '002_modelar_usuarios_carteiras_operacoes.sql'))
    await require('node:fs/promises').copyFile(path.join(__dirname, '../../database/migrations/003_idempotencia_operacoes.sql'), path.join(dir, '003_idempotencia_operacoes.sql'))
    await writeFile(path.join(dir, '004_falha.sql'), 'CREATE TABLE public.belmar_rollback_probe (id INTEGER); SELECT coluna_inexistente;')
    await assert.rejects(executarMigracoes(pool, { diretorio: dir }))
    assert.equal((await pool.query("SELECT to_regclass('public.belmar_rollback_probe') AS tabela")).rows[0].tabela, null)
    assert.equal((await pool.query('SELECT * FROM public.belmar_migracoes')).rowCount, 3)
    await writeFile(path.join(dir, '001_criar_schema_belmar.sql'), initial + '\n-- alteração indevida\n')
    await assert.rejects(executarMigracoes(pool, { diretorio: dir }), { code: 'MIGRACAO_APLICADA_DIVERGENTE' })
  } finally {
    if (pool) await pool.end()
    try { if (created) await admin.query(`DROP DATABASE "${database}"`) }
    finally {
      await admin.end()
      await rm(dir, { recursive: true, force: true })
    }
  }
})
