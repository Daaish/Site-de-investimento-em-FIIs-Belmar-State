<script setup>
import { computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useCarteira } from '../composables/useCarteira'
import { useCotacoes } from '../composables/useCotacoes'
import DistribuicaoCarteira from '../components/DistribuicaoCarteira.vue'
import EvolucaoPatrimonial from '../components/EvolucaoPatrimonial.vue'
import PainelDividendos from '../components/PainelDividendos.vue'

const { posicoes, patrimonio, totalCotas } = useCarteira()

const {
  cotacoes,
  erros,
  carregando,
  atualizarCotacoes,
} = useCotacoes()

const tickers = computed(() =>
  posicoes.value.map(fii => fii.ticker)
)

onMounted(() => {
  atualizarCotacoes(tickers.value)
})

watch(tickers, novos => {
  atualizarCotacoes(novos)
})

const carteiraMercado = computed(() =>
  posicoes.value.map(fii => {
    const cotacao = cotacoes[fii.ticker]
    const precoAtual = cotacao?.preco ?? null

    const valorMercado = precoAtual === null
      ? null
      : fii.quantidade * precoAtual

    const resultado = valorMercado === null
      ? null
      : valorMercado - fii.custo

    const percentual = resultado === null || fii.custo <= 0
      ? null
      : resultado / fii.custo * 100

    return {
      ...fii,
      precoAtual,
      valorMercado,
      resultado,
      percentual,
      atualizadoEm: cotacao?.atualizadoEm ?? null,
    }
  })
)

const cotacoesDisponiveis = computed(() =>
  carteiraMercado.value.filter(fii => fii.valorMercado !== null)
)

const coberturaCompleta = computed(() =>
  posicoes.value.length > 0 &&
  cotacoesDisponiveis.value.length === posicoes.value.length
)

const valorMercado = computed(() => {
  if (!coberturaCompleta.value) return null

  return carteiraMercado.value.reduce(
    (soma, fii) => soma + fii.valorMercado, 0
  )
})

const lucroPrejuizo = computed(() => {
  if (valorMercado.value === null) return null
  return valorMercado.value - patrimonio.value
})

const rentabilidade = computed(() => {
  if (lucroPrejuizo.value === null || patrimonio.value <= 0) {
    return null
  }

  return lucroPrejuizo.value / patrimonio.value * 100
})

const moeda = valor =>
  Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

const percentual = valor =>
  `${valor >= 0 ? '+' : ''}${valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`

function horario(data) {
  if (!data) return 'Horário não informado'

  const instante = new Date(data)

  if (Number.isNaN(instante.getTime())) {
    return 'Horário não informado'
  }

  return instante.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

const atalhos = [
  {
    titulo: 'Carteira Patrimonial',
    desc: 'Gerencie suas operações e posições',
    rota: '/carteira',
    icone: '▣',
  },
  {
    titulo: 'Agenda de Proventos',
    desc: 'Acompanhe os proventos dos seus FIIs',
    rota: '/calendario',
    icone: '▦',
  },
  {
    titulo: 'Jornada do Investidor',
    desc: 'Acompanhe sua jornada de investimento',
    rota: '/conquistas',
    icone: '✦',
  },
  {
    titulo: 'Perfil do Investidor',
    desc: 'Descubra suas preferências',
    rota: '/dna',
    icone: '◎',
  },
]
</script>

<template>  
  <section aria-label="Visão Geral">
    <div class="page-heading">
      <div>
        <div class="eyebrow">INTELIGÊNCIA PATRIMONIAL</div>

        <h1>Visão Geral <span class="accent">.</span></h1>

        <p>
          Acompanhe suas posições e o desempenho
          de mercado da carteira.
        </p>
      </div>

      <button
        class="atualizar-cotacoes"
        :disabled="carregando"
        @click="atualizarCotacoes(tickers, true)"
      >
        {{ carregando ? 'Atualizando...' : '↻ Atualizar cotações' }}
      </button>
    </div>

    <div class="stats-grid">
      <article class="stat-card">
        <div class="stat-heading">
          Capital investido <span>◈</span>
        </div>

        <h2>{{ moeda(patrimonio) }}</h2>
        <p>Custo das posições atuais</p>
      </article>

      <article class="stat-card">
        <div class="stat-heading">
          Valor de mercado <span>▣</span>
        </div>

        <h2>
          {{ valorMercado === null ? '—' : moeda(valorMercado) }}
        </h2>

        <p>Últimas cotações disponíveis</p>
      </article>

      <article class="stat-card">
        <div class="stat-heading">
          Lucro / Prejuízo <span>↗</span>
        </div>

        <h2
          :class="{
            positive: lucroPrejuizo > 0,
            negativo: lucroPrejuizo < 0,
          }"
        >
          {{
            lucroPrejuizo === null
              ? '—'
              : moeda(lucroPrejuizo)
          }}
        </h2>

        <p>Resultado não realizado das posições</p>
      </article>

      <article class="stat-card">
        <div class="stat-heading">
          Rentabilidade <span>◎</span>
        </div>

        <h2
          :class="{
            positive: rentabilidade > 0,
            negativo: rentabilidade < 0,
          }"
        >
          {{
            rentabilidade === null
              ? '—'
              : percentual(rentabilidade)
          }}
        </h2>

        <p>Variação sobre o custo atual</p>
      </article>
    </div>

    <EvolucaoPatrimonial />
    <DistribuicaoCarteira />
    <PainelDividendos />
    <div class="resumo-carteira">
      <span>Fundos na carteira: <strong>{{ posicoes.length }}</strong></span>
      <span>Total de cotas: <strong>{{ totalCotas }}</strong></span>
      <span>
        Cotações disponíveis:
        <strong>
          {{ cotacoesDisponiveis.length }}/{{ posicoes.length }}
        </strong>
      </span>
    </div>

    <div
      v-if="posicoes.length && !coberturaCompleta"
      class="aviso-mercado"
    >
      {{
        carregando
          ? 'Consultando as cotações dos seus FIIs...'
          : 'Algumas cotações estão indisponíveis. Os totais de mercado serão exibidos quando todas estiverem disponíveis.'
      }}
    </div>

    <div class="section-heading">
      <div>
        <h2>Carteira Patrimonial</h2>
        <p>Suas posições e as últimas cotações disponíveis.</p>
      </div>

      <RouterLink to="/carteira" class="text-link">
        Gerenciar →
      </RouterLink>
    </div>

    <div class="table-card">
      <div class="table-scroll">
        <table v-if="carteiraMercado.length">
          <thead>
            <tr>
              <th>FII</th>
              <th>Cotas</th>
              <th>Preço médio</th>
              <th>Cotação</th>
              <th>Valor mercado</th>
              <th>Resultado</th>
              <th>Referência</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="fii in carteiraMercado"
              :key="fii.ticker"
            >
              <td><strong>{{ fii.ticker }}</strong></td>
              <td>{{ fii.quantidade }}</td>
              <td>{{ moeda(fii.precoMedio) }}</td>

              <td>
                {{
                  fii.precoAtual === null
                    ? 'Indisponível'
                    : moeda(fii.precoAtual)
                }}
              </td>

              <td>
                {{
                  fii.valorMercado === null
                    ? '—'
                    : moeda(fii.valorMercado)
                }}
              </td>

              <td
                :class="{
                  positive: fii.resultado > 0,
                  negativo: fii.resultado < 0,
                }"
              >
                {{
                  fii.resultado === null
                    ? '—'
                    : moeda(fii.resultado)
                }}
              </td>

              <td>
                {{ horario(fii.atualizadoEm) }}
                <small v-if="erros[fii.ticker]" class="erro-cotacao">
                  Falha na consulta
                </small>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-else class="estado-vazio">
          <h3>Sua carteira está vazia</h3>
          <p>Registre uma compra para começar a acompanhar suas cotações.</p>
          <RouterLink to="/carteira" class="text-link">
            Ir para Carteira Patrimonial →
          </RouterLink>
        </div>
      </div>
    </div>

    <div class="section-heading">
      <div>
        <h2>Explore a plataforma</h2>
        <p>Suas ferramentas de investimentos.</p>
      </div>
    </div>

    <div class="features-grid">
      <RouterLink
        v-for="atalho in atalhos"
        :key="atalho.rota"
        :to="atalho.rota"
        class="feature-card"
      >
        <div class="feature-icon">{{ atalho.icone }}</div>
        <h3>{{ atalho.titulo }}</h3>
        <p>{{ atalho.desc }}</p>
        <span class="feature-link">Explorar →</span>
      </RouterLink>
    </div>

    <p class="nota">
      Cotações fornecidas pela brapi.dev, sujeitas a atraso.
      O resultado considera apenas as cotas em carteira:
      não inclui dividendos recebidos, vendas realizadas,
      taxas, impostos ou eventuais eventos corporativos.
    </p>
  </section>
</template>

<style scoped>
.atualizar-cotacoes {
  background: var(--bm-navy);
  color: var(--bm-surface);
  border: 1px solid var(--bm-navy);
  border-radius: 9px;
  padding: 12px 17px;
  font-weight: 700;
  cursor: pointer;
}

.atualizar-cotacoes:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.negativo {
  color: var(--bm-negative);
}

.resumo-carteira {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 19px;
  color: var(--bm-text-secondary);
  font-size: 13px;
}

.resumo-carteira strong {
  color: var(--bm-text);
}

.aviso-mercado {
  background: var(--bm-warning-bg);
  border: 1px solid var(--bm-warning-border);
  color: var(--bm-warning-text);
  padding: 15px;
  border-radius: 10px;
  margin-top: 20px;
  font-size: 13px;
}

.erro-cotacao {
  display: block;
  color: var(--bm-negative);
  margin-top: 4px;
}

.estado-vazio {
  text-align: center;
  padding: 40px 20px;
}

.nota {
  font-size: 12px;
  margin-top: 25px;
}

@media (max-width: 760px) {
  .atualizar-cotacoes {
    width: 100%;
  }
}
</style>
