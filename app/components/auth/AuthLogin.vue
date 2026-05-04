<script setup lang="ts">
const emit = defineEmits<{ signedIn: [] }>()
const supabase = useSupabaseClient()
const mode = ref<'password' | 'magic' | 'signup'>('password')
const email = ref('')
const password = ref('')
const loading = ref(false)
const message = ref('')
const error = ref('')

const submit = async () => {
  loading.value = true
  error.value = ''
  message.value = ''
  try {
    if (mode.value === 'magic') {
      const { error: err } = await supabase.auth.signInWithOtp({ email: email.value })
      if (err) throw err
      message.value = 'Te envié el magic link. Revisa tu correo.'
      return
    }
    if (mode.value === 'signup') {
      const { error: err } = await supabase.auth.signUp({ email: email.value, password: password.value })
      if (err) throw err
      message.value = 'Cuenta creada. Confirma tu correo si está activado, o inicia sesión.'
      mode.value = 'password'
      return
    }
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })
    if (err) throw err
    emit('signedIn')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No pude completar la operación'
  } finally {
    loading.value = false
  }
}

const ctaLabel = computed(() => {
  if (loading.value) return 'Connecting...'
  if (mode.value === 'magic') return 'Send magic link'
  if (mode.value === 'signup') return 'Create account'
  return 'Sign in'
})
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
        <p>Accede a tu workspace privado para registrar trades y medir ejecución real.</p>
      </div>
      <div class="tabs">
        <button class="tab" :aria-selected="mode === 'password'" @click="mode = 'password'">Sign in</button>
        <button class="tab" :aria-selected="mode === 'signup'" @click="mode = 'signup'">Sign up</button>
        <button class="tab" :aria-selected="mode === 'magic'" @click="mode = 'magic'">Magic link</button>
      </div>
      <form class="col" @submit.prevent="submit">
        <div class="field">
          <label>Email</label>
          <input v-model="email" class="input mono" type="email" autocomplete="email" required />
        </div>
        <div v-if="mode !== 'magic'" class="field">
          <label>Password</label>
          <input v-model="password" class="input mono" type="password" :autocomplete="mode === 'signup' ? 'new-password' : 'current-password'" required minlength="6" />
        </div>
        <button class="btn btn-primary" type="submit" :disabled="loading" style="justify-content: center;">
          {{ ctaLabel }}
        </button>
      </form>
      <div v-if="message" class="alert info"><AppIcon name="info" />{{ message }}</div>
      <div v-if="error" class="alert loss"><AppIcon name="warn" />{{ error }}</div>
    </section>
  </div>
</template>
