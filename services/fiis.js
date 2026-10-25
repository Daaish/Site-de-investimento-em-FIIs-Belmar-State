const fs = require('node:fs')
const path = require('node:path')
const { normalizarTicker, listarFiis } = require('./cotacoes')
const { normalizarParametrosCatalogo } = require('./parametrosCatalogo')

// Loaded once, independently of quotes. Legacy financial references are never imported.
const cadastro = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'fiis.json'), 'utf8'))
const codigos = new Set()
for (const fii of cadastro) {
  if (normalizarTicker(fii.codigo) !== fii.codigo || codigos.has(fii.codigo) ||
      typeof fii.tipo !== 'string' || !fii.tipo.trim() || typeof fii.setor !== 'string' || !fii.setor.trim()) {
    throw new Error('Cadastro de FIIs inválido')
  }
  codigos.add(fii.codigo)
}

function buscarFiis({ tipo, min_dy } = {}) {
  if (tipo !== undefined && typeof tipo !== 'string') throw new Error('Tipo inválido')
  let minimo = null
  if (min_dy !== undefined) {
    if (typeof min_dy !== 'string' || !min_dy.trim() || !Number.isFinite(Number(min_dy)) || Number(min_dy) < 0) {
      throw new Error('DY mínimo inválido')
    }
    minimo = Number(min_dy)
  }
  // No verified DY is available. Do not silently satisfy a positive threshold with legacy data.
  if (minimo > 0) return []
  return cadastro
    .filter(fii => !tipo || fii.tipo.toLowerCase().includes(tipo.toLowerCase()))
    .map(({ codigo, tipo, setor }) => ({ codigo, tipo, setor, dy: null, preco: null }))
}

function criarCatalogoDinamico({ listar = listarFiis } = {}) {
  return async function consultarCatalogo(query = {}) {
    const parametros = normalizarParametrosCatalogo(query)
    try {
      const dados = await listar(parametros)
      return { ...dados, estado: dados.desatualizado ? 'desatualizado' : 'atualizado', motivo: null }
    } catch (erro) {
      // Auth/invalid responses never reuse old financial data; fallback is explicitly local.
      const lista = buscarFiis().filter(f =>
        f.codigo.includes(parametros.search) || f.setor.toUpperCase().includes(parametros.search)
      ).sort((a, b) => parametros.sortBy === 'name' && parametros.sortOrder === 'desc'
        ? b.codigo.localeCompare(a.codigo) : a.codigo.localeCompare(b.codigo))
      const totalPages = Math.ceil(lista.length / parametros.limit)
      const page = Math.min(parametros.page, Math.max(1, totalPages))
      const motivos = { TOKEN_AUSENTE: 'configuracao', RESPOSTA_INVALIDA: 'resposta_invalida', LIMITE_BRAPI: 'limite_temporario' }
      const motivo = [401, 403].includes(erro.statusFonte) ? 'acesso_indisponivel' : motivos[erro.codigo] || 'fonte_indisponivel'
      return {
        itens: lista.slice((page - 1) * parametros.limit, page * parametros.limit).map(f => ({ ...f, nome: f.codigo, pvp: null, atualizadoEm: null })),
        paginacao: { page, limit: parametros.limit, total: lista.length, totalPages, hasNextPage: page < totalPages },
        origem: 'local', estado: 'local', motivo, cacheStatus: null, desatualizado: false, consultadoEm: null,
      }
    }
  }
}
module.exports = { buscarFiis, criarCatalogoDinamico, consultarCatalogo: criarCatalogoDinamico() }
