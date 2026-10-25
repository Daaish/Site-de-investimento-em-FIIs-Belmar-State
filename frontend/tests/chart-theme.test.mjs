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

test('gráfico de cripto reage ao tema sem trocar seleção, período, pontos ou consultar a API', async () => {
  const props = vue.reactive({ pontos: [{ tempo: 1000, preco: 2 }], nome: 'Bitcoin' })
  const source = parseSfc(read('../src/components/GraficoCripto.vue')).descriptor.scriptSetup.content
  const chart = evaluate(source, { computed: vue.computed, useChartTheme, ChartJS: { register() {} }, defineProps: () => props }, ['dados', 'opcoes'])
  const scope = vue.effectScope()
  const { useCripto } = await import('../src/composables/useCripto.js')
  let chamadas = 0
  const state = scope.run(() => useCripto({ iniciarRelogio: () => 0, pararRelogio() {}, requisitar: async () => { chamadas++; throw Error('indisponível') } }))
  state.selecionar({ id: 'bitcoin', nome: 'Bitcoin' }); state.periodo.value = '90'
  await vue.nextTick()
  const antes = chamadas
  try {
    for (const t of ['light', 'dark', 'light']) {
      theme.value = t; await vue.nextTick()
      assert.equal(chart.opcoes.value.scales.y.ticks.color, useChartTheme().value.text)
      assert.equal(chart.dados.value.datasets[0].borderColor, useChartTheme().value.gold)
      assert.deepEqual(chart.dados.value.datasets[0].data, [2])
      assert.equal(state.selecionada.value.id, 'bitcoin')
      assert.equal(state.periodo.value, '90')
      assert.equal(chamadas, antes)
    }
  } finally { scope.stop() }
})

test('Academy: gráfico legível e estado de lição, simulador e quiz preservado ao alternar Light/Dark', async () => {
  const { useAcademy } = await import('../src/composables/useAcademy.js')
  const academy = useAcademy()
  academy.abrirModulo('fiis'); academy.irParaLicao(2)
  Object.assign(academy.formulario, { inicial: 1000, aporte: 50, anos: 2, taxaAnual: -10 })
  academy.area.value = 'quiz'; academy.responder(1)
  const props = vue.reactive({ pontos: academy.simulacao.value.resultado.pontos })
  const source = parseSfc(read('../src/components/academy/GraficoSimulacao.vue')).descriptor.scriptSetup.content
  const chart = evaluate(source, { computed: vue.computed, useChartTheme, ChartJS: { register() {} }, defineProps: () => props, getComputedStyle: properties, document }, ['dados', 'opcoes'])
  const inicial = JSON.stringify(props.pontos)
  for (const t of ['light', 'dark', 'light']) {
    theme.value = t; await vue.nextTick()
    const colors = useChartTheme().value
    assert.equal(chart.opcoes.value.scales.y.ticks.color, colors.text)
    assert.equal(chart.opcoes.value.scales.y.grid.color, colors.border)
    assert.equal(chart.opcoes.value.plugins.legend.labels.color, colors.text)
    assert.equal(chart.opcoes.value.plugins.tooltip.backgroundColor, colors.tooltip.backgroundColor)
    assert.equal(chart.dados.value.datasets[0].borderColor, properties().getPropertyValue('--bs-gold-text'))
    assert.equal(chart.dados.value.datasets[1].borderColor, colors.blue)
    const luminancia = hex => {
      const rgb = hex.match(/[a-f0-9]{2}/gi).map(c => parseInt(c, 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
    }
    for (const dataset of chart.dados.value.datasets) {
      const a = luminancia(dataset.borderColor), b = luminancia(colors.surface)
      assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 3, 'contraste mínimo de 3:1 para as linhas')
    }
    assert.notEqual(chart.dados.value.datasets[0].borderColor, colors.blue)
    assert.deepEqual(chart.dados.value.datasets[1].borderDash, [6, 4])
    assert.equal(academy.moduloId.value, 'fiis'); assert.equal(academy.indiceLicao.value, 2)
    assert.equal(academy.area.value, 'quiz'); assert.equal(academy.respondidas.value, 1)
    assert.equal(academy.formulario.taxaAnual, -10); assert.equal(JSON.stringify(props.pontos), inicial)
    assert.ok(academy.simulacao.value.resultado.rendimento < 0)
  }
})
