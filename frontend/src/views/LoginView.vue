<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import AuthLayout from '../components/AuthLayout.vue'
const auth = useAuth(), router = useRouter()
const email = ref(''), senha = ref('')
async function enviar() {
  if (await auth.entrar({ email: email.value, senha: senha.value })) {
    senha.value = ''
    await router.replace({ name: 'dashboard' })
  }
}
</script>
<template>
  <AuthLayout titulo="Acesse sua conta" descricao="Entre para acompanhar sua carteira e sua jornada na Belmar State.">
    <p v-if="$route.query.cadastro === 'ok'" class="auth-success" role="status">Cadastro concluído. Entre com seu e-mail e senha.</p>
    <form class="auth-form" @submit.prevent="enviar">
      <label for="login-email">E-mail</label><input id="login-email" v-model="email" name="email" type="email" autocomplete="username" required maxlength="254" :disabled="auth.carregando.value" />
      <label for="login-senha">Senha</label><input id="login-senha" v-model="senha" name="senha" type="password" autocomplete="current-password" required minlength="8" maxlength="128" :disabled="auth.carregando.value" />
      <p v-if="auth.erro.value" class="auth-error" role="alert">{{ auth.erro.value }}</p>
      <button class="primary-button" type="submit" :disabled="auth.carregando.value || auth.verificando.value">{{ auth.carregando.value ? 'Entrando...' : 'Entrar' }}</button>
    </form>
    <p class="auth-switch">Ainda não tem conta? <RouterLink to="/cadastro" @click="auth.limparErro">Criar conta</RouterLink></p>
  </AuthLayout>
</template>
