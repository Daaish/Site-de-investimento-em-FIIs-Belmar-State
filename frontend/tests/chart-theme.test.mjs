import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { createRequire } from 'node:module'
import * as vue from 'vue'
import { criarArmazenamentoUsuario } from '../src/composables/armazenamentoUsuario.js'
import { parse as parseSfc } from '@vue/compiler-sfc'

const require = createRequire(import.meta.url)
const { parse } = require('@babel/parser')
const postcss = require('postcss')
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const css = postcss.parse(read('../src/styles/tokens.css'))
const theme = vue.ref('light')
const document = { documentElement: {} }
const properties = () => {
  const values = {}
  css.walkRules(rule => {
    if (rule.selector.includes('[data-theme="dark"]') && theme.value !== 'dark') return
    rule.walkDecls(decl => { values[decl.prop] = decl.value })
  })
  return { getPropertyValue: name => values[name] || '' }
}
function evaluate(source, dependencies, names) {
  dependencies = Object.fromEntries(Object.entries(dependencies).filter(([key]) => key !== 'default' && /^[a-zA-Z_$][\w$]*$/.test(key)))
  const ast = parse(source, { sourceType: 'module' })
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration') {
      for (const specifier of node.specifiers) dependencies[specifier.local.name] ??= {}
    }
  }
  for (const node of [...ast.program.body].reverse()) {
    if (node.type === 'ImportDeclaration') source = source.slice(0, node.start) + source.slice(node.end)
  }
  source = source.replace('export function useChartTheme', 'function useChartTheme')
  return new Function(...Object.keys(dependencies), `${source}\nreturn {${names.join(',')}}`)(...Object.values(dependencies))
}
const { useChartTheme } = evaluate(read('../src/composables/useChartTheme.js'), {
  computed: vue.computed, useTheme: () => ({ theme }), getComputedStyle: properties, document,
}, ['useChartTheme'])

test('all chart options and datasets react without resetting filters, modes or year during API failure', async () => {
  let requests = 0
  const operations = vue.ref([{ ticker: 'TEST11', tipo: 'compra', quantidade: 1, preco: 100, data: '2026-01-01' }])
  const dependencies = {
    ...vue, useChartTheme, criarArmazenamentoUsuario,
    ChartJS: { register() {} },
    useCarteira: () => ({ operacoes: operations, posicoes: vue.ref([]) }),
    useCotacoes: () => ({ cotacoes: {} }),
    buscarHistoricos: async () => { requests++; throw Error('API unavailable') },
    reconstruirHistorico: () => ({ pontos: [], alertas: [] }),
  }
  const scope = vue.effectScope()
  const charts = scope.run(() => Object.fromEntries([
    ['EvolucaoPatrimonial', ['intervalo', 'modoGrafico', 'dadosGrafico', 'opcoes', 'erro', 'pontos']],
    ['DistribuicaoCarteira', ['dadosGrafico', 'opcoes']],
    ['PainelDividendos', ['ano', 'dadosGrafico', 'opcoesGrafico']],
  ].map(([name, bindings]) => {
    const source = parseSfc(read(`../src/components/${name}.vue`)).descriptor.scriptSetup.content
    // Lifecycle registration is irrelevant to option reactivity; no DOM or API is required.
    return [name, evaluate(source, { ...dependencies, onMounted() {}, onUnmounted() {} }, bindings)]
  })))
  try {
    await vue.nextTick()
    const history = charts.EvolucaoPatrimonial
    history.intervalo.value = '3m'
    history.modoGrafico.value = 'desempenho'
    charts.PainelDividendos.ano.value = 2025
    const initialCalls = requests
    history.pontos.value = [
      { data: '2026-01-01', investido: 100, mercado: 100, desempenho: 0 },
      { data: '2026-03-01', investido: 100, mercado: 110, desempenho: 10 },
    ]
    const originalData = JSON.stringify(history.dadosGrafico.value.datasets[0].data)
    assert.equal(originalData, '[0,10]')
    assert.equal(history.erro.value, 'API unavailable')
    for (const selected of ['light', 'dark', 'light']) {
      theme.value = selected
      await vue.nextTick()
      const colors = useChartTheme().value
      for (const [name, chart] of Object.entries(charts)) {
        const options = (chart.opcoes || chart.opcoesGrafico).value
        assert.equal(options.plugins.tooltip.backgroundColor, colors.tooltip.backgroundColor, name)
        if (options.scales) {
          assert.equal(options.scales.y.ticks.color, colors.text, name)
          assert.equal(options.scales.y.grid.color, colors.border, name)
          assert.equal(options.plugins.legend.labels.color, colors.text, name)
        }
      }
      assert.equal(history.dadosGrafico.value.datasets[0].borderColor, selected === 'dark' ? '#30B88B' : '#168563')
      assert.equal(charts.DistribuicaoCarteira.dadosGrafico.value.datasets[0].borderColor, colors.surface)
      assert.equal(history.intervalo.value, '3m')
      assert.equal(history.modoGrafico.value, 'desempenho')
      assert.equal(charts.PainelDividendos.ano.value, 2025)
      assert.equal(JSON.stringify(history.dadosGrafico.value.datasets[0].data), originalData)
      assert.equal(requests, initialCalls, 'theme changes must not trigger API requests')
    }
  } finally { scope.stop() }
})
