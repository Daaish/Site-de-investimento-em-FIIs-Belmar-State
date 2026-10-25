
<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

const fundos = ref([])
const carregando = ref(false)
const erro = ref('')

const pesquisa = ref('')
const tipo = ref('Todos')
const dyMinimo = ref(0)
const ordenacao = ref('ticker')

const moeda = valor =>
  Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

const percentual = valor =>
  `${Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })}%`

async function buscarFundos() {
  carregando.value = true
  erro.value = ''

  try {
    const resposta = await fetch('/api/buscar')

    if (!resposta.ok) {
      throw new Error(`Erro HTTP ${resposta.status}`)
    }

    const dados = await resposta.json()

    if (!Array.isArray(dados)) {
      throw new Error('Formato de resposta inesperado.')
    }

    fundos.value = dados.map(fii => ({
      codigo: String(fii.codigo ?? ''),
      tipo: String(fii.tipo ?? ''),
      setor: String(fii.setor ?? ''),
      dy: Number(fii.dy),
      preco: Number(fii.preco),
    }))
  } catch (e) {
    erro.value = `Não foi possível carregar os FIIs: ${e.message}`
    fundos.value = []
  } finally {
    carregando.value = false
  }
}

onMounted(buscarFundos)

const tipos = computed(() => [
  'Todos',
  ...new Set(fundos.value.map(f => f.tipo).filter(Boolean)),
])

const fundosFiltrados = computed(() => {
  const termo = pesquisa.value.trim().toLowerCase()

  const lista = fundos.value.filter(fii => {
    const correspondePesquisa =
      fii.codigo.toLowerCase().includes(termo) ||
      fii.setor.toLowerCase().includes(termo)

    const correspondeTipo =
      tipo.value === 'Todos' ||
      fii.tipo === tipo.value

    const correspondeDY =
      Number.isFinite(fii.dy) &&
      fii.dy >= Number(dyMinimo.value)

    return correspondePesquisa &&
      correspondeTipo &&
      correspondeDY
  })

  return lista.sort((a, b) => {
    if (ordenacao.value === 'dy') return b.dy - a.dy
    if (ordenacao.value === 'preco-menor') return a.preco - b.preco
    if (ordenacao.value === 'preco-maior') return b.preco - a.preco
    return a.codigo.localeCompare(b.codigo)
  })
})

const dyMedio = computed(() => {
  const validos = fundos.value.filter(f => Number.isFinite(f.dy))

  if (!validos.length) return 0

  return validos.reduce((s, f) => s + f.dy, 0) / validos.length
})

const menorPreco = computed(() => {
  const precos = fundos.value
    .map(f => f.preco)
    .filter(v => Number.isFinite(v) && v >= 0)

  return precos.length ? Math.min(...precos) : null
})

function limparFiltros() {
  pesquisa.value = ''
  tipo.value = 'Todos'
  dyMinimo.value = 0
  ordenacao.value = 'ticker'
}
</script>

<template>
  <section class="explorar-page">
    <div class="eyebrow">BELMAR STATE / MERCADO</div>

    <div class="cabecalho">
      <div>
        <h1>Mercado de FIIs <span class="accent">.</span></h1>
        <p>
          Descubra e compare fundos imobiliários
          disponíveis em nossa base de dados.
        </p>
      </div>

      <button
        class="atualizar"
        :disabled="carregando"
        @click="buscarFundos"
      >
        ↻ {{ carregando ? 'Carregando...' : 'Atualizar dados' }}
      </button>
    </div>

    <div class="aviso-base">
      <span>ⓘ</span>
      <div>
        <strong>Base de demonstração</strong>
        <p>
          Informações provenientes do JSON do projeto.
          Os valores não representam cotações em tempo real.
          O DY apresentado é o indicador da base, sem atualização automática.
        </p>
      </div>
    </div>

    <div class="stats-explorar">
      <article class="stat-card">
        <div class="stat-heading">Fundos cadastrados <span>▣</span></div>
        <h2>{{ fundos.length }}</h2>
        <p>Disponíveis na base</p>
      </article>

      <article class="stat-card">
        <div class="stat-heading">DY médio da base <span>↗</span></div>
        <h2 class="positive">{{ percentual(dyMedio) }}</h2>
        <p>Média simples dos fundos cadastrados</p>
      </article>

      <article class="stat-card">
        <div class="stat-heading">Menor preço cadastrado <span>◈</span></div>
        <h2>{{ menorPreco === null ? '—' : moeda(menorPreco) }}</h2>
        <p>Não indica fundo mais barato em valuation</p>
      </article>
    </div>

    <div class="painel-filtros">
      <div class="filtros-titulo">
        <div>
          <h2>Encontre seu próximo estudo</h2>
          <p>Combine filtros para encontrar fundos na base.</p>
        </div>

        <button class="limpar" @click="limparFiltros">
          Limpar filtros
        </button>
      </div>

      <div class="filtros-grid">
        <div class="campo pesquisa-campo">
          <label for="pesquisa">Pesquisar</label>
          <input
            id="pesquisa"
            v-model="pesquisa"
            type="search"
            placeholder="Ticker ou setor..."
          />
        </div>

        <div class="campo">
          <label for="tipo">Tipo</label>
          <select id="tipo" v-model="tipo">
            <option
              v-for="opcao in tipos"
              :key="opcao"
              :value="opcao"
            >
              {{ opcao }}
            </option>
          </select>
        </div>

        <div class="campo">
          <label for="dy">DY mínimo (%)</label>
          <input
            id="dy"
            v-model.number="dyMinimo"
            type="number"
            min="0"
            max="100"
            step="0.5"
          />
        </div>

        <div class="campo">
          <label for="ordenacao">Ordenar por</label>
          <select id="ordenacao" v-model="ordenacao">
            <option value="ticker">Ticker (A–Z)</option>
            <option value="dy">Maior DY</option>
            <option value="preco-menor">Menor preço</option>
            <option value="preco-maior">Maior preço</option>
          </select>
        </div>
      </div>
    </div>

    <div class="resultados-topo">
      <div>
        <h2>Fundos encontrados</h2>
        <p>{{ fundosFiltrados.length }} resultado(s)</p>
      </div>
    </div>

    <div v-if="erro" class="mensagem-erro">
      <p>{{ erro }}</p>
      <button @click="buscarFundos">Tentar novamente</button>
    </div>

    <div v-else-if="carregando" class="estado-vazio">
      Carregando fundos imobiliários...
    </div>

    <div v-else-if="!fundosFiltrados.length" class="estado-vazio">
      <div class="icone-vazio">⌕</div>
      <h3>Nenhum fundo encontrado</h3>
      <p>Experimente alterar os filtros de pesquisa.</p>
    </div>

    <div v-else class="grade-fundos">
      <article
        v-for="fii in fundosFiltrados"
        :key="fii.codigo"
        class="fundo-card"
      >
        <div class="fundo-topo">
          <div class="ticker-icon">
            {{ fii.codigo.slice(0, 2) }}
          </div>

          <div class="fundo-identificacao">
            <h3>{{ fii.codigo }}</h3>
            <span>{{ fii.setor }}</span>
          </div>

          <span class="tipo-badge">{{ fii.tipo }}</span>
        </div>

        <div class="fundo-indicadores">
          <div>
            <span>Preço de referência</span>
            <strong>
              {{ Number.isFinite(fii.preco) ? moeda(fii.preco) : '—' }}
            </strong>
          </div>

          <div>
            <span>Dividend Yield</span>
            <strong class="positive">
              {{ Number.isFinite(fii.dy) ? percentual(fii.dy) : '—' }}
            </strong>
          </div>
        </div>

        <div class="fundo-rodape">
          <span>Informações da base local</span>

          <RouterLink to="/carteira" class="link-carteira">
            Minha Carteira →
          </RouterLink>
        </div>
      </article>
    </div>

    <p class="aviso-rodape">
      Os indicadores são informativos, não constituem recomendação
      de investimento. Dividend Yield histórico não garante
      distribuições futuras.
    </p>
  </section>
</template>

<style scoped>
.cabecalho {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.cabecalho h1 { margin-bottom: 7px; }
.cabecalho p { margin: 0; }

.atualizar, .limpar {
  background: var(--bs-action-bg);
  border: 1px solid var(--bs-action-bg);
  color: var(--bs-action-text);
  padding: 12px 17px;
  border-radius: 9px;
  cursor: pointer;
}

.atualizar:hover, .limpar:hover {
  background: var(--bs-action-bg);
}

.atualizar:disabled { opacity: .5; cursor: not-allowed; }

.aviso-base {
  display: flex;
  gap: 15px;
  align-items: flex-start;
  background: var(--bm-info-bg);
  border: 1px solid var(--bm-border);
  border-radius: 12px;
  padding: 17px;
  margin: 27px 0;
}

.aviso-base > span { font-size: 24px; color: var(--bs-link); }
.aviso-base strong { font-size: 13px; }
.aviso-base p { font-size: 12px; margin: 5px 0 0; }

.stats-explorar {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 25px;
}

.painel-filtros {
  background: var(--bm-surface);
  border: 1px solid var(--bm-border);
  border-radius: var(--bm-radius);
  padding: 26px;
}

.filtros-titulo, .resultados-topo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 22px;
}

.filtros-titulo h2, .resultados-topo h2 {
  font-size: 23px;
  margin: 0;
}

.filtros-titulo p, .resultados-topo p {
  margin: 5px 0 0;
  font-size: 12px;
}

.filtros-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 9px;
  min-width: 0;
}

.campo label { color: var(--bm-text-secondary); font-size: 12px; }

.campo input, .campo select {
  width: 100%;
  min-width: 0;
  background: var(--bm-surface);
  border: 1px solid var(--bm-input-border);
  border-radius: 9px;
  padding: 13px;
  color: var(--bm-text);
  font: inherit;
}

.campo input:focus, .campo select:focus {
  border-color: var(--bs-selection-border);
}

.resultados-topo { margin-top: 35px; }

.grade-fundos {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.fundo-card {
  background: var(--bm-surface);
  border: 1px solid var(--bm-border);
  border-radius: var(--bm-radius);
  padding: 23px;
  transition: .2s;
}

.fundo-card:hover {
  border-color: var(--bm-gold);
}

.fundo-topo {
  display: flex;
  align-items: center;
  gap: 13px;
}

.ticker-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--bm-surface-muted);
  color: var(--bs-link);
  font-weight: 800;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.fundo-identificacao { min-width: 0; flex: 1; }
.fundo-identificacao h3 { font-size: 19px; margin: 0; }
.fundo-identificacao span { overflow-wrap: anywhere; color: var(--bm-text-secondary); font-size: 12px; }

.tipo-badge {
  background: var(--bm-surface-muted);
  color: var(--bm-text-secondary);
  padding: 7px 10px;
  border-radius: 20px;
  font-size: 11px;
}

.fundo-indicadores {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin: 25px 0;
}

.fundo-indicadores > div {
  min-width: 0;
  overflow-wrap: anywhere;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fundo-indicadores span {
  color: var(--bm-text-secondary);
  font-size: 12px;
}

.fundo-indicadores strong { font-size: 21px; }

.fundo-rodape {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--bm-border);
  padding-top: 17px;
  align-items: center;
}

.fundo-rodape span { color: var(--bm-text-secondary); font-size: 11px; }
.link-carteira { color: var(--bs-link); font-weight: 700; font-size: 12px; }

.estado-vazio, .mensagem-erro {
  text-align: center;
  background: var(--bm-surface);
  border: 1px solid var(--bm-border);
  border-radius: 13px;
  padding: 45px 20px;
}

.icone-vazio { color: var(--bs-link); font-size: 45px; }
.mensagem-erro p { color: var(--bm-warning-text); }
.mensagem-erro button {
  background: var(--bs-action-bg);
  color: var(--bs-action-text);
  border: 0;
  border-radius: 8px;
  padding: 11px 18px;
  cursor: pointer;
}

.aviso-rodape { margin-top: 24px; font-size: 12px; }

@media (max-width: 1100px) {
  .stats-explorar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .filtros-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 760px) {
  .cabecalho { flex-direction: column; align-items: flex-start; }
  .stats-explorar, .grade-fundos, .filtros-grid {
    grid-template-columns: 1fr;
  }
  .painel-filtros { padding: 17px; }
  .fundo-topo, .fundo-rodape, .resultados-topo { flex-wrap: wrap; }
  .fundo-identificacao { flex-basis: 120px; }
  .filtros-titulo { flex-direction: column; align-items: flex-start; }
}
</style>
