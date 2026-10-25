const fs = require('node:fs/promises')
const path = require('node:path')
const { createHash } = require('node:crypto')

function falha(codigo) {
  const erro = new Error(codigo)
  erro.code = codigo
  return erro
}

async function lerMigracoes(diretorio) {
  const arquivos = (await fs.readdir(diretorio)).filter(nome => nome.endsWith('.sql')).sort()
  const versoes = new Set()
  return Promise.all(arquivos.map(async nome => {
    if (!/^\d{3}_[a-z0-9_]+\.sql$/.test(nome) || versoes.has(nome.slice(0, 3))) throw falha('MIGRACAO_NOME_INVALIDO')
    versoes.add(nome.slice(0, 3))
    const sql = await fs.readFile(path.join(diretorio, nome), 'utf8')
    return { nome, sql, checksum: createHash('sha256').update(sql).digest('hex') }
  }))
}

async function executarMigracoes(pool, { diretorio = path.join(__dirname, 'migrations') } = {}) {
  const migracoes = await lerMigracoes(diretorio)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query("SET LOCAL lock_timeout = '5s'")
    // One transactional lock serializes concurrent migration runners.
    await client.query('SELECT pg_advisory_xact_lock($1)', [18423017])
    await client.query(`CREATE TABLE IF NOT EXISTS public.belmar_migracoes (
      versao TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      aplicada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
    const aplicadas = (await client.query('SELECT versao, checksum FROM public.belmar_migracoes ORDER BY versao')).rows
    for (let i = 0; i < aplicadas.length; i++) {
      if (migracoes[i]?.nome !== aplicadas[i].versao || migracoes[i]?.checksum !== aplicadas[i].checksum) {
        throw falha('MIGRACAO_APLICADA_DIVERGENTE')
      }
    }
    const novas = migracoes.slice(aplicadas.length)
    for (const migracao of novas) {
      await client.query(migracao.sql)
      await client.query('INSERT INTO public.belmar_migracoes (versao, checksum) VALUES ($1, $2)', [migracao.nome, migracao.checksum])
    }
    await client.query('COMMIT')
    return novas.map(m => m.nome)
  } catch (erro) {
    try { await client.query('ROLLBACK') } catch { /* Preserve the original failure. */ }
    throw erro
  } finally {
    client.release()
  }
}
module.exports = { executarMigracoes, lerMigracoes }
