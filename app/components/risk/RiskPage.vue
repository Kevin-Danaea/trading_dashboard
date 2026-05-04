<script setup lang="ts">
import { formatCurrency } from '../../../shared/domain/format'

type RiskProfile = {
  id: string
  account_id: string
  max_risk_per_trade_pct: number
  daily_loss_limit_amount: number
  weekly_loss_limit_amount: number
  max_consecutive_losses: number
  cooldown_minutes_after_stop: number
}

type RiskRule = {
  id: string
  profile_id: string
  code: string
  name: string
  enabled: boolean
  severity: 'info' | 'warn' | 'block'
  params: Record<string, unknown>
}

type RiskStatus = {
  status: 'allowed' | 'blocked'
  today: {
    usedRiskAmount: number
    dailyLossLimitAmount: number
    lossStreak: number
    maxConsecutiveLosses: number
    remainingRiskAmount: number
  }
  activeBlocks: Array<{ code: string; message: string }>
  warnings: Array<{ code: string; message: string }>
}

const props = defineProps<{
  authHeaders: Record<string, string>
  riskStatus: RiskStatus | null
}>()

const emit = defineEmits<{ refresh: [] }>()

const profile = ref<RiskProfile | null>(null)
const rules = ref<RiskRule[]>([])
const editing = reactive({
  max_risk_per_trade_pct: 1,
  daily_loss_limit_amount: 300,
  weekly_loss_limit_amount: 1000,
  max_consecutive_losses: 2,
  cooldown_minutes_after_stop: 30
})
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const message = ref<string | null>(null)

const fetchProfile = async () => {
  loading.value = true
  error.value = null
  try {
    const data = await $fetch<{ profile: RiskProfile | null; rules: RiskRule[] }>('/api/risk/profile', { headers: props.authHeaders })
    profile.value = data.profile
    rules.value = data.rules
    if (data.profile) {
      editing.max_risk_per_trade_pct = Number(data.profile.max_risk_per_trade_pct)
      editing.daily_loss_limit_amount = Number(data.profile.daily_loss_limit_amount)
      editing.weekly_loss_limit_amount = Number(data.profile.weekly_loss_limit_amount)
      editing.max_consecutive_losses = data.profile.max_consecutive_losses
      editing.cooldown_minutes_after_stop = data.profile.cooldown_minutes_after_stop
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load risk profile'
  } finally {
    loading.value = false
  }
}

const saveProfile = async () => {
  saving.value = true
  error.value = null
  message.value = null
  try {
    await $fetch('/api/risk/profile', {
      method: 'PUT',
      headers: props.authHeaders,
      body: {
        maxRiskPerTradePct: editing.max_risk_per_trade_pct,
        dailyLossLimitAmount: editing.daily_loss_limit_amount,
        weeklyLossLimitAmount: editing.weekly_loss_limit_amount,
        maxConsecutiveLosses: editing.max_consecutive_losses,
        cooldownMinutesAfterStop: editing.cooldown_minutes_after_stop
      }
    })
    message.value = 'Risk profile updated.'
    await fetchProfile()
    emit('refresh')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save'
  } finally {
    saving.value = false
  }
}

const toggleRule = async (rule: RiskRule, enabled: boolean) => {
  try {
    await $fetch(`/api/risk/rules/${rule.id}`, { method: 'PUT', headers: props.authHeaders, body: { enabled } })
    rule.enabled = enabled
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update rule'
  }
}

const updateSeverity = async (rule: RiskRule, severity: RiskRule['severity']) => {
  try {
    await $fetch(`/api/risk/rules/${rule.id}`, { method: 'PUT', headers: props.authHeaders, body: { severity } })
    rule.severity = severity
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update rule'
  }
}

onMounted(() => fetchProfile())
</script>

<template>
  <div class="col" style="padding: var(--gap-grid);">
    <div v-if="error" class="alert loss"><AppIcon name="warn" />{{ error }}</div>
    <div v-if="message" class="alert info"><AppIcon name="info" />{{ message }}</div>

    <div class="grid" style="grid-template-columns: 1fr 1fr;">
      <div class="card">
        <div class="card-head"><h3>Today</h3><span class="meta">Live status</span></div>
        <div class="card-body col" v-if="riskStatus">
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span class="muted">Risk used</span>
              <span class="num">{{ formatCurrency(riskStatus.today.usedRiskAmount, 0) }} <span class="muted">/ {{ formatCurrency(riskStatus.today.dailyLossLimitAmount, 0) }}</span></span>
            </div>
            <div class="bar" :class="riskStatus.status === 'blocked' ? 'neg' : 'warn'">
              <i :style="{ width: `${Math.min(100, (riskStatus.today.usedRiskAmount / Math.max(1, riskStatus.today.dailyLossLimitAmount)) * 100)}%` }" />
            </div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span class="muted">Loss streak</span>
              <span class="num">{{ riskStatus.today.lossStreak }} <span class="muted">/ {{ riskStatus.today.maxConsecutiveLosses }} cutoff</span></span>
            </div>
            <div class="bar"><i :style="{ width: `${Math.min(100, (riskStatus.today.lossStreak / Math.max(1, riskStatus.today.maxConsecutiveLosses)) * 100)}%` }" /></div>
          </div>
          <div :class="['alert', riskStatus.status === 'blocked' ? 'loss' : 'info']">
            <AppIcon :name="riskStatus.status === 'blocked' ? 'warn' : 'info'" />
            <div style="font-size: 11px;">
              <strong v-if="riskStatus.status === 'blocked'">Trading blocked.</strong>
              <span v-else>{{ formatCurrency(riskStatus.today.remainingRiskAmount, 0) }} risk remaining today.</span>
              <div v-for="block in riskStatus.activeBlocks" :key="block.code" class="warn-text">{{ block.message }}</div>
              <div v-for="warn in riskStatus.warnings" :key="warn.code" class="warn-text">{{ warn.message }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Risk profile</h3><span class="meta">Account-level limits</span></div>
        <form class="card-body grid" style="grid-template-columns: 1fr 1fr;" @submit.prevent="saveProfile">
          <div class="field"><label>Max risk per trade %</label><input v-model.number="editing.max_risk_per_trade_pct" class="input mono" type="number" step="0.1" min="0" /></div>
          <div class="field"><label>Daily loss limit $</label><input v-model.number="editing.daily_loss_limit_amount" class="input mono" type="number" step="1" min="0" /></div>
          <div class="field"><label>Weekly loss limit $</label><input v-model.number="editing.weekly_loss_limit_amount" class="input mono" type="number" step="1" min="0" /></div>
          <div class="field"><label>Max consecutive losses</label><input v-model.number="editing.max_consecutive_losses" class="input mono" type="number" step="1" min="1" /></div>
          <div class="field"><label>Cooldown (min)</label><input v-model.number="editing.cooldown_minutes_after_stop" class="input mono" type="number" step="1" min="0" /></div>
          <div style="grid-column: span 2; display: flex; justify-content: flex-end;">
            <button class="btn btn-primary" type="submit" :disabled="saving">{{ saving ? 'Saving...' : 'Save profile' }}</button>
          </div>
        </form>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h3>Risk rules</h3><span class="meta">{{ rules.length }} rules</span></div>
      <div class="table-wrap">
        <table class="t">
          <thead><tr><th>Code</th><th>Name</th><th>Enabled</th><th>Severity</th><th>Params</th></tr></thead>
          <tbody>
            <tr v-for="rule in rules" :key="rule.id">
              <td class="mono">{{ rule.code }}</td>
              <td>{{ rule.name }}</td>
              <td><input type="checkbox" :checked="rule.enabled" @change="toggleRule(rule, ($event.target as HTMLInputElement).checked)" /></td>
              <td>
                <select :value="rule.severity" class="input mono" style="height: 28px;" @change="updateSeverity(rule, ($event.target as HTMLSelectElement).value as RiskRule['severity'])">
                  <option value="info">info</option>
                  <option value="warn">warn</option>
                  <option value="block">block</option>
                </select>
              </td>
              <td class="mono muted" style="font-size: 11px;">{{ JSON.stringify(rule.params) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
