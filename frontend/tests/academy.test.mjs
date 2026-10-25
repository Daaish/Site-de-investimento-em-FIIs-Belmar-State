import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { nextTick } from 'vue'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { simularInvestimento, VALORES_INICIAIS } from '../src/services/simularInvestimento.js'
import { useAcademy } from '../src/composables/useAcademy.js'
import { modulos } from '../src/data/academy/modulos.js'
import { perguntasQuiz } from '../src/data/academy/quiz.js'
const perto = (a, b, tolerancia = 1e-8) => assert.ok(Math.abs(a - b) <= tolerancia * Math.max(1, Math.abs(b)), `${a} ≠ ${b}`)
const calcular = extra => simularInvestimento({ ...VALORES_INICIAIS, ...extra })

test('simulador: mês zero, taxa zero, aportes decimais e total investido', () => {
  const r = calcular({ inicial: 1000, aporte: 100, anos: 1, taxaAnual: 0 })
  assert.equal(r.pontos.length, 13)
  assert.deepEqual(r.pontos[0], { mes: 0, patrimonio: 1000, aportado: 1000, rendimento: 0 })
  assert.equal(r.patrimonio, 2200); assert.equal(r.totalAportado, 2200); assert.equal(r.rendimento, 0)
  const decimal = calcular({ inicial: 0.1, aporte: 0.1, anos: 10, taxaAnual: 0 })
  assert.equal(decimal.rendimento, 0)
  assert.equal(calcular({ inicial: 0, aporte: 0 }).patrimonio, 0)
})
test('simulador: conversão efetiva anual e juros compostos sem arredondamento mensal', () => {
  const r = calcular({ inicial: 100, aporte: 0, anos: 2, taxaAnual: 10 })
  perto(r.pontos[12].patrimonio, 110); perto(r.patrimonio, 121)
  perto((1 + r.taxaMensal) ** 12 - 1, 0.1)
  assert.notEqual(r.taxaMensal, 0.1 / 12)
  const pequeno = calcular({ inicial: 1000, aporte: 0, anos: 50, taxaAnual: 0.000001 })
  perto(pequeno.patrimonio, 1000 * (1 + 0.000001 / 100) ** 50)
})
test('simulador: aportes no fim do mês conferem com fórmula independente de anuidade', () => {
  const anual = ((1.01 ** 12) - 1) * 100
  const r = calcular({ inicial: 0, aporte: 100, anos: 1, taxaAnual: anual })
  perto(r.pontos[1].patrimonio, 100)
  perto(r.pontos[2].patrimonio, 201)
  perto(r.patrimonio, 100 * ((1.01 ** 12 - 1) / 0.01))
  perto(r.rendimento, r.patrimonio - 1200)
  const misto = calcular({ inicial: 500, aporte: 75, anos: 3, taxaAnual: 12 })
  const i = (1.12 ** (1 / 12)) - 1
  perto(misto.patrimonio, 500 * (1 + i) ** 36 + 75 * (((1 + i) ** 36 - 1) / i))
})
test('simulador: taxas negativas preservam saldo não negativo e exibem perda', () => {
  const r = calcular({ inicial: 100, aporte: 0, anos: 1, taxaAnual: -20 })
  perto(r.patrimonio, 80); perto(r.rendimento, -20)
  const comAportes = calcular({ inicial: 100, aporte: 10, anos: 2, taxaAnual: -50 })
  assert.ok(comAportes.rendimento < 0)
  assert.ok(comAportes.pontos.every(p => Number.isFinite(p.patrimonio) && p.patrimonio >= 0))
  const extrema = calcular({ inicial: 100, aporte: 0, anos: 1, taxaAnual: -99.99 })
  perto(extrema.patrimonio, 0.01)
})
test('simulador rejeita campos vazios, tipos indevidos, limites, −100% e estouro de projeção', () => {
  for (const extra of [{ inicial: '' }, { inicial: null }, { inicial: '10' }, { inicial: -1 }, { inicial: Infinity },
    { aporte: NaN }, { aporte: -10 }, { anos: 0 }, { anos: 1.5 }, { anos: 51 }, { taxaAnual: -100 },
    { taxaAnual: -101 }, { taxaAnual: 101 }, { inicial: 1000000001 }, { aporte: 1000000001 },
    { inicial: 1000000000, aporte: 1000000000, anos: 50, taxaAnual: 100 }]) assert.throws(() => calcular(extra))
  assert.throws(() => simularInvestimento())
})
test('conteúdo: quatro módulos, 21 lições com leitura, exemplos e IDs únicos; 12 questões coerentes', () => {
  assert.equal(modulos.length, 4)
  assert.equal(modulos.flatMap(m => m.licoes).length, 21)
  const ids = new Set()
  for (const m of modulos) {
    assert.ok(m.descricao && m.nivel)
    for (const l of m.licoes) {
      assert.ok(!ids.has(l.id)); ids.add(l.id)
      assert.ok(l.minutos >= 1 && Number.isInteger(l.minutos))
      for (const campo of ['titulo', 'resumo', 'exemplo', 'destaque', 'pergunta']) assert.ok(l[campo]?.length > 0)
    }
  }
  assert.equal(perguntasQuiz.length, 12)
  assert.equal(new Set(perguntasQuiz.map(p => p.id)).size, 12)
  for (const m of modulos) assert.equal(perguntasQuiz.filter(p => p.modulo === m.id).length, 3)
  for (const p of perguntasQuiz) {
    assert.equal(p.opcoes.length, 3); assert.ok(p.opcoes[p.correta]); assert.ok(p.explicacao)
  }
  // Exemplos matemáticos usados nas lições e no quiz.
  perto(100 * 1.05, 105); perto(100 * 1.1 ** 2, 121); perto(10 * 0.8, 8)
  perto(8 / 100 * 100, 8); perto(90 / 100, 0.9); perto(100 * 1.2 * 0.8, 96)
  perto(50 * 0.8 + 50, 90); perto(50 * 12, 600)
})
test('navegação entre módulos e lições valida índices e preserva atividade entre áreas', () => {
  const a = useAcademy()
  assert.equal(a.area.value, 'aprender'); assert.equal(a.modulo.value, null)
  assert.equal(a.abrirModulo('inexistente'), false)
  for (const m of modulos) {
    assert.equal(a.abrirModulo(m.id), true)
    assert.equal(a.licao.value.id, m.licoes[0].id)
    assert.equal(a.irParaLicao(m.licoes.length - 1), true)
    assert.equal(a.irParaLicao(m.licoes.length), false)
    assert.equal(a.irParaLicao(-1), false)
  }
  a.area.value = 'simular'; a.formulario.aporte = 321
  a.area.value = 'quiz'; a.area.value = 'simular'
  assert.equal(a.formulario.aporte, 321)
})
test('quiz exige resposta antes de avançar, explica todas as opções e bloqueia dupla pontuação', () => {
  const a = useAcademy()
  assert.equal(a.proximaPergunta(), false); assert.equal(a.responder(-1), false)
  for (let i = 0; i < perguntasQuiz.length; i++) {
    assert.equal(a.indiceQuiz.value, i)
    assert.ok(a.pergunta.value.explicacao)
    const resposta = i % 2 === 0 ? a.pergunta.value.correta : (a.pergunta.value.correta + 1) % 3
    assert.equal(a.responder(resposta), true)
    assert.equal(a.responder(a.pergunta.value.correta), false)
    assert.equal(a.proximaPergunta(), true)
  }
  assert.equal(a.acertos.value, 6); assert.equal(a.respondidas.value, 12)
  assert.equal(a.finalizado.value, true); assert.equal(a.pergunta.value, null)
  assert.equal(a.responder(0), false); assert.equal(a.proximaPergunta(), false)
  a.reiniciarQuiz(); assert.equal(a.acertos.value, 0); assert.equal(a.finalizado.value, false)
})
test('Recomeçar experiência limpa navegação, personalização e respostas; instâncias não se misturam', async () => {
  const a = useAcademy(), b = useAcademy()
  a.abrirModulo('fiis'); a.irParaLicao(3)
  Object.assign(a.formulario, { inicial: 2500, aporte: 80, anos: 2, taxaAnual: -10 })
  a.area.value = 'quiz'; a.responder(1); a.proximaPergunta()
  assert.equal(b.respondidas.value, 0); assert.deepEqual({ ...b.formulario }, VALORES_INICIAIS)
  a.recomeçar(); await nextTick()
  assert.equal(a.area.value, 'aprender'); assert.equal(a.moduloId.value, null); assert.equal(a.indiceLicao.value, 0)
  assert.deepEqual({ ...a.formulario }, VALORES_INICIAIS)
  assert.deepEqual(a.respostas.value, {}); assert.equal(a.indiceQuiz.value, 0); assert.equal(a.acertos.value, 0)
  assert.equal(a.simulacao.value.erro, '')
  a.formulario.anos = ''; assert.ok(a.simulacao.value.erro); assert.equal(a.simulacao.value.resultado, null)
  a.recomeçar(); assert.ok(a.simulacao.value.resultado)
})
test('componentes compilam com controles acessíveis e sem API, armazenamento ou carteira', () => {
  for (const nome of ['views/BelmarAcademyView', ...['ModuloCard', 'LeitorLicao', 'SimuladorInvestimentos', 'GraficoSimulacao', 'QuizFinanceiro'].map(n => `components/academy/${n}`)]) {
    const source = readFileSync(new URL(`../src/${nome}.vue`, import.meta.url), 'utf8')
    const { descriptor } = parse(source)
    assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename: nome, id: 'academy-test' }).errors, [])
    assert.ok(compileScript(descriptor, { id: 'academy-script-test' }).content)
    assert.doesNotMatch(source, /useCarteira|useAuth|localStorage|sessionStorage|fetch\(/)
    if (nome.includes('BelmarAcademy')) {
      assert.match(source, /Experimente o simulador/); assert.match(source, /Recomeçar experiência/)
    }
    if (nome.includes('SimuladorInvestimentos')) {
      assert.match(source, /sem garantia/); assert.match(source, /impostos, taxas, inflação/)
      assert.match(source, /aria-describedby/)
    }
    if (nome.includes('QuizFinanceiro')) { assert.match(source, /aria-live="polite"/); assert.match(source, /Resposta correta/); }
  }
  const css = readFileSync(new URL('../src/styles/academy.css', import.meta.url), 'utf8')
  assert.match(css, /@media/); assert.match(css, /var\(--bm-/)
})
