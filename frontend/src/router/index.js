
import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { criarGuardaAuth } from './guardaAuth'
import LoginView from '../views/LoginView.vue'
import CadastroView from '../views/CadastroView.vue'
import DashboardView from '../views/DashboardView.vue'
import EmConstrucaoView from '../views/EmConstrucaoView.vue'
import CarteiraView from '../views/CarteiraView.vue'
import CalendarioView from '../views/CalendarioView.vue'
import ConquistasView from '../views/ConquistasView.vue'
import DnaView from '../views/DnaView.vue'
import BelmarAcademyView from '../views/BelmarAcademyView.vue'
import BelmarDigitalView from '../views/BelmarDigitalView.vue'
import ExplorarView from '../views/ExplorarView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginView, meta: { publica: true, somenteVisitante: true, authPage: true } },
    { path: '/cadastro', name: 'cadastro', component: CadastroView, meta: { publica: true, somenteVisitante: true, authPage: true } },
    { path: '/', name: 'dashboard', component: DashboardView },
    { path: '/academy', name: 'academy', component: BelmarAcademyView, meta: { publica: true } },
    { path: '/digital', name: 'digital', component: BelmarDigitalView, meta: { publica: true } },
    { path: '/explorar', name: 'explorar', component: ExplorarView, meta: { publica: true } },
    { path: '/carteira', name: 'carteira', component: CarteiraView },
    { path: '/calendario', name: 'calendario', component: CalendarioView },
    { path: '/conquistas', name: 'conquistas', component: ConquistasView },
    { path: '/dna', name: 'dna', component: DnaView },
  ],
})

router.beforeEach(criarGuardaAuth(useAuth()))

export default router
