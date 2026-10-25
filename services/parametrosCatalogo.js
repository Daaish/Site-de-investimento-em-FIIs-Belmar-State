const { ErroMercado } = require('./brapi')

function normalizarParametrosCatalogo(query = {}) {
  const invalido = () => { throw new ErroMercado('PARAMETROS_INVALIDOS') }
  const inteiro = (valor, padrao, maximo) => {
    if (valor === undefined) return padrao
    if (!['string', 'number'].includes(typeof valor) || !/^\d+$/.test(String(valor))) invalido()
    const numero = Number(valor)
    if (!Number.isSafeInteger(numero) || numero < 1 || numero > maximo) invalido()
    return numero
  }
  const texto = (valor, padrao = '') => {
    if (valor === undefined) return padrao
    if (typeof valor !== 'string' || valor.length > 100 || /[\x00-\x1F]/.test(valor)) invalido()
    return valor.normalize('NFC').trim().replace(/\s+/g, ' ')
  }
  const page = inteiro(query.page, 1, 10000)
  const limit = inteiro(query.limit, 20, 50)
  const search = texto(query.search).toUpperCase()
  const sortBy = texto(query.sortBy, 'name')
  const sortOrder = texto(query.sortOrder, 'asc')
  if (!['name', 'close', 'change', 'volume'].includes(sortBy) || !['asc', 'desc'].includes(sortOrder)) invalido()
  return { page, limit, search, sortBy, sortOrder }
}
module.exports = { normalizarParametrosCatalogo }
