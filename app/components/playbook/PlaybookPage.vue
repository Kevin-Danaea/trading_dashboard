<script setup lang="ts">
import type { Trade } from '#shared/domain/types'
import { calculatePerformance, setupPerformanceScore } from '#shared/domain/metrics'
import { formatPercent, formatSignedCurrency } from '#shared/domain/format'

type Setup = {
  id: string
  user_id: string
  name: string
  status: 'active' | 'review' | 'paused' | 'archived'
  context: string
  triggers: string
  invalidations: string
  confirmations: string | null
  risk_management: string
  checklist: string[]
  created_at: string
  updated_at: string
}

const props = defineProps<{
  authHeaders: Record<string, string>
  trades: Trade[]
}>()

const emit = defineEmits<{ refresh: [] }>()

const setups = ref<Setup[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const editing = ref<Partial<Setup> | null>(null)
const checklistText = ref('')

const fetchSetups = async () => {
  loading.value = true
  error.value = null
  try {
    setups.value = await $fetch<Setup[]>('/api/setups', { headers: props.authHeaders })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load setups'
  } finally {
    loading.value = false
  }
}

const newSetup = () => {
  editing.value = {
    name: '',
    status: 'active',
    context: '',
    triggers: '',
    invalidations: '',
    confirmations: '',
    risk_management: '',
    checklist: []
  }
  checklistText.value = ''
}

const editSetup = (setup: Setup) => {
  editing.value = { ...setup }
  checklistText.value = setup.checklist.join('\n')
}

const cancel = () => {
  editing.value = null
}

const save = async () => {
  if (!editing.value) return
  const payload = {
    name: editing.value.name,
    status: editing.value.status ?? 'active',
    context: editing.value.context ?? '',
    triggers: editing.value.triggers ?? '',
    invalidations: editing.value.invalidations ?? '',
    confirmations: editing.value.confirmations ?? null,
    riskManagement: editing.value.risk_management ?? '',
    checklist: checklistText.value.split('\n').map((line) => line.trim()).filter(Boolean)
  }
  try {
    if (editing.value.id) {
      await $fetch(`/api/setups/${editing.value.id}`, { method: 'PUT', headers: props.authHeaders, body: payload })
    } else {
      await $fetch('/api/setups', { method: 'POST', headers: props.authHeaders, body: payload })
    }
    editing.value = null
    await fetchSetups()
    emit('refresh')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save'
  }
}

const remove = async (id: string) => {
  if (!confirm('Archive this setup?')) return
  try {
    await $fetch(`/api/setups/${id}`, { method: 'DELETE', headers: props.authHeaders })
    await fetchSetups()
    emit('refresh')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete'
  }
}

const setupStats = computed(() => setups.value.map((setup) => {
  const setupTrades = props.trades.filter((trade) => trade.setupId === setup.id)
  const metrics = calculatePerformance(setupTrades, 0)
  return {
    setup,
    metrics,
    score: setupPerformanceScore(metrics)
  }
}))

onMounted(() => fetchSetups())
</script>

<template>
  <div class="col" style="padding: var(--gap-grid);">
    <div v-if="error" class="alert loss"><AppIcon name="warn" />{{ error }}</div>
    <div class="card">
      <div class="card-head">
        <h3>Playbook · setups</h3>
        <span class="meta">{{ setups.length }} total</span>
        <div class="grow" />
        <button class="btn btn-primary" @click="newSetup"><AppIcon name="plus" /> New setup</button>
      </div>
      <div v-if="loading" class="card-body"><span class="muted">Loading...</span></div>
      <div v-else-if="setups.length === 0" class="card-body"><span class="muted">No setups yet.</span></div>
      <div v-else class="table-wrap">
        <table class="t">
          <thead><tr><th>Setup</th><th>Status</th><th class="num">Trades</th><th class="num">Win rate</th><th class="num">Net P&L</th><th class="num">Score</th><th></th></tr></thead>
          <tbody>
            <tr v-for="row in setupStats" :key="row.setup.id">
              <td>{{ row.setup.name }}</td>
              <td><span :class="['badge', row.setup.status === 'active' ? 'gain' : row.setup.status === 'review' ? 'warn' : '']">{{ row.setup.status }}</span></td>
              <td class="num">{{ row.metrics.tradeCount }}</td>
              <td class="num">{{ formatPercent(row.metrics.winRate) }}</td>
              <td :class="['num', row.metrics.netPnl >= 0 ? 'pos' : 'neg']">{{ formatSignedCurrency(row.metrics.netPnl, 0) }}</td>
              <td class="num">{{ row.score }}</td>
              <td style="display: flex; gap: 4px;">
                <button class="btn btn-sm btn-ghost" @click="editSetup(row.setup)">Edit</button>
                <button class="btn btn-sm btn-ghost" @click="remove(row.setup.id)">Archive</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="editing" class="card">
      <div class="card-head"><h3>{{ editing.id ? 'Edit setup' : 'New setup' }}</h3><div class="grow" /><button class="btn btn-sm btn-ghost" @click="cancel">Cancel</button></div>
      <form class="card-body grid" style="grid-template-columns: repeat(2, 1fr);" @submit.prevent="save">
        <div class="field"><label>Name</label><input v-model="editing.name" class="input" required /></div>
        <div class="field">
          <label>Status</label>
          <select v-model="editing.status" class="input">
            <option value="active">Active</option>
            <option value="review">Review</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div class="field" style="grid-column: span 2;"><label>Context</label><textarea v-model="editing.context" class="input" rows="2" placeholder="Market structure, liquidity, HTF context..." /></div>
        <div class="field"><label>Triggers</label><textarea v-model="editing.triggers" class="input" rows="2" placeholder="Confirmation candle, BoS, volume reaction..." /></div>
        <div class="field"><label>Invalidations</label><textarea v-model="editing.invalidations" class="input" rows="2" placeholder="Close beyond level, time stop..." /></div>
        <div class="field"><label>Confirmations</label><textarea v-model="editing.confirmations" class="input" rows="2" /></div>
        <div class="field"><label>Risk management</label><textarea v-model="editing.risk_management" class="input" rows="2" placeholder="Stop placement, partials..." /></div>
        <div class="field" style="grid-column: span 2;">
          <label>Checklist (one item per line)</label>
          <textarea v-model="checklistText" class="input mono" rows="6" placeholder="HTF context aligned&#10;Risk defined&#10;No news within 30m" />
        </div>
        <div style="grid-column: span 2; display: flex; justify-content: flex-end;">
          <button class="btn btn-primary" type="submit">Save setup</button>
        </div>
      </form>
    </div>
  </div>
</template>
