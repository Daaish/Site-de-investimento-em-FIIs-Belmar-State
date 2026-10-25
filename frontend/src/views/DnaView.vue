
<script setup>
import { ref, computed, watch } from 'vue'
import { useCarteira } from '../composables/useCarteira'

const { posicoes, patrimonio } = useCarteira()
const CHAVE = 'belmar-dna-v1'

const perfis = {
  renda: {
    nome: 'Caçador de Dividendos',
    icone: '💰',
    descricao: 'Você valoriza a geração de renda recorrente e gosta de acompanhar o fluxo de proventos.',
    cor: '#22d3a0',
    dica: 'Explore o Calendário Inteligente para acompanhar seus rendimentos.',
  },
  crescimento: {
    nome: 'Construtor de Patrimônio',
    icone: '📈',
    descricao: 'Você gosta de pensar no longo prazo e acompanhar a evolução do patrimônio ao longo do tempo.',
    cor: '#60a5fa',
    dica: 'Acompanhe a evolução do capital investido na Minha Carteira.',
  },
  estabilidade: {
    nome: 'Guardião da Estabilidade',
    icone: '🛡️',
    descricao: 'Você valoriza planejamento, previsibilidade e uma visão organizada das suas decisões.',
    cor: '#c4a5fa',
    dica: 'Registre suas operações para manter seu histórico organizado.',
  },
  exploracao: {
    nome: 'Explorador de Oportunidades',
    icone: '🧭',
    descricao: 'Você gosta de conhecer alternativas, comparar possibilidades e aprender sobre diferentes tipos de investimentos.',
    cor: '#fbbf74',
    dica: 'Explore diferentes FIIs e estude seus indicadores antes de decidir.',
  },
}

const perguntas = [
  {
    titulo: 'Qual é seu principal objetivo ao investir?',
    opcoes: [
      { texto: 'Receber rendimentos periodicamente', perfil: 'renda' },
      { texto: 'Construir patrimônio no longo prazo', perfil: 'crescimento' },
      { texto: 'Organizar meu dinheiro e planejar o futuro', perfil: 'estabilidade' },
      { texto: 'Conhecer oportunidades diferentes', perfil: 'exploracao' },
    ],
  },
  {
    titulo: 'Qual informação você mais gosta de acompanhar?',
    opcoes: [
      { texto: 'Dividendos recebidos', perfil: 'renda' },
      { texto: 'Evolução do patrimônio', perfil: 'crescimento' },
      { texto: 'Regularidade dos resultados', perfil: 'estabilidade' },
      { texto: 'Indicadores e comparações entre fundos', perfil: 'exploracao' },
    ],
  },
  {
    titulo: 'O que mais chama sua atenção em um FII?',
    opcoes: [
      { texto: 'Histórico de distribuições', perfil: 'renda' },
      { texto: 'Potencial de valorização no longo prazo', perfil: 'crescimento' },
      { texto: 'Características e riscos dos ativos', perfil: 'estabilidade' },
      { texto: 'Uma estratégia ou segmento que ainda não conheço', perfil: 'exploracao' },
    ],
  },
  {
    titulo: 'Como você prefere utilizar uma plataforma financeira?',
    opcoes: [
      { texto: 'Acompanhando o calendário de pagamentos', perfil: 'renda' },
      { texto: 'Monitorando minhas metas de longo prazo', perfil: 'crescimento' },
      { texto: 'Organizando minha carteira e operações', perfil: 'estabilidade' },
      { texto: 'Investigando fundos e testando cenários', perfil: 'exploracao' },
    ],
  },
  {
    titulo: 'Qual atividade parece mais interessante?',
    opcoes: [
      { texto: 'Calcular a renda mensal da carteira', perfil: 'renda' },
      { texto: 'Simular crescimento com aportes', perfil: 'crescimento' },
      { texto: 'Revisar o planejamento financeiro', perfil: 'estabilidade' },
      { texto: 'Comparar estratégias de investimento', perfil: 'exploracao' },
    ],
  },
  {
    titulo: 'Qual conquista você gostaria de desbloquear primeiro?',
    opcoes: [
      { texto: 'Primeiros R$ 100 de dividendos', perfil: 'renda' },
      { texto: 'Primeiros R$ 10 mil de patrimônio', perfil: 'crescimento' },
      { texto: 'Seis meses de registros organizados', perfil: 'estabilidade' },
      { texto: 'Conhecer cinco segmentos de FIIs', perfil: 'exploracao' },
    ],
  },
]

function carregar() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE) || 'null')

    if (
      dados &&
      Array.isArray(dados.respostas) &&
      dados.respostas.length === perguntas.length &&
      dados.respostas.every(
        (r, i) => Number.isInteger(r) &&
          r >= 0 && r < perguntas[i].opcoes.length
      )
    ) {
      return dados.respostas
    }
  } catch {
    // Respostas antigas ou inválidas são ignoradas.
  }

  return Array(perguntas.length).fill(null)
}

const respostas = ref(carregar())
const perguntaAtual = ref(0)
const resultadoAberto = ref(respostas.value.every(r => r !== null))

watch(respostas, valor => {
  localStorage.setItem(CHAVE, JSON.stringify({
    respostas: valor,
  }))
}, { deep: true })

const pergunta = computed(() => perguntas[perguntaAtual.value])

const pontuacao = computed(() => {
  const pontos = {
    renda: 0,
    crescimento: 0,
    estabilidade: 0,
    exploracao: 0,
  }

  perguntas.forEach((p, indice) => {
    const escolha = respostas.value[indice]

    if (escolha !== null) {
      pontos[p.opcoes[escolha].perfil]++
    }
  })

  return pontos
})

const perfilPrincipal = computed(() => {
  // Em caso de empate, prioriza o perfil escolhido na
  // resposta da primeira pergunta entre os empatados.
  const maior = Math.max(...Object.values(pontuacao.value))
  const empatados = Object.keys(pontuacao.value)
    .filter(chave => pontuacao.value[chave] === maior)

  const primeira = perguntas[0].opcoes[respostas.value[0]]?.perfil

  return empatados.includes(primeira) ? primeira : empatados[0]
})

const distribuicao = computed(() =>
  Object.entries(perfis).map(([id, perfil]) => ({
    id,
    ...perfil,
    pontos: pontuacao.value[id],
    percentual: Math.round(
      pontuacao.value[id] / perguntas.length * 100
    ),
  }))
)

const concluido = computed(() =>
  respostas.value.every(r => r !== null)
)

const progresso = computed(() =>
  Math.round(
    respostas.value.filter(r => r !== null).length /
    perguntas.length * 100
  )
)

const perfilAtual = computed(() => perfis[perfilPrincipal.value])

const moeda = valor =>
  Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

function selecionar(indice) {
  respostas.value[perguntaAtual.value] = indice
}

function proxima() {
  if (respostas.value[perguntaAtual.value] === null) return

  if (perguntaAtual.value < perguntas.length - 1) {
    perguntaAtual.value++
  } else if (concluido.value) {
    resultadoAberto.value = true
  }
}

function anterior() {
  if (perguntaAtual.value > 0) perguntaAtual.value--
}

function refazer() {
  respostas.value = Array(perguntas.length).fill(null)
  perguntaAtual.value = 0
  resultadoAberto.value = false
}
</script>

<template>
  <section class="dna-page">
    <div class="eyebrow">BELMAR STATE / PERSONALIZAÇÃO</div>

    <h1>Perfil do Investidor <span class="accent">.</span></h1>
    <p>
      Descubra quais características mais combinam com sua
      forma de acompanhar investimentos.
    </p>

    <template v-if="!resultadoAberto">
      <div class="questionario">
        <div class="questionario-topo">
          <span>DESCUBRA SEU DNA</span>
          <span>Pergunta {{ perguntaAtual + 1 }} de {{ perguntas.length }}</span>
        </div>

        <div class="barra">
          <div :style="{ width: progresso + '%' }"></div>
        </div>

        <div class="pergunta-conteudo">
          <div class="pergunta-icone">🧬</div>
          <h2>{{ pergunta.titulo }}</h2>
          <p>Selecione a alternativa que mais combina com você.</p>

          <div class="opcoes">
            <button
              v-for="(opcao, indice) in pergunta.opcoes"
              :key="indice"
              type="button"
              class="opcao"
              :class="{ selecionada: respostas[perguntaAtual] === indice }"
              @click="selecionar(indice)"
            >
              <span class="letra">
                {{ String.fromCharCode(65 + indice) }}
              </span>

              <span>{{ opcao.texto }}</span>

              <span class="check">
                {{ respostas[perguntaAtual] === indice ? '✓' : '○' }}
              </span>
            </button>
          </div>

          <div class="botoes">
            <button
              type="button"
              class="botao-secundario"
              :disabled="perguntaAtual === 0"
              @click="anterior"
            >
              ← Anterior
            </button>

            <button
              type="button"
              class="primary-button"
              :disabled="respostas[perguntaAtual] === null"
              @click="proxima"
            >
              {{ perguntaAtual === perguntas.length - 1
                ? 'Descobrir meu DNA →'
                : 'Próxima →' }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="resultado">
        <div class="resultado-icone">{{ perfilAtual.icone }}</div>

        <div class="eyebrow">SEU PERFIL PREDOMINANTE</div>

        <h2>{{ perfilAtual.nome }}</h2>

        <p>{{ perfilAtual.descricao }}</p>

        <div class="resultado-badge">✦ DNA DESCOBERTO</div>
      </div>

      <div class="resultado-grid">
        <article class="painel">
          <h2>Composição do seu DNA</h2>
          <p>Distribuição das suas respostas por característica.</p>

          <div
            v-for="item in distribuicao"
            :key="item.id"
            class="caracteristica"
          >
            <div class="caracteristica-topo">
              <span>{{ item.icone }} {{ item.nome }}</span>
              <strong>{{ item.percentual }}%</strong>
            </div>

            <div class="barra">
              <div
                :style="{
                  width: item.percentual + '%',
                  background: 'var(--bm-profile-' + item.id + ')',
                }"
              ></div>
            </div>
          </div>
        </article>

        <article class="painel">
          <h2>Seu espaço na Belmar State</h2>
          <p>Informações vinculadas à sua carteira atual.</p>

          <div class="resumo-linha">
            <span>FIIs na carteira</span>
            <strong>{{ posicoes.length }}</strong>
          </div>

          <div class="resumo-linha">
            <span>Capital investido</span>
            <strong>{{ moeda(patrimonio) }}</strong>
          </div>

          <div class="resumo-linha">
            <span>Perfil identificado</span>
            <strong>{{ perfilAtual.nome }}</strong>
          </div>

          <div class="dica">
            <strong>💡 Explore a plataforma</strong>
            <p>{{ perfilAtual.dica }}</p>
          </div>
        </article>
      </div>

      <div class="refazer">
        <button class="botao-secundario" @click="refazer">
          ↻ Refazer meu DNA
        </button>
      </div>
    </template>

    <p class="aviso">
      Este questionário é recreativo e educativo. O resultado
      reflete preferências declaradas nas respostas, não mede
      tolerância real a risco, capacidade financeira ou adequação
      de produtos. Não substitui uma avaliação de suitability.
    </p>
  </section>
</template>

<style scoped>
.dna-page {
  --bm-profile-renda: var(--bm-navy-secondary);
  --bm-profile-crescimento: var(--bm-profile-growth);
  --bm-profile-estabilidade: var(--bm-profile-stability);
  --bm-profile-exploracao: var(--bm-gold);
}

.questionario {
  max-width: 800px;
  margin: 34px auto;
  background: var(--bm-surface);
  border: 1px solid var(--bm-border);
  border-radius: 18px;
  padding: 32px;
}

.questionario-topo {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
  color: var(--bm-text-secondary);
  letter-spacing: 1px;
  margin-bottom: 15px;
}

.barra {
  height: 9px;
  background: var(--bm-border);
  border-radius: 20px;
  overflow: hidden;
}

.barra > div {
  height: 100%;
  background: var(--bm-navy-secondary);
  border-radius: 20px;
  transition: width .3s ease;
}

.pergunta-conteudo {
  padding-top: 35px;
  text-align: center;
}

.pergunta-icone { font-size: 55px; }

.pergunta-conteudo h2 {
  font-size: clamp(23px, 3vw, 31px);
  margin: 20px 0 10px;
}

.pergunta-conteudo p { font-size: 13px; }

.opcoes {
  display: grid;
  gap: 12px;
  margin: 35px 0;
  text-align: left;
}

.opcao {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px;
  background: var(--bm-surface-muted);
  border: 1px solid var(--bm-input-border);
  border-radius: 11px;
  color: var(--bm-text);
  text-align: left;
  cursor: pointer;
  transition: .2s;
}

.opcao:hover { border-color: var(--bm-navy-secondary); }

.opcao.selecionada {
  background: var(--bm-info-bg);
  border-color: var(--bm-navy-secondary);
}

.letra {
  background: var(--bm-surface-muted);
  padding: 9px 13px;
  border-radius: 8px;
  color: var(--bm-text);
  font-weight: 700;
}

.check {
  margin-left: auto;
  color: var(--bm-navy-secondary);
  font-size: 22px;
}

.botoes {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.botoes button {
  padding: 12px 20px;
  border-radius: 9px;
  cursor: pointer;
}

.primary-button { border: 0; }

.botoes button:disabled {
  opacity: .35;
  cursor: not-allowed;
}

.botao-secundario {
  color: var(--bm-text);
  background: transparent;
  border: 1px solid var(--bm-input-border);
  border-radius: 9px;
  padding: 12px 20px;
  cursor: pointer;
}

.resultado {
  text-align: center;
  padding: 45px 24px;
  margin-top: 30px;
  background: var(--bm-surface);
  border: 1px solid var(--bm-border);
  border-radius: 18px;
}

.resultado-icone {
  font-size: 70px;
  margin-bottom: 20px;
}

.resultado h2 {
  font-size: clamp(28px, 4vw, 40px);
  margin: 12px 0;
}

.resultado p {
  max-width: 540px;
  margin: 0 auto;
}

.resultado-badge {
  display: inline-block;
  margin-top: 25px;
  padding: 9px 17px;
  color: var(--bm-gold-text);
  background: var(--bm-gold-bg);
  border-radius: 24px;
  font-size: 11px;
  letter-spacing: 1px;
}

.resultado-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 24px;
}

.painel {
  min-width: 0;
  background: var(--bm-surface);
  border: 1px solid var(--bm-border);
  padding: 28px;
  border-radius: var(--bm-radius);
}

.painel h2 { font-size: 22px; margin: 0; }
.painel > p { font-size: 13px; margin-bottom: 28px; }

.caracteristica { margin: 22px 0; }

.caracteristica-topo {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  margin-bottom: 10px;
}

.caracteristica-topo strong { color: var(--bm-text); }

.resumo-linha {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid var(--bm-border);
  font-size: 13px;
}

.resumo-linha span { color: var(--bm-text-secondary); }
.resumo-linha strong { text-align: right; }

.dica {
  background: var(--bm-info-bg);
  border: 1px solid var(--bm-border);
  border-radius: 10px;
  padding: 18px;
  margin-top: 25px;
}

.dica strong { color: var(--bm-text); font-size: 13px; }
.dica p { margin: 9px 0 0; font-size: 13px; }

.refazer { text-align: center; margin-top: 25px; }
.aviso { margin-top: 35px; font-size: 12px; }

@media (max-width: 760px) {
  .questionario { padding: 18px; }
  .resultado-grid { grid-template-columns: 1fr; }
  .botoes { flex-wrap: wrap; }
  .opcao { padding: 13px; gap: 10px; }
}
</style>
