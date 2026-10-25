
<script setup>
import { ref, computed, watch } from 'vue'
import { useCarteira } from '../composables/useCarteira'
import { useCotacoes } from '../composables/useCotacoes'

// Dados compartilhados com o Dashboard
const {
  operacoes,
  posicoes,
  patrimonio,
  totalCotas,
} = useCarteira()


const {
  cotacoes,
  carregando,
  atualizarCotacoes,
} = useCotacoes()

const tickers = computed(() =>
  posicoes.value.map(fii => fii.ticker)
)

// Consulta cotações ao abrir a página ou alterar a carteira.
watch(
  tickers,
  novos => {
    if (novos.length) atualizarCotacoes(novos)
  },
  { immediate: true }
)

const posicoesMercado = computed(() =>
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

const coberturaCompleta = computed(() =>
  posicoesMercado.value.length > 0 &&
  posicoesMercado.value.every(fii => fii.valorMercado !== null)
)

const patrimonioMercado = computed(() => {
  if (!coberturaCompleta.value) return null

  return posicoesMercado.value.reduce(
    (total, fii) => total + fii.valorMercado, 0
  )
})

const resultadoTotal = computed(() =>
  patrimonioMercado.value === null
    ? null
    : patrimonioMercado.value - patrimonio.value
)

const resultadoPercentual = computed(() =>
  resultadoTotal.value === null || patrimonio.value <= 0
    ? null
    : resultadoTotal.value / patrimonio.value * 100
)

const formatarPercentual = valor =>
  `${valor >= 0 ? '+' : ''}${valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`

const formatarHorario = valor => {
  if (!valor) return 'Não informado'

  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return 'Não informado'

  return data.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  })
}


const hoje = new Date()
const dataAtual = [
  hoje.getFullYear(),
  String(hoje.getMonth() + 1).padStart(2, '0'),
  String(hoje.getDate()).padStart(2, '0'),
].join('-')

const formulario = ref({
  tipo: 'compra',
  ticker: '',
  quantidade: 1,
  preco: null,
  data: dataAtual,
})

const erro = ref('')
const sucesso = ref('')

const moeda = (valor) =>
  Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

function adicionarOperacao() {
  erro.value = ''
  sucesso.value = ''

  const ticker = formulario.value.ticker.trim().toUpperCase()
  const quantidade = Number(formulario.value.quantidade)
  const preco = Number(formulario.value.preco)
  const tipo = formulario.value.tipo
  const data = formulario.value.data

  if (!/^[A-Z0-9]{5,12}$/.test(ticker)) {
    erro.value = 'Informe um ticker válido, como HGLG11.'
    return
  }

  if (!Number.isSafeInteger(quantidade) || quantidade <= 0) {
    erro.value = 'A quantidade deve ser um número inteiro positivo.'
    return
  }

  if (!Number.isFinite(preco) || preco <= 0) {
    erro.value = 'Informe um preço válido maior que zero.'
    return
  }

  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    erro.value = 'Selecione uma data válida.'
    return
  }

  if (tipo !== 'compra' && tipo !== 'venda') {
    erro.value = 'Selecione uma operação válida.'
    return
  }

  // Não permite vender mais cotas do que o usuário possui
  if (tipo === 'venda') {
    const posicao = posicoes.value.find(
      (fii) => fii.ticker === ticker
    )

    if (!posicao || posicao.quantidade < quantidade) {
      erro.value = 'Você não possui cotas suficientes para vender.'
      return
    }
  }

  operacoes.value.push({
    id: crypto.randomUUID(),
    tipo,
    ticker,
    quantidade,
    preco,
    data,
  })

  sucesso.value = 'Operação registrada com sucesso!'

  formulario.value = {
    tipo: 'compra',
    ticker: '',
    quantidade: 1,
    preco: null,
    data: dataAtual,
  }
}

function desfazerUltima() {
  if (operacoes.value.length === 0) return

  const confirmou = window.confirm(
    'Deseja desfazer a última operação registrada?'
  )

  if (!confirmou) return

  operacoes.value.pop()
  sucesso.value = 'Última operação desfeita.'
  erro.value = ''
}
</script>

<template>
  <section>
    <div class="eyebrow">BELMAR STATE / PORTFÓLIO</div>

    <h1>
      Carteira Patrimonial <span class="accent">.</span>
    </h1>

    <p>
      Registre suas operações e acompanhe seus fundos imobiliários.
    </p>

    <!-- INDICADORES -->
    <div class="carteira-stats">
      <article class="stat-card">
        <div class="stat-heading">
          Capital investido
          <span>◈</span>
        </div>

        <h2>{{ moeda(patrimonio) }}</h2>
        <p>Custo das cotas em carteira</p>
      </article>

      <article class="stat-card">
        <div class="stat-heading">
          Fundos diferentes
          <span>▣</span>
        </div>

        <h2>{{ posicoes.length }}</h2>
        <p>FIIs com posições ativas</p>
      </article>

      <article class="stat-card">
        <div class="stat-heading">
          Quantidade de cotas
          <span>◎</span>
        </div>

        <h2>{{ totalCotas }}</h2>
        <p>Total de cotas dos seus FIIs</p>
      </article>
    </div>


<div class="mercado-resumo">
  <div class="mercado-cabecalho">
    <h2>Desempenho de Mercado</h2>

    <button
      class="botao-secundario"
      :disabled="carregando"
      @click="atualizarCotacoes(tickers, true)"
    >
      {{ carregando ? 'Atualizando...' : '↻ Atualizar cotações' }}
    </button>
  </div>

  <div class="mercado-indicadores">
    <article class="stat-card">
      <div class="stat-heading">Valor de mercado</div>
      <h2>
        {{
          patrimonioMercado === null
            ? '—'
            : moeda(patrimonioMercado)
        }}
      </h2>
    </article>

    <article class="stat-card">
      <div class="stat-heading">Lucro / Prejuízo</div>
      <h2
        :class="{
          positive: resultadoTotal > 0,
          negativo: resultadoTotal < 0,
        }"
      >
        {{
          resultadoTotal === null
            ? '—'
            : moeda(resultadoTotal)
        }}
      </h2>
    </article>

    <article class="stat-card">
      <div class="stat-heading">Variação percentual</div>
      <h2
        :class="{
          positive: resultadoPercentual > 0,
          negativo: resultadoPercentual < 0,
        }"
      >
        {{
          resultadoPercentual === null
            ? '—'
            : formatarPercentual(resultadoPercentual)
        }}
      </h2>
    </article>
  </div>

  <p v-if="posicoes.length && !coberturaCompleta">
    {{
      carregando
        ? 'Consultando cotações...'
        : 'Algumas cotações estão indisponíveis.'
    }}
  </p>
</div>

    <!-- FORMULÁRIO E POSIÇÕES -->
    <div class="carteira-layout">
      <div class="painel">
        <h2>Nova operação</h2>

        <p>
          Adicione uma compra ou venda à sua carteira.
        </p>

        <form @submit.prevent="adicionarOperacao">
          <label for="tipo">Tipo da operação</label>

          <select id="tipo" v-model="formulario.tipo">
            <option value="compra">Compra</option>
            <option value="venda">Venda</option>
          </select>

          <label for="ticker">Código do FII</label>

          <input
            id="ticker"
            v-model="formulario.ticker"
            placeholder="Ex: MXRF11"
            maxlength="12"
            required
          />

          <label for="quantidade">Quantidade de cotas</label>

          <input
            id="quantidade"
            v-model.number="formulario.quantidade"
            type="number"
            min="1"
            step="1"
            required
          />

          <label for="preco">Preço por cota (R$)</label>

          <input
            id="preco"
            v-model.number="formulario.preco"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Ex: 10.50"
            required
          />

          <label for="data">Data da operação</label>

          <input
            id="data"
            v-model="formulario.data"
            type="date"
            required
          />

          <div v-if="erro" class="mensagem erro">
            {{ erro }}
          </div>

          <div v-if="sucesso" class="mensagem sucesso">
            {{ sucesso }}
          </div>

          <button
            type="submit"
            class="primary-button botao-full"
          >
            Registrar operação →
          </button>
        </form>
      </div>

      <!-- ATIVOS -->
      <div class="painel">
        <h2>Meus ativos</h2>

        <p>
          Posições calculadas automaticamente.
        </p>

        <div class="table-scroll">
          
<table v-if="posicoes.length">
  <thead>
    <tr>
      <th>FII</th>
      <th>Cotas</th>
      <th>Preço médio</th>
      <th>Cotação</th>
      <th>Custo total</th>
      <th>Valor de mercado</th>
      <th>Lucro / Prejuízo</th>
      <th>Referência</th>
    </tr>
  </thead>

  <tbody>
    <tr
      v-for="fii in posicoesMercado"
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

      <td>{{ moeda(fii.custo) }}</td>

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
        <template v-if="fii.resultado !== null">
          {{ moeda(fii.resultado) }}

          <small class="variacao">
            {{ formatarPercentual(fii.percentual) }}
          </small>
        </template>

        <template v-else>—</template>
      </td>

      <td>{{ formatarHorario(fii.atualizadoEm) }}</td>
    </tr>
  </tbody>
</table>


          <div v-else class="estado-vazio">
            <div>▣</div>

            <h3>Sua carteira está vazia</h3>

            <p>
              Registre sua primeira compra para começar.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- HISTÓRICO -->
    <div class="painel historico">
      <div class="historico-topo">
        <div>
          <h2>Histórico de operações</h2>

          <p>
            Todas as compras e vendas registradas.
          </p>
        </div>

        <button
          v-if="operacoes.length"
          class="botao-secundario"
          @click="desfazerUltima"
        >
          Desfazer última
        </button>
      </div>

      <div class="table-scroll">
        <table v-if="operacoes.length">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>FII</th>
              <th>Quantidade</th>
              <th>Preço unitário</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="op in [...operacoes].reverse()"
              :key="op.id"
            >
              <td>
                {{ op.data.split('-').reverse().join('/') }}
              </td>

              <td>
                <span
                  class="tipo-operacao"
                  :class="op.tipo"
                >
                  {{
                    op.tipo === 'compra'
                      ? 'Compra'
                      : 'Venda'
                  }}
                </span>
              </td>

              <td>
                <strong>{{ op.ticker }}</strong>
              </td>

              <td>{{ op.quantidade }}</td>

              <td>{{ moeda(op.preco) }}</td>

              <td>
                {{ moeda(op.quantidade * op.preco) }}
              </td>
            </tr>
          </tbody>
        </table>

        <div v-else class="estado-vazio">
          Nenhuma operação registrada.
        </div>
      </div>
    </div>

    <p class="aviso-dados">
      Seus registros ficam salvos neste navegador.
      O capital investido não representa o valor atual
      de mercado da carteira. Taxas e impostos não estão
      incluídos nos cálculos.
    </p>
  </section>
</template>

<style scoped>
.carteira-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-top: 30px;
}

.carteira-layout {
  display: grid;
  grid-template-columns: minmax(300px, 370px) minmax(0, 1fr);
  gap: 20px;
  margin-top: 24px;
  align-items: start;
}

.painel {
  background: var(--bm-surface);
  border: 1px solid var(--bm-border);
  border-radius: var(--bm-radius);
  padding: 24px;
  min-width: 0;
}

.painel h2 {
  font-size: 22px;
  margin: 0;
}

.painel p {
  font-size: 13px;
  margin: 7px 0 20px;
}

form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

label {
  font-size: 13px;
  color: var(--bm-text-secondary);
  margin-top: 8px;
}

input,
select {
  width: 100%;
  min-width: 0;
  padding: 13px;
  border: 1px solid var(--bm-input-border);
  border-radius: 9px;
  background: var(--bm-surface);
  color: var(--bm-text);
  font: inherit;
}

input:focus,
select:focus {
  border-color: var(--bs-selection-border);
}

.botao-full {
  width: 100%;
  border: 0;
  margin-top: 14px;
}

.mensagem {
  font-size: 13px;
  padding: 10px;
  border-radius: 8px;
}

.erro {
  background: var(--bm-warning-bg);
  color: var(--bm-warning-text);
}

.sucesso {
  background: var(--bm-info-bg);
  color: var(--bm-text);
}

.historico {
  margin-top: 24px;
}

.historico-topo {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 15px;
}

.botao-secundario {
  background: transparent;
  border: 1px solid var(--bm-input-border);
  color: var(--bm-text);
  border-radius: 8px;
  padding: 10px 13px;
  cursor: pointer;
}

.botao-secundario:hover {
  border-color: var(--bs-selection-border);
  color: var(--bs-link);
}

.tipo-operacao {
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  padding: 5px 9px;
}

.compra {
  background: var(--bm-info-bg);
  color: var(--bm-text);
}

.venda {
  background: var(--bm-surface-muted);
  color: var(--bm-text);
}

.estado-vazio {
  text-align: center;
  padding: 50px 12px;
  color: var(--bm-text-secondary);
}

.estado-vazio div {
  font-size: 40px;
  color: var(--bs-link);
}

.estado-vazio h3 {
  margin: 12px 0 0;
}

.aviso-dados {
  font-size: 12px;
  margin-top: 20px;
}

@media (max-width: 1100px) {
  .carteira-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .carteira-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .carteira-stats {
    grid-template-columns: 1fr;
  }

  .historico-topo {
    flex-direction: column;
  }
}


.mercado-resumo {
  margin-top: 30px;
}

.mercado-cabecalho {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 18px;
}

.mercado-cabecalho h2 {
  margin: 0;
  font-size: 23px;
}

.mercado-indicadores {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

@media (min-width: 761px) and (max-width: 1100px) {
  .mercado-indicadores { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

.negativo {
  color: var(--bm-negative);
}

.variacao {
  display: block;
  margin-top: 5px;
  font-size: 11px;
}

.botao-secundario:disabled {
  opacity: .5;
  cursor: not-allowed;
}

@media (max-width: 760px) {
  .mercado-indicadores {
    grid-template-columns: 1fr;
  }

  .mercado-cabecalho {
    flex-direction: column;
    align-items: flex-start;
  }
}

</style>
