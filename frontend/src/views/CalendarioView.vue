
<script setup>
import { ref, computed, watch } from 'vue'
import { useCarteira } from '../composables/useCarteira'

const { operacoes, posicoes } = useCarteira()
const CHAVE = 'belmar-proventos-v1'

function carregarProventos() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE) || '[]')
    return Array.isArray(dados) ? dados : []
  } catch {
    return []
  }
}

const proventos = ref(carregarProventos())
const hoje = new Date()
const ano = ref(hoje.getFullYear())
const mes = ref(hoje.getMonth())
const diaSelecionado = ref(null)
const erro = ref('')
const sucesso = ref('')

const formatoData = (data) =>
  `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`

const hojeISO = formatoData(hoje)

const formulario = ref({
  ticker: '',
  valor: null,
  dataCom: hojeISO,
  pagamento: hojeISO,
  status: 'confirmado',
})

const moeda = (valor) =>
  Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

const moedaPrecisa = (valor) =>
  Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })

function dataValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor || '')) return false
  const [a, m, d] = valor.split('-').map(Number)
  const data = new Date(a, m - 1, d)
  return data.getFullYear() === a &&
    data.getMonth() === m - 1 &&
    data.getDate() === d
}

function formatarData(valor) {
  return valor.split('-').reverse().join('/')
}

// Reconstitui a quantidade de cotas ao final da data-com.
// Inclui compras e vendas realizadas naquele dia.
function cotasNaData(ticker, dataCom) {
  let quantidade = 0

  const historico = operacoes.value
    .filter(op => op.ticker === ticker && op.data <= dataCom)
    .map((op, indice) => ({ ...op, indice }))
    .sort((a, b) =>
      a.data.localeCompare(b.data) || a.indice - b.indice
    )

  for (const op of historico) {
    const qtd = Number(op.quantidade)
    if (!Number.isSafeInteger(qtd) || qtd <= 0) continue

    if (op.tipo === 'compra') {
      quantidade += qtd
    } else if (op.tipo === 'venda') {
      quantidade = Math.max(0, quantidade - qtd)
    }
  }

  return quantidade
}

// Calcula individualmente o direito ao rendimento.
const eventos = computed(() =>
  proventos.value
    .map(provento => {
      const cotas = cotasNaData(
        provento.ticker,
        provento.dataCom
      )

      return {
        ...provento,
        cotas,
        total: Number((cotas * provento.valor).toFixed(6)),
      }
    })
    .sort((a, b) =>
      a.pagamento.localeCompare(b.pagamento) ||
      a.ticker.localeCompare(b.ticker)
    )
)

const nomeMes = computed(() =>
  new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(ano.value, mes.value, 1))
)

const prefixoMes = computed(() =>
  `${ano.value}-${String(mes.value + 1).padStart(2, '0')}`
)

const eventosDoMes = computed(() =>
  eventos.value.filter(e => e.pagamento.startsWith(prefixoMes.value))
)

const eventosComDireito = computed(() =>
  eventosDoMes.value.filter(e => e.cotas > 0)
)

const totalMes = computed(() =>
  eventosComDireito.value.reduce((s, e) => s + e.total, 0)
)

const totalConfirmado = computed(() =>
  eventosComDireito.value
    .filter(e => e.status === 'confirmado')
    .reduce((s, e) => s + e.total, 0)
)

const totalEstimado = computed(() =>
  eventosComDireito.value
    .filter(e => e.status === 'estimado')
    .reduce((s, e) => s + e.total, 0)
)

const calendario = computed(() => {
  const primeiroDia = new Date(ano.value, mes.value, 1)
  const ultimoDia = new Date(ano.value, mes.value + 1, 0).getDate()

  // Segunda-feira será o primeiro dia da semana.
  const deslocamento = (primeiroDia.getDay() + 6) % 7
  const dias = Array(deslocamento).fill(null)

  for (let dia = 1; dia <= ultimoDia; dia++) {
    const data = formatoData(new Date(ano.value, mes.value, dia))

    dias.push({
      numero: dia,
      data,
      hoje: data === hojeISO,
      eventos: eventosDoMes.value.filter(e => e.pagamento === data),
    })
  }

  while (dias.length % 7 !== 0) dias.push(null)

  return dias
})

const eventosSelecionados = computed(() =>
  diaSelecionado.value
    ? eventosDoMes.value.filter(e => e.pagamento === diaSelecionado.value)
    : eventosDoMes.value
)

watch(proventos, dados => {
  localStorage.setItem(CHAVE, JSON.stringify(dados))
}, { deep: true })

function mudarMes(direcao) {
  const proximo = new Date(ano.value, mes.value + direcao, 1)
  ano.value = proximo.getFullYear()
  mes.value = proximo.getMonth()
  diaSelecionado.value = null
}

function cadastrarProvento() {
  erro.value = ''
  sucesso.value = ''

  const ticker = formulario.value.ticker.trim().toUpperCase()
  const valor = Number(formulario.value.valor)
  const dataCom = formulario.value.dataCom
  const pagamento = formulario.value.pagamento

  if (!/^[A-Z0-9]{5,12}$/.test(ticker)) {
    erro.value = 'Informe um ticker válido.'
    return
  }

  if (!Number.isFinite(valor) || valor <= 0) {
    erro.value = 'Informe um rendimento por cota maior que zero.'
    return
  }

  if (!dataValida(dataCom) || !dataValida(pagamento)) {
    erro.value = 'Informe datas válidas.'
    return
  }

  if (pagamento < dataCom) {
    erro.value = 'O pagamento não pode ocorrer antes da data-com.'
    return
  }

  if (!['estimado', 'confirmado'].includes(formulario.value.status)) {
    erro.value = 'Selecione um status válido.'
    return
  }

  const duplicado = proventos.value.some(p =>
    p.ticker === ticker &&
    p.dataCom === dataCom &&
    p.pagamento === pagamento
  )

  if (duplicado) {
    erro.value = 'Esse provento já foi cadastrado.'
    return
  }

  proventos.value.push({
    id: crypto.randomUUID(),
    ticker,
    valor,
    dataCom,
    pagamento,
    status: formulario.value.status,
  })

  const [a, m] = pagamento.split('-').map(Number)
  ano.value = a
  mes.value = m - 1
  diaSelecionado.value = pagamento

  formulario.value.ticker = ''
  formulario.value.valor = null

  sucesso.value = 'Provento cadastrado com sucesso!'
}

function excluirProvento(id) {
  if (!window.confirm('Deseja excluir este provento?')) return
  proventos.value = proventos.value.filter(p => p.id !== id)
}

function selecionarDia(dia) {
  diaSelecionado.value =
    diaSelecionado.value === dia.data ? null : dia.data
}

const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
</script>

<template>
  <section class="calendario-page">
    <div class="eyebrow">BELMAR STATE / PROVENTOS</div>

    <h1>Agenda de Proventos <span class="accent">.</span></h1>

    <p>
      Acompanhe os rendimentos dos seus FIIs e descubra
      quanto você tem direito a receber.
    </p>

    <div class="resumo-grid">
      <article class="stat-card">
        <div class="stat-heading">Proventos do mês <span>◈</span></div>
        <h2>{{ moeda(totalMes) }}</h2>
        <p>Confirmados e estimados</p>
      </article>

      <article class="stat-card">
        <div class="stat-heading">Confirmados <span>✓</span></div>
        <h2 class="positive">{{ moeda(totalConfirmado) }}</h2>
        <p>Anúncios cadastrados como confirmados</p>
      </article>

      <article class="stat-card">
        <div class="stat-heading">Estimados <span>◷</span></div>
        <h2>{{ moeda(totalEstimado) }}</h2>
        <p>Valores hipotéticos</p>
      </article>

      <article class="stat-card">
        <div class="stat-heading">Eventos elegíveis <span>▦</span></div>
        <h2>{{ eventosComDireito.length }}</h2>
        <p>Proventos com direito calculado</p>
      </article>
    </div>

    <div class="calendario-layout">
      <article class="painel calendario-painel">
        <div class="calendario-topo">
          <div>
            <h2>{{ nomeMes }}</h2>
            <span>Selecione um dia para consultar os pagamentos</span>
          </div>

          <div class="navegacao-mes">
            <button @click="mudarMes(-1)" aria-label="Mês anterior">‹</button>
            <button @click="mudarMes(1)" aria-label="Próximo mês">›</button>
          </div>
        </div>

        <div class="legenda">
          <span><i class="ponto confirmado"></i> Confirmado</span>
          <span><i class="ponto estimado"></i> Estimado</span>
        </div>

        <div class="grade-calendario">
          <div v-for="dia in diasSemana" :key="dia" class="dia-semana">
            {{ dia }}
          </div>

          <div
            v-for="(dia, indice) in calendario"
            :key="indice"
            class="dia-calendario"
            :class="{
              vazio: !dia,
              hoje: dia?.hoje,
              selecionado: dia && diaSelecionado === dia.data,
              clicavel: dia,
            }"
            @click="dia && selecionarDia(dia)"
          >
            <template v-if="dia">
              <span class="numero-dia">{{ dia.numero }}</span>

              <div class="indicadores-dia">
                <span
                  v-for="evento in dia.eventos"
                  :key="evento.id"
                  class="marcador"
                  :class="evento.status"
                  :title="`${evento.ticker}: ${moeda(evento.total)}`"
                ></span>
              </div>

              <small v-if="dia.eventos.some(e => e.cotas > 0)">
                {{ moeda(dia.eventos.reduce((s, e) => s + e.total, 0)) }}
              </small>
            </template>
          </div>
        </div>
      </article>

      <article class="painel">
        <h2>Registrar provento</h2>
        <p>Insira um anúncio ou uma estimativa de rendimento.</p>

        <form @submit.prevent="cadastrarProvento">
          <label for="provento-ticker">Código do FII</label>
          <input
            id="provento-ticker"
            v-model="formulario.ticker"
            list="fiis-carteira"
            placeholder="Ex: MXRF11"
            maxlength="12"
            required
          />

          <datalist id="fiis-carteira">
            <option
              v-for="fii in posicoes"
              :key="fii.ticker"
              :value="fii.ticker"
            />
          </datalist>

          <label for="provento-valor">Rendimento por cota (R$)</label>
          <input
            id="provento-valor"
            v-model.number="formulario.valor"
            type="number"
            min="0.000001"
            step="any"
            placeholder="Ex: 0.10"
            required
          />

          <label for="data-com">Data-com</label>
          <input
            id="data-com"
            v-model="formulario.dataCom"
            type="date"
            required
          />

          <label for="data-pagamento">Data de pagamento</label>
          <input
            id="data-pagamento"
            v-model="formulario.pagamento"
            type="date"
            required
          />

          <label for="status-provento">Situação</label>
          <select id="status-provento" v-model="formulario.status">
            <option value="confirmado">Confirmado</option>
            <option value="estimado">Estimado</option>
          </select>

          <div v-if="erro" class="alerta erro">{{ erro }}</div>
          <div v-if="sucesso" class="alerta sucesso">{{ sucesso }}</div>

          <button class="primary-button botao-full" type="submit">
            Adicionar provento →
          </button>
        </form>
      </article>
    </div>

    <article class="painel lista-eventos">
      <div class="lista-topo">
        <div>
          <h2>
            {{ diaSelecionado
              ? 'Pagamentos de ' + formatarData(diaSelecionado)
              : 'Pagamentos de ' + nomeMes }}
          </h2>
          <p>Valores calculados pela quantidade de cotas na data-com.</p>
        </div>

        <button
          v-if="diaSelecionado"
          class="botao-secundario"
          @click="diaSelecionado = null"
        >
          Ver mês inteiro
        </button>
      </div>

      <div class="table-scroll" v-if="eventosSelecionados.length">
        <table>
          <thead>
            <tr>
              <th>FII</th>
              <th>Data-com</th>
              <th>Pagamento</th>
              <th>Cotas</th>
              <th>R$/cota</th>
              <th>Total</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="evento in eventosSelecionados" :key="evento.id">
              <td><strong>{{ evento.ticker }}</strong></td>
              <td>{{ formatarData(evento.dataCom) }}</td>
              <td>{{ formatarData(evento.pagamento) }}</td>
              <td>{{ evento.cotas }}</td>
              <td>{{ moedaPrecisa(evento.valor) }}</td>
              <td class="positive">{{ moeda(evento.total) }}</td>
              <td>
                <span class="status" :class="evento.status">
                  {{ evento.status === 'confirmado' ? 'Confirmado' : 'Estimado' }}
                </span>
              </td>
              <td>
                <button
                  class="excluir"
                  @click="excluirProvento(evento.id)"
                  title="Excluir provento"
                >
                  ×
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="estado-vazio">
        <div>▦</div>
        <h3>Nenhum provento encontrado</h3>
        <p>Cadastre um rendimento para começar a preencher seu calendário.</p>
      </div>
    </article>

    <p class="aviso-dados">
      Proventos inseridos manualmente e armazenados apenas neste navegador.
      O status "confirmado" é informado pelo usuário, não verificado pela plataforma.
      A data-com determina a elegibilidade; o pagamento não é considerado
      efetivamente recebido apenas por ter uma data cadastrada.
      As quantidades são reconstruídas pelas datas das operações registradas,
      sem ajustes por eventos corporativos.
    </p>
  </section>
</template>

<style scoped>
.resumo-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin: 30px 0 24px;
}

.calendario-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(290px, 1fr);
  gap: 20px;
  align-items: start;
}

.painel {
  background: var(--bm-surface);
  border: 1px solid var(--bm-border);
  border-radius: var(--bm-radius);
  padding: 24px;
  min-width: 0;
}

.painel h2 { font-size: 22px; margin: 0; }
.painel p { font-size: 13px; margin: 8px 0 20px; }

.calendario-topo, .lista-topo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.calendario-topo h2 { text-transform: capitalize; }
.calendario-topo span { color: var(--bm-text-secondary); font-size: 12px; }

.navegacao-mes { display: flex; gap: 8px; }

.navegacao-mes button {
  width: 35px;
  height: 35px;
  border: 1px solid var(--bm-input-border);
  border-radius: 8px;
  background: var(--bm-navy-secondary);
  color: var(--bm-surface);
  font-size: 25px;
  cursor: pointer;
}

.navegacao-mes button:hover { border-color: var(--bm-navy-secondary); }

.legenda {
  display: flex;
  gap: 18px;
  margin: 24px 0 15px;
  color: var(--bm-text-secondary);
  font-size: 12px;
}

.ponto, .marcador {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.ponto.confirmado, .marcador.confirmado { background: var(--bm-positive); }
.ponto.estimado, .marcador.estimado { background: var(--bm-gold); }

.grade-calendario {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 5px;
}

.dia-semana {
  text-align: center;
  padding: 12px 0;
  color: var(--bm-text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.dia-calendario {
  min-width: 0;
  min-height: 88px;
  border: 1px solid var(--bm-border);
  background: var(--bm-surface);
  border-radius: 8px;
  padding: 9px;
  overflow: hidden;
}

.dia-calendario.clicavel { cursor: pointer; }
.dia-calendario.clicavel:hover { border-color: var(--bm-navy-secondary); }
.dia-calendario.vazio { background: transparent; border-color: transparent; }
.dia-calendario.hoje { border-color: var(--bm-gold); }
.dia-calendario.selecionado { background: var(--bm-info-bg); border-color: var(--bm-navy-secondary); }

.numero-dia { font-size: 13px; font-weight: 600; }
.indicadores-dia { display: flex; gap: 3px; flex-wrap: wrap; margin: 10px 0 5px; }
.dia-calendario small { font-size: 10px; color: var(--bm-positive); overflow-wrap: anywhere; }

form { display: flex; flex-direction: column; gap: 10px; }
label { font-size: 12px; color: var(--bm-text-secondary); margin-top: 7px; }

input, select {
  width: 100%;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--bm-input-border);
  background: var(--bm-surface);
  color: var(--bm-text);
  border-radius: 8px;
  font: inherit;
}

input:focus, select:focus { border-color: var(--bm-navy-secondary); }
.botao-full { width: 100%; border: 0; margin-top: 14px; cursor: pointer; }

.lista-eventos { margin-top: 24px; }
.lista-topo { align-items: start; margin-bottom: 15px; }

.botao-secundario {
  background: transparent;
  border: 1px solid var(--bm-input-border);
  color: var(--bm-text);
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
}

.status { font-size: 11px; border-radius: 6px; padding: 5px 8px; }
.status.confirmado { background: var(--bm-info-bg); color: var(--bm-text); }
.status.estimado { background: var(--bm-gold-bg); color: var(--bm-gold-text); }

.excluir {
  background: transparent;
  border: 0;
  color: var(--bm-text-secondary);
  font-size: 24px;
  cursor: pointer;
}

.alerta { padding: 10px; border-radius: 8px; font-size: 12px; }
.erro { background: var(--bm-warning-bg); color: var(--bm-warning-text); }
.sucesso { background: var(--bm-info-bg); color: var(--bm-text); }

.estado-vazio { text-align: center; padding: 45px 12px; color: var(--bm-text-secondary); }
.estado-vazio div { font-size: 40px; color: var(--bm-navy-secondary); }
.estado-vazio h3 { margin: 12px 0 0; }
.aviso-dados { font-size: 12px; margin-top: 20px; }

@media (max-width: 1150px) {
  .resumo-grid { grid-template-columns: repeat(2, 1fr); }
  .calendario-layout { grid-template-columns: 1fr; }
}

@media (max-width: 760px) {
  .resumo-grid { grid-template-columns: 1fr; }
  .painel { padding: 14px; }
  .dia-calendario { min-height: 64px; padding: 4px; }
  .dia-calendario small { font-size: 8px; }
  .calendario-topo, .lista-topo { flex-wrap: wrap; }
}
</style>
