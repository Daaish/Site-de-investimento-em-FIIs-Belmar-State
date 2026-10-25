<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import AuthLayout from '../components/AuthLayout.vue'
const auth = useAuth(), router = useRouter()
const nome = ref(''), email = ref(''), senha = ref(''), confirmacao = ref(''), erroLocal = ref('')
async function enviar() {
  erroLocal.value = ''
  if (senha.value !== confirmacao.value) { erroLocal.value = 'As senhas não coincidem.'; return }
  if (await auth.cadastrar({ nome: nome.value, email: email.value, senha: senha.value })) {
    senha.value = ''; confirmacao.value = ''
    await router.replace({ name: 'login', query: { cadastro: 'ok' } })
  }
}
</script>
<template>
  <AuthLayout titulo="Crie sua conta" descricao="Comece sua experiência na plataforma de inteligência patrimonial.">
    <form class="auth-form" @submit.prevent="enviar">
      <label for="cadastro-nome">Nome</label><input id="cadastro-nome" v-model="nome" name="nome" autocomplete="name" required minlength="2" maxlength="120" :disabled="auth.carregando.value" />
      <label for="cadastro-email">E-mail</label><input id="cadastro-email" v-model="email" name="email" type="email" autocomplete="username" required maxlength="254" :disabled="auth.carregando.value" />
      <label for="cadastro-senha">Senha</label><input id="cadastro-senha" v-model="senha" name="senha" type="password" autocomplete="new-password" required minlength="8" maxlength="128" aria-describedby="senha-ajuda" :disabled="auth.carregando.value" />
      <small id="senha-ajuda">Utilize de 8 a 128 caracteres.</small>
      <label for="cadastro-confirmacao">Confirmar senha</label><input id="cadastro-confirmacao" v-model="confirmacao" name="confirmacao" type="password" autocomplete="new-password" required minlength="8" maxlength="128" :disabled="auth.carregando.value" />
      <p v-if="erroLocal || auth.erro.value" class="auth-error" role="alert">{{ erroLocal || auth.erro.value }}</p>
      <button class="primary-button" type="submit" :disabled="auth.carregando.value || auth.verificando.value">{{ auth.carregando.value ? 'Criando conta...' : 'Criar conta' }}</button>
    </form>
    <p class="auth-switch">Já tem uma conta? <RouterLink to="/login" @click="auth.limparErro">Entrar</RouterLink></p>
  </AuthLayout>
</template>
