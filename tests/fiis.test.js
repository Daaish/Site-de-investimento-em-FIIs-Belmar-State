const { test } = require('node:test')
const assert = require('node:assert/strict')
const { buscarFiis } = require('../services/fiis')
const cadastro = require('../data/fiis.json')
const legado = require('../data/indicadores-referencia.json')

test('cadastro contém somente identidade e classificação; resposta preserva campos com finanças ausentes', () => {
  assert.equal(cadastro.length, 4)
  for (const fii of cadastro) assert.deepEqual(Object.keys(fii).sort(), ['codigo', 'setor', 'tipo'])
  const resposta = buscarFiis()
  assert.deepEqual(resposta.map(f => f.codigo), cadastro.map(f => f.codigo))
  for (const fii of resposta) {
    assert.deepEqual(Object.keys(fii).sort(), ['codigo', 'dy', 'preco', 'setor', 'tipo'])
    assert.equal(fii.dy, null)
    assert.equal(fii.preco, null)
  }
  resposta[0].tipo = 'alterado'
  assert.equal(buscarFiis()[0].tipo, cadastro[0].tipo)
})

test('filtro por tipo preserva correspondência parcial sem diferenciar maiúsculas', () => {
  assert.deepEqual(buscarFiis({ tipo: 'pAP' }).map(f => f.codigo), ['MXRF11'])
  assert.equal(buscarFiis({ tipo: 'Tijolo' }).length, 3)
  assert.deepEqual(buscarFiis({ tipo: 'Inexistente' }), [])
})

test('DY legado é arquivado com procedência desconhecida e nunca satisfaz filtro atual', () => {
  assert.deepEqual(legado.map(f => [f.codigo, f.dy]), [['HGLG11', 8.2], ['KNRI11', 7.5], ['MXRF11', 11.3], ['VISC11', 9]])
  for (const indicador of legado) {
    assert.equal(indicador.classificacao, 'referencia-legada')
    assert.equal(indicador.data, null)
    assert.equal(indicador.periodo, null)
    assert.equal(indicador.fonteExterna, null)
  }
  assert.equal(buscarFiis({ min_dy: '0' }).length, 4)
  assert.deepEqual(buscarFiis({ min_dy: '8' }), [])
  assert.throws(() => buscarFiis({ min_dy: 'inválido' }))
  assert.throws(() => buscarFiis({ tipo: ['Papel'] }))
})
