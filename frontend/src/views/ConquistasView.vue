
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCarteira } from '../composables/useCarteira'

const { operacoes, posicoes, patrimonio, totalCotas } = useCarteira()

const proventos = ref([])

function carregarProventos() {
  try {
    const dados = JSON.parse(
      localStorage.getItem('belmar-proventos-v1') || '[]'
    )
    proventos.value = Array.isArray(dados) ? dados : []
  } catch {
    proventos.value = []
  }
}

onMounted(carregarProventos)

// Todas as conquistas são avaliadas automaticamente.
const conquistas = computed(() => [
  {
    id: 'primeira-compra',
    nome: 'Primeiros Passos',
    descricao: 'Realize sua primeira compra de FII.',
    icone: '🌱',
    xp: 100,
    atual: operacoes.value.filter(o => o.tipo === 'compra').length,
    meta: 1,
    categoria: 'Iniciante',
  },
  {
    id: 'cem-cotas',
    nome: 'Colecionador de Cotas',
    descricao: 'Acumule 100 cotas em sua carteira.',
    icone: '💎',
    xp: 150,
    atual: totalCotas.value,
    meta: 100,
    categoria: 'Patrimônio',
  },
  {
    id: 'diversificador',
    nome: 'Diversificador',
    descricao: 'Tenha pelo menos 3 FIIs diferentes.',
    icone: '🏆',
    xp: 200,
    atual: posicoes.value.length,
    meta: 3,
    categoria: 'Diversificação',
  },
  {
    id: 'primeiro-milhar',
    nome: 'Primeiro Milhar',
    descricao: 'Alcance R$ 1.000 de capital investido.',
    icone: '💰',
    xp: 150,
    atual: patrimonio.value,
    meta: 1000,
    categoria: 'Patrimônio',
  },
  {
    id: 'primeiro-provento',
    nome: 'Caçador de Proventos',
    descricao: 'Cadastre seu primeiro provento no calendário.',
    icone: '📅',
    xp: 100,
    atual: proventos.value.length,
    meta: 1,
    categoria: 'Dividendos',
  },
  {
    id: 'dez-operacoes',
    nome: 'Investidor Ativo',
    descricao: 'Registre 10 operações de investimento.',
    icone: '⚡',
    xp: 200,
    atual: operacoes.value.length,
    meta: 10,
    categoria: 'Atividade',
  },
])

const conquistasDesbloqueadas = computed(() =>
  conquistas.value.filter(c => c.atual >= c.meta)
)

const experiencia = computed(() =>
  conquistasDesbloqueadas.value.reduce((soma, c) => soma + c.xp, 0)
)

const nivel = computed(() =>
  Math.floor(experiencia.value / 200) + 1
)

const xpNivel = computed(() => experiencia.value % 200)

const percentualNivel = computed(() =>
  (xpNivel.value / 200) * 100
)

const percentualConquistas = computed(() =>
  Math.round(
    conquistasDesbloqueadas.value.length / conquistas.value.length * 100
  )
)

const tituloNivel = computed(() => {
  if (nivel.value >= 5) return 'Lenda dos Dividendos'
  if (nivel.value >= 4) return 'Investidor Experiente'
  if (nivel.value >= 3) return 'Estrategista'
  if (nivel.value >= 2) return 'Investidor em Evolução'
  return 'Investidor Iniciante'
})

function progresso(conquista) {
  return Math.min(100, (conquista.atual / conquista.meta) * 100)
}

function valorAtual(conquista) {
  if (conquista.id === 'primeiro-milhar') {
    return `R$ ${Number(conquista.atual).toLocaleString('pt-BR', {
      maximumFractionDigits: 2,
    })}`
  }
  return conquista.atual.toLocaleString('pt-BR')
}
</script>

<template>
  <section class="conquistas-page">
    <div class="eyebrow">BELMAR STATE / GAMIFICAÇÃO</div>
    <h1>Jornada do Investidor <span class="accent">.</span></h1>
    <p>
      Acompanhe seu progresso, complete desafios
      e evolua sua jornada na plataforma.
    </p>

    <div class="nivel-painel">
      <div class="nivel-medalha">🏆</div>

      <div class="nivel-info">
        <span class="nivel-label">SEU NÍVEL ATUAL</span>
        <h2>Nível {{ nivel }} — {{ tituloNivel }}</h2>
        <p>{{ experiencia }} XP conquistados</p>

        <div class="barra-progresso">
          <div :style="{ width: percentualNivel + '%' }"></div>
        </div>

        <div class="nivel-detalhes">
          <span>{{ xpNivel }} / 200 XP</span>
          <span>Próximo nível</span>
        </div>
      </div>
    </div>

    <div class="resumo-conquistas">
      <article class="stat-card">
        <div class="stat-heading">Desbloqueadas <span>★</span></div>
        <h2>{{ conquistasDesbloqueadas.length }}</h2>
        <p>Medalhas conquistadas</p>
      </article>

      <article class="stat-card">
        <div class="stat-heading">Total disponível <span>◈</span></div>
        <h2>{{ conquistas.length }}</h2>
        <p>Desafios existentes</p>
      </article>

      <article class="stat-card">
        <div class="stat-heading">Conclusão <span>◎</span></div>
        <h2>{{ percentualConquistas }}%</h2>
        <p>Seu progresso geral</p>
      </article>
    </div>

    <div class="section-heading">
      <div>
        <h2>Galeria de Conquistas</h2>
        <p>Complete os objetivos para desbloquear medalhas.</p>
      </div>
    </div>

    <div class="grade-conquistas">
      <article
        v-for="conquista in conquistas"
        :key="conquista.id"
        class="conquista-card"
        :class="{ desbloqueada: conquista.atual >= conquista.meta }"
      >
        <div class="conquista-topo">
          <span class="categoria">{{ conquista.categoria }}</span>

          <span
            class="estado"
            :class="{ concluida: conquista.atual >= conquista.meta }"
          >
            {{ conquista.atual >= conquista.meta ? '✓ Desbloqueada' : 'Bloqueada' }}
          </span>
        </div>

        <div
          class="conquista-icone"
          :class="{ bloqueada: conquista.atual < conquista.meta }"
        >
          {{ conquista.icone }}
        </div>

        <h3>{{ conquista.nome }}</h3>
        <p>{{ conquista.descricao }}</p>

        <div class="conquista-progresso">
          <div class="progresso-labels">
            <span>Progresso</span>
            <span>{{ valorAtual(conquista) }} / {{ conquista.meta }}</span>
          </div>

          <div class="barra-progresso">
            <div :style="{ width: progresso(conquista) + '%' }"></div>
          </div>
        </div>

        <div class="conquista-rodape">
          <span>✦ {{ conquista.xp }} XP</span>
          <span v-if="conquista.atual >= conquista.meta">Concluída</span>
          <span v-else>Em andamento</span>
        </div>
      </article>
    </div>

    <p class="aviso-conquistas">
      As conquistas são calculadas pelos registros locais da plataforma.
      Elas podem voltar a ficar bloqueadas caso operações ou proventos
      sejam excluídos. XP e níveis representam apenas gamificação.
    </p>
  </section>
</template>

<style scoped>
.nivel-painel {
  display: flex;
  align-items: center;
  gap: 32px;
  background: var(--bm-surface);
  border: 1px solid var(--bm-border);
  border-radius: 16px;
  padding: 32px;
  margin: 30px 0 22px;
}

.nivel-medalha {
  font-size: 70px;
  background: var(--bm-gold-bg);
  border: 1px solid var(--bm-warning-border);
  border-radius: 50%;
  width: 115px;
  height: 115px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
}

.nivel-info { flex: 1; min-width: 0; }
.nivel-label { color: var(--bm-gold-text); font-size: 11px; letter-spacing: 2px; }
.nivel-info h2 { margin: 8px 0; font-size: 27px; }
.nivel-info p { margin: 0 0 18px; font-size: 13px; }

.barra-progresso {
  height: 9px;
  background: var(--bm-border);
  border-radius: 20px;
  overflow: hidden;
}

.barra-progresso > div {
  height: 100%;
  background: var(--bm-gold);
  border-radius: 20px;
  transition: width .4s ease;
}

.nivel-detalhes {
  display: flex;
  justify-content: space-between;
  margin-top: 9px;
  font-size: 12px;
  color: var(--bm-text-secondary);
}

.resumo-conquistas {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.grade-conquistas {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.conquista-card {
  background: var(--bm-surface);
  border: 1px solid var(--bm-border);
  border-radius: 15px;
  padding: 24px;
  transition: .2s;
}

.conquista-card:hover { border-color: var(--bm-input-border); }
.conquista-card.desbloqueada { border-color: var(--bm-gold); }

.conquista-topo, .conquista-rodape, .progresso-labels {
  flex-wrap: wrap;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.categoria {
  font-size: 11px;
  color: var(--bm-text-secondary);
}

.estado {
  font-size: 10px;
  border-radius: 20px;
  color: var(--bm-text-secondary);
  background: var(--bm-surface-muted);
  padding: 6px 9px;
}

.estado.concluida { background: var(--bm-gold-bg); color: var(--bm-gold-text); }

.conquista-icone {
  font-size: 48px;
  margin: 30px 0 15px;
}

.conquista-icone.bloqueada {
  filter: grayscale(1);
  opacity: .35;
}

.conquista-card h3 { font-size: 19px; margin: 0 0 7px; }
.conquista-card p { font-size: 13px; min-height: 42px; }

.conquista-progresso { margin: 25px 0; }

.progresso-labels {
  color: var(--bm-text-secondary);
  font-size: 11px;
  margin-bottom: 10px;
}

.conquista-rodape {
  border-top: 1px solid var(--bm-border);
  padding-top: 17px;
  color: var(--bm-text);
  font-size: 12px;
  font-weight: 700;
}

.aviso-conquistas { font-size: 12px; margin-top: 25px; }

@media (max-width: 1100px) {
  .resumo-conquistas { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .grade-conquistas { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 760px) {
  .nivel-painel { flex-direction: column; align-items: flex-start; padding: 22px; }
  .nivel-medalha { width: 80px; height: 80px; font-size: 45px; }
  .resumo-conquistas, .grade-conquistas { grid-template-columns: 1fr; }
}
</style>
