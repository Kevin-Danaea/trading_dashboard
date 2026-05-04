<script setup lang="ts">
const emit = defineEmits<{ signedIn: [] }>()
const supabase = useSupabaseClient()
const mode = ref<'password' | 'magic'>('password')
const email = ref('')
const password = ref('')
const loading = ref(false)
const message = ref('')
const error = ref('')

const signIn = async () => {
  loading.value = true
  error.value = ''
  message.value = ''
  try {
    if (mode.value === 'magic') {
      const { error: signInError } = await supabase.auth.signInWithOtp({ email: email.value })
      if (signInError) throw signInError
      message.value = 'Te envié el magic link. Revisa tu correo.'
      return
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })
    if (signInError) throw signInError
    emit('signedIn')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No pude iniciar sesión'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-screen" data-theme="dark" data-density="medium" data-accent="brass">
    <section class="auth-card">
      <div class="brand" style="padding: 0; border: 0;">
        <div class="brand-mark">L</div>
        <div>
          <div class="brand-name">Ledger</div>
          <div class="brand-sub">Trade Journal</div>
        </div>
      </div>
      <div>
        <h1>Trade Journal</h1>
        <p>Accede a tu workspace privado para registrar BTC/USDT, XAU/USD y medir ejecución real.</p>
      </div>
      <div class="tabs">
        <button class="tab" :aria-selected="mode === 'password'" @click="mode = 'password'">Password</button>
        <button class="tab" :aria-selected="mode === 'magic'" @click="mode = 'magic'">Magic link</button>
      </div>
      <form class="col" @submit.prevent="signIn">
        <div class="field">
          <label>Email</label>
          <input v-model="email" class="input mono" type="email" autocomplete="email" required />
        </div>
        <div v-if="mode === 'password'" class="field">
          <label>Password</label>
          <input v-model="password" class="input mono" type="password" autocomplete="current-password" required />
        </div>
        <button class="btn btn-primary" type="submit" :disabled="loading" style="justify-content: center;">
          {{ loading ? 'Connecting...' : mode === 'magic' ? 'Send magic link' : 'Sign in' }}
        </button>
      </form>
      <div v-if="message" class="alert info"><AppIcon name="info" />{{ message }}</div>
      <div v-if="error" class="alert loss"><AppIcon name="warn" />{{ error }}</div>
    </section>
  </div>
</template>
