<script setup lang="ts">
type Profile = {
  id: string
  display_name: string
  timezone: string
  base_currency: string
  onboarding_completed: boolean
}

type Account = {
  id: string
  name: string
  base_currency: string
  starting_balance: number
  is_default: boolean
}

const props = defineProps<{
  authHeaders: Record<string, string>
  profile: Profile | null
  accounts: Account[]
}>()

const emit = defineEmits<{ refresh: [] }>()

const profileForm = reactive({
  display_name: props.profile?.display_name ?? '',
  timezone: props.profile?.timezone ?? 'America/Mexico_City',
  base_currency: props.profile?.base_currency ?? 'USD'
})
watch(() => props.profile, (next) => {
  if (next) {
    profileForm.display_name = next.display_name
    profileForm.timezone = next.timezone
    profileForm.base_currency = next.base_currency
  }
})

const accountEdits = reactive<Record<string, { name: string; base_currency: string; starting_balance: number }>>({})
watch(() => props.accounts, (next) => {
  for (const account of next) {
    accountEdits[account.id] = {
      name: account.name,
      base_currency: account.base_currency,
      starting_balance: Number(account.starting_balance)
    }
  }
}, { immediate: true })

const saving = ref(false)
const error = ref<string | null>(null)
const message = ref<string | null>(null)

const saveProfile = async () => {
  saving.value = true
  error.value = null
  message.value = null
  try {
    await $fetch('/api/profile', {
      method: 'PUT',
      headers: props.authHeaders,
      body: {
        displayName: profileForm.display_name,
        timezone: profileForm.timezone,
        baseCurrency: profileForm.base_currency,
        onboardingCompleted: true
      }
    })
    message.value = 'Profile updated.'
    emit('refresh')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save'
  } finally {
    saving.value = false
  }
}

const saveAccount = async (accountId: string) => {
  const edit = accountEdits[accountId]
  if (!edit) return
  saving.value = true
  error.value = null
  message.value = null
  try {
    await $fetch(`/api/accounts/${accountId}`, {
      method: 'PUT',
      headers: props.authHeaders,
      body: {
        name: edit.name,
        baseCurrency: edit.base_currency,
        startingBalance: edit.starting_balance
      }
    })
    message.value = 'Account updated.'
    emit('refresh')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save'
  } finally {
    saving.value = false
  }
}

const timezones = [
  'America/Mexico_City', 'America/New_York', 'America/Los_Angeles',
  'Europe/London', 'Europe/Madrid', 'Asia/Tokyo', 'Asia/Singapore', 'UTC'
]
</script>

<template>
  <div class="col" style="padding: var(--gap-grid);">
    <div v-if="error" class="alert loss"><AppIcon name="warn" />{{ error }}</div>
    <div v-if="message" class="alert info"><AppIcon name="info" />{{ message }}</div>

    <div class="card">
      <div class="card-head"><h3>Profile</h3><span class="meta">Your trader workspace</span></div>
      <form class="card-body grid" style="grid-template-columns: repeat(3, 1fr);" @submit.prevent="saveProfile">
        <div class="field"><label>Display name</label><input v-model="profileForm.display_name" class="input" required /></div>
        <div class="field">
          <label>Timezone</label>
          <select v-model="profileForm.timezone" class="input mono">
            <option v-for="tz in timezones" :key="tz" :value="tz">{{ tz }}</option>
          </select>
        </div>
        <div class="field">
          <label>Base currency</label>
          <select v-model="profileForm.base_currency" class="input mono">
            <option>USD</option>
            <option>USDT</option>
            <option>USDC</option>
            <option>EUR</option>
            <option>BTC</option>
          </select>
        </div>
        <div style="grid-column: span 3; display: flex; justify-content: flex-end;">
          <button class="btn btn-primary" type="submit" :disabled="saving">{{ saving ? 'Saving...' : 'Save profile' }}</button>
        </div>
      </form>
    </div>

    <div class="card">
      <div class="card-head"><h3>Trading accounts</h3><span class="meta">{{ accounts.length }} accounts</span></div>
      <div class="card-body col">
        <div v-for="account in accounts" :key="account.id" class="card" style="background: var(--bg-1);">
          <div class="card-head">
            <strong>{{ account.name }}</strong>
            <span v-if="account.is_default" class="badge accent">DEFAULT</span>
          </div>
          <form class="card-body grid" style="grid-template-columns: repeat(4, 1fr);" @submit.prevent="saveAccount(account.id)">
            <div class="field" style="grid-column: span 2;"><label>Name</label><input v-model="accountEdits[account.id]!.name" class="input" required /></div>
            <div class="field"><label>Base currency</label>
              <select v-model="accountEdits[account.id]!.base_currency" class="input mono">
                <option>USD</option><option>USDT</option><option>USDC</option><option>EUR</option><option>BTC</option>
              </select>
            </div>
            <div class="field"><label>Starting balance</label><input v-model.number="accountEdits[account.id]!.starting_balance" class="input mono" type="number" step="0.01" min="0" /></div>
            <div style="grid-column: span 4; display: flex; justify-content: flex-end;">
              <button class="btn btn-sm" type="submit" :disabled="saving">Save account</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
