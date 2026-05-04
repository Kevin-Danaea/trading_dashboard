<script setup lang="ts">
import type { Trade } from '../../../shared/domain/types'

const props = defineProps<{
  symbols: Array<{ id: string; symbol: string; market_type: Trade['marketType'] }>
  setups: Array<{ id: string; name: string }>
}>()
const emit = defineEmits<{ submitTrade: [payload: Record<string, unknown>]; createSymbol: [payload: Record<string, unknown>] }>()

const nowLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
const form = reactive({
  symbolId: '',
  setupId: '',
  side: 'long',
  openedAt: nowLocal(),
  closedAt: nowLocal(),
  session: 'NY AM',
  plannedStop: 0,
  plannedTarget: 0,
  averageEntry: 0,
  averageExit: 0,
  quantity: 1,
  plannedRiskAmount: 100,
  grossPnl: 0,
  fees: 0,
  slippageEstimate: 0,
  followedPlan: true,
  confidence: 7,
  executionScore: 7,
  emotion: 'Focused',
  notes: ''
})

const symbolForm = reactive({
  symbol: '',
  baseAsset: '',
  quoteAsset: '',
  marketType: 'crypto_futures'
})

watch(() => props.symbols, (symbols) => {
  if (!form.symbolId && symbols[0]) form.symbolId = symbols[0].id
}, { immediate: true })

const selectedSymbol = computed(() => props.symbols.find((symbol) => symbol.id === form.symbolId))

const submit = () => {
  emit('submitTrade', {
    ...form,
    setupId: form.setupId || null,
    marketType: selectedSymbol.value?.market_type ?? 'crypto_futures',
    openedAt: new Date(form.openedAt).toISOString(),
    closedAt: new Date(form.closedAt).toISOString(),
    plannedTarget: form.plannedTarget || undefined
  })
}

const addSymbol = () => {
  const [baseAsset, quoteAsset] = symbolForm.symbol.includes('/')
    ? symbolForm.symbol.split('/')
    : [symbolForm.baseAsset, symbolForm.quoteAsset]

  emit('createSymbol', {
    symbol: symbolForm.symbol.toUpperCase(),
    baseAsset: (baseAsset || symbolForm.baseAsset).toUpperCase(),
    quoteAsset: (quoteAsset || symbolForm.quoteAsset).toUpperCase(),
    marketType: symbolForm.marketType
  })
  symbolForm.symbol = ''
  symbolForm.baseAsset = ''
  symbolForm.quoteAsset = ''
}
</script>

<template>
  <div class="card">
    <div class="card-head">
      <h3>Log trade</h3>
      <span class="meta">Manual · Supabase</span>
    </div>
    <form class="card-body grid" style="grid-template-columns: repeat(4, 1fr);" @submit.prevent="submit">
      <div class="field">
        <label>Symbol</label>
        <select v-model="form.symbolId" class="input mono" required>
          <option v-for="symbol in symbols" :key="symbol.id" :value="symbol.id">{{ symbol.symbol }}</option>
        </select>
      </div>
      <div class="field">
        <label>Setup</label>
        <select v-model="form.setupId" class="input">
          <option value="">None</option>
          <option v-for="setup in setups" :key="setup.id" :value="setup.id">{{ setup.name }}</option>
        </select>
      </div>
      <div class="field">
        <label>Side</label>
        <select v-model="form.side" class="input mono">
          <option value="long">LONG</option>
          <option value="short">SHORT</option>
        </select>
      </div>
      <div class="field">
        <label>Session</label>
        <select v-model="form.session" class="input mono">
          <option>Asia</option>
          <option>London</option>
          <option>NY AM</option>
          <option>NY PM</option>
          <option>Overnight</option>
        </select>
      </div>
      <div class="field"><label>Opened</label><input v-model="form.openedAt" class="input mono" type="datetime-local" required /></div>
      <div class="field"><label>Closed</label><input v-model="form.closedAt" class="input mono" type="datetime-local" required /></div>
      <div class="field"><label>Entry</label><input v-model.number="form.averageEntry" class="input mono" type="number" step="0.00000001" min="0" required /></div>
      <div class="field"><label>Exit</label><input v-model.number="form.averageExit" class="input mono" type="number" step="0.00000001" min="0" required /></div>
      <div class="field"><label>Stop</label><input v-model.number="form.plannedStop" class="input mono" type="number" step="0.00000001" min="0" required /></div>
      <div class="field"><label>Target</label><input v-model.number="form.plannedTarget" class="input mono" type="number" step="0.00000001" min="0" /></div>
      <div class="field"><label>Quantity</label><input v-model.number="form.quantity" class="input mono" type="number" step="0.00000001" min="0" required /></div>
      <div class="field"><label>Planned risk $</label><input v-model.number="form.plannedRiskAmount" class="input mono" type="number" step="0.01" min="0" required /></div>
      <div class="field"><label>Gross P&L</label><input v-model.number="form.grossPnl" class="input mono" type="number" step="0.01" required /></div>
      <div class="field"><label>Fees</label><input v-model.number="form.fees" class="input mono" type="number" step="0.01" min="0" /></div>
      <div class="field"><label>Slippage</label><input v-model.number="form.slippageEstimate" class="input mono" type="number" step="0.01" min="0" /></div>
      <div class="field"><label>Emotion</label><input v-model="form.emotion" class="input" /></div>
      <div class="field"><label>Confidence</label><input v-model.number="form.confidence" class="input mono" type="number" min="1" max="10" /></div>
      <div class="field"><label>Execution</label><input v-model.number="form.executionScore" class="input mono" type="number" min="1" max="10" /></div>
      <div class="field" style="grid-column: span 2;"><label>Notes</label><input v-model="form.notes" class="input" placeholder="Thesis, mistake, lesson..." /></div>
      <label style="display: flex; align-items: center; gap: 8px; color: var(--ink-1);">
        <input v-model="form.followedPlan" type="checkbox" /> Followed plan
      </label>
      <div style="display: flex; justify-content: flex-end;"><button class="btn btn-primary" type="submit"><AppIcon name="plus" /> Save trade</button></div>
    </form>

    <div class="card-body" style="border-top: 1px solid var(--line-1);">
      <div class="chips">
        <span class="lbl">Add symbol</span>
        <input v-model="symbolForm.symbol" class="input mono" style="width: 130px;" placeholder="ETH/USDT" />
        <select v-model="symbolForm.marketType" class="input mono" style="width: 150px;">
          <option value="crypto_futures">crypto_futures</option>
          <option value="cfd">cfd</option>
          <option value="forex">forex</option>
          <option value="stocks">stocks</option>
        </select>
        <button class="btn btn-sm" type="button" @click="addSymbol">Create</button>
      </div>
    </div>
  </div>
</template>
