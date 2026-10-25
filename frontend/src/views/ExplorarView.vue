
<script setup>
import { onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useCatalogoFiis } from '../composables/useCatalogoFiis'

const { fundos, pesquisa, ordenacao, pagina, paginacao, estado, motivo, consultadoEm,
  carregando, erro, buscarFundos, limparFiltros, menorPreco } = useCatalogoFiis()
onMounted(buscarFundos)
const moeda = valor => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const aviso = computed(() => {
  if (estado.value === 'local') {
    const razoes = { acesso_indisponivel: 'O acesso à fonte está indisponível.', configuracao: 'A fonte está indisponível.', resposta_invalida: 'A fonte não retornou uma listagem válida.', limite_temporario: 'A fonte está temporariamente limitada.' }
    return `${razoes[motivo.value] || 'A listagem de mercado está indisponível.'} Exibindo somente o cadastro local, sem preços ou indicadores.`
  }
  return estado.value === 'desatualizado'
    ? 'Última listagem disponível: dados desatualizados, mantidos durante uma falha temporária da fonte.'
    : 'Preços de fechamento informados pela brapi, sujeitos a atraso e ao cache de 15 minutos. A fonte não informa o horário de cada fechamento nesta listagem.'
})
const horarioLista = computed(() => {
  const data = new Date(consultadoEm.value)
  return consultadoEm.value && Number.isFinite(data.getTime())
    ? data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : null
})
</script>

<template>
  <section class="explorar-page">
    <div class="eyebrow">BELMAR STATE / MERCADO</div>

    <div class="cabecalho">
      <div>
        <h1>Mercado de FIIs <span class="accent">.</span></h1>
        <p>
          Descubra e compare fundos imobiliários
          com pesquisa e dados de mercado.
        </p>
      </div>

      <button
        class="atualizar"
        :disabled="carregando"
        @click="buscarFundos"
      >
        ↻ {{ carregando ? 'Atualizando...' : 'Atualizar dados' }}
      </button>
    </div>

    <div class="aviso-base" :class="{ 'catalogo-limitado': estado === 'local' || estado === 'desatualizado' }" role="status">
      <span>ⓘ</span>
      <div>
        <strong>{{ estado === 'local' ? 'Catálogo local limitado' : estado === 'desatualizado' ? 'Catálogo desatualizado' : estado === 'atualizado' ? 'Catálogo atualizado' : 'Catálogo de FIIs' }}</strong>
        <p>{{ aviso }}</p>
        <p v-if="horarioLista">Lista consultada em {{ horarioLista }}. Esta é a data de consulta, não do fechamento.</p>
      </div>
    </div>

    <div class="stats-explorar">
      <article class="stat-card">
        <div class="stat-heading">Fundos encontrados <span>▣</span></div>
        <h2>{{ paginacao.total }}</h2>
        <p>Total da pesquisa atual</p>
      </article>

      <article class="stat-card">
        <div class="stat-heading">Dividend Yield médio <span>↗</span></div>
        <h2>—</h2>
        <p>Indisponível: sem fonte verificada</p>
      </article>

      <article class="stat-card">
        <div class="stat-heading">Menor fechamento desta página <span>◈</span></div>
        <h2>{{ menorPreco === null ? '—' : moeda(menorPreco) }}</h2>
        <p>{{ estado === 'desatualizado' ? 'Listagem desatualizada.' : 'Considera somente os resultados desta página.' }}</p>
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
            maxlength="100"
            v-model="pesquisa"
            type="search"
            placeholder="Ticker ou nome..."
          />
        </div>

        <div class="campo">
          <label for="tipo">Tipo</label>
          <select id="tipo" disabled aria-describedby="tipo-indisponivel"><option>Todos os FIIs</option></select>
          <small id="tipo-indisponivel" class="ajuda-filtro">Papel/Tijolo indisponível: a listagem não fornece essa classificação.</small>
        </div>

        <div class="campo">
          <label for="dy">DY mínimo (%)</label>
          <input
            id="dy"
            value="0"
            type="number"
            min="0"
            max="100"
            step="0.5"
            disabled
            aria-describedby="dy-indisponivel"
          />
          <small id="dy-indisponivel" class="ajuda-filtro">DY e ordenação por DY indisponíveis: sem fonte verificada.</small>
        </div>

        <div class="campo">
          <label for="ordenacao">Ordenar por</label>
          <select id="ordenacao" v-model="ordenacao" aria-describedby="dy-indisponivel">
            <option value="nome">Nome (A–Z)</option>
            <option value="nome-desc">Nome (Z–A)</option>
            <option value="volume" :disabled="estado === 'local'">Maior volume</option>
            <option value="variacao" :disabled="estado === 'local'">Maior variação</option>
            <option value="dy" disabled>Maior DY (indisponível)</option>
            <option value="preco-menor" :disabled="estado === 'local'">Menor preço</option>
            <option value="preco-maior" :disabled="estado === 'local'">Maior preço</option>
          </select>
        </div>
      </div>
    </div>

    <div class="resultados-topo">
      <div>
        <h2>Fundos encontrados</h2>
        <p>{{ fundos.length }} nesta página · {{ paginacao.total }} resultado(s)</p>
      </div>
    </div>

    <p v-if="erro && fundos.length" class="aviso-atualizacao" role="status">{{ erro }}</p>
    <p v-if="carregando && fundos.length" class="aviso-atualizacao" role="status">Consultando catálogo; pesquisa e filtros continuam disponíveis.</p>
    <div v-if="erro && !fundos.length" class="mensagem-erro">
      <p>{{ erro }}</p>
      <button @click="buscarFundos">Tentar novamente</button>
    </div>

    <div v-else-if="carregando" class="estado-vazio">
      Carregando fundos imobiliários...
    </div>

    <div v-else-if="!fundos.length" class="estado-vazio">
      <div class="icone-vazio">⌕</div>
      <h3>Nenhum fundo encontrado</h3>
      <p>Experimente alterar os filtros de pesquisa.</p>
    </div>

    <div v-else class="grade-fundos">
      <article
        v-for="fii in fundos"
        :key="fii.codigo"
        class="fundo-card"
      >
        <div class="fundo-topo">
          <div class="ticker-icon">
            {{ fii.codigo.slice(0, 2) }}
          </div>

          <div class="fundo-identificacao">
            <h3>{{ fii.codigo }}</h3>
            <span>{{ fii.nome }}</span>
            <small v-if="fii.setor">Setor informado: {{ fii.setor }}</small>
          </div>

          <span class="tipo-badge">{{ estado === 'local' ? fii.tipo : 'FII' }}</span>
        </div>

        <div class="fundo-indicadores">
          <div>
            <span>Fechamento informado pela brapi</span>
            <strong>{{ fii.preco === null ? 'Indisponível' : moeda(fii.preco) }}</strong>
            <span class="cotacao-status" :class="{ desatualizada: estado === 'desatualizado', indisponivel: fii.preco === null }">
              {{ fii.preco === null ? '— Sem preço disponível' : estado === 'desatualizado' ? '◷ Listagem desatualizada' : '● Listagem dentro do prazo de cache' }}
            </span>
          </div>

          <div>
            <span>Dividend Yield</span>
            <strong>—</strong>
            <small class="referencia-cotacao">Sem fonte verificada</small>
          </div>
          <div><span>P/VP</span><strong>—</strong><small class="referencia-cotacao">Indisponível nesta fonte</small></div>
        </div>

        <div class="fundo-rodape">
          <span>{{ estado === 'local' ? 'Cadastro local limitado' : 'Listagem brapi.dev' }}</span>

          <RouterLink to="/carteira" class="link-carteira">
            Carteira Patrimonial →
          </RouterLink>
        </div>
      </article>
    </div>

    <nav class="paginacao-catalogo" aria-label="Páginas de FIIs">
      <button class="limpar" :disabled="carregando || pagina <= 1" @click="pagina--">← Anterior</button>
      <span>Página {{ pagina }} de {{ Math.max(1, paginacao.totalPages) }}</span>
      <button class="limpar" :disabled="carregando || !paginacao.hasNextPage" @click="pagina++">Próxima →</button>
    </nav>
    <p v-if="estado === 'local'" class="ajuda-filtro">Ordenação por preço, volume e variação indisponível neste modo; resultados locais em ordem alfabética.</p>
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

.ajuda-filtro, .referencia-cotacao, .aviso-atualizacao { font-size: 11px; color: var(--bm-text-secondary); line-height: 1.6; }
.campo input:disabled { cursor: not-allowed; background: var(--bm-surface-muted); }
.fundo-indicadores .cotacao-status { font-size: 10px; padding: 4px 7px; border-radius: 6px; background: var(--bm-info-bg); color: var(--bm-text); }
.fundo-indicadores .cotacao-status.desatualizada { background: var(--bm-warning-bg); color: var(--bm-warning-text); border: 1px solid var(--bm-warning-border); }
.fundo-indicadores .cotacao-status.indisponivel { background: var(--bm-surface-muted); color: var(--bm-text-secondary); }

.catalogo-limitado { background: var(--bm-warning-bg); border-color: var(--bm-warning-border); }
.paginacao-catalogo { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-top: 24px; font-size: 13px; }
.paginacao-catalogo button:disabled { opacity: .5; cursor: not-allowed; }
.fundo-identificacao small { display: block; font-size: 10px; color: var(--bm-text-secondary); overflow-wrap: anywhere; }
</style>
