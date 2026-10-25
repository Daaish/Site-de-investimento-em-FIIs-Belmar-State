const path = require('node:path')
const { Pool } = require('pg')

function carregarAmbienteBanco() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.postgres'), quiet: true })
}

function configuracaoBanco(env = process.env) {
  const host = env.PGHOST || '127.0.0.1'
  const port = Number(env.PGPORT || 5432)
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) throw new Error('O banco demonstrativo deve ser local')
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PGPORT inválida')
  if (!env.PGUSER || !env.PGDATABASE || !env.PGPASSWORD) throw new Error('Configure PGUSER, PGDATABASE e PGPASSWORD em .env.postgres')
  return {
    host, port, database: env.PGDATABASE, user: env.PGUSER, password: env.PGPASSWORD,
    max: 5, connectionTimeoutMillis: 3000, idleTimeoutMillis: 10000,
    statement_timeout: 15000, query_timeout: 20000, application_name: 'belmar-state',
  }
}

// No connection or dependency on the database is introduced into existing HTTP routes.
function criarPool(config = configuracaoBanco()) {
  const pool = new Pool(config)
  pool.on('error', () => { console.error('Conexão PostgreSQL ociosa interrompida.') })
  return pool
}

module.exports = { carregarAmbienteBanco, configuracaoBanco, criarPool }
