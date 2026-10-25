const { carregarAmbienteBanco, configuracaoBanco, criarPool } = require('../database/conexao')
const { executarMigracoes } = require('../database/migrar')

async function main() {
  let pool
  try {
    carregarAmbienteBanco()
    pool = criarPool(configuracaoBanco())
    if (process.argv[2] === 'migrate') {
      const aplicadas = await executarMigracoes(pool)
      console.log(aplicadas.length ? `Migrações aplicadas: ${aplicadas.join(', ')}` : 'Banco atualizado; nenhuma migração pendente.')
    } else if (process.argv[2] === 'check') {
      await pool.query('SELECT 1 AS conexao')
      console.log('Conexão PostgreSQL confirmada.')
    } else {
      throw new Error('Comando de banco inválido')
    }
  } catch (erro) {
    // Never print raw driver messages, URLs, configuration or credentials.
    const codigo = typeof erro.code === 'string' && /^[A-Z0-9_]+$/.test(erro.code) ? erro.code : 'CONFIGURACAO'
    console.error(`Falha no comando de banco (${codigo}). Confira o serviço PostgreSQL e .env.postgres.`)
    process.exitCode = 1
  } finally {
    if (pool) await pool.end()
  }
}
main()
