<script setup lang="ts">
import type { Trade } from '#shared/domain/types'

const props = defineProps<{
  symbols: Array<{ id: string; symbol: string; market_type: Trade['marketType'] }>
  setups: Array<{ id: string; name: string }>
}>()
const emit = defineEmits<{
  submitTrade: [payload: Record<string, unknown>]
  createSymbol: [payload: Record<string, unknown>]
}>()

const nowLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)

type Outcome = 'target' | 'stop' | 'manual' | 'breakeven'

const form = reactive({
  symbolId: '',
  setupId: '',
  side: 'long' as 'long' | 'short',
  openedAt: nowLocal(),
  closedAt: nowLocal(),
  session: 'NY AM',
  averageEntry: 0,
  plannedStop: 0,
  plannedTarget: 0,
  quantity: 1,
  plannedRiskAmount: 100,
  fees: 0,
  slippageEstimate: 0,
  followedPlan: true,
  confidence: 7,
  executionScore: 7,
  emotion: 'Focused',
  notes: '',
  outcome: 'target' as Outcome,
  manualExit: 0,
  manualPnl: 0
})

const symbolForm = reactive({
  symbol: '',
  baseAsset: '',
  quoteAsset: '',
  marketType: 'crypto_futures'
})

const showSymbolForm = ref(false)

watch(() => props.symbols, (symbols) => {
  if (!form.symbolId && symbols[0]) form.symbolId = symbols[0].id
}, { immediate: true })

const selectedSymbol = computed(() => props.symbols.find((symbol) => symbol.id === form.symbolId))

const stopDistance = computed(() => Math.abs(form.averageEntry - form.plannedStop))
const targetDistance = computed(() => Math.abs(form.plannedTarget - form.averageEntry))
const rrRatio = computed(() => stopDistance.value > 0 ? targetDistance.value / stopDistance.value : 0)

const computedExit = computed(() => {
  if (form.outcome === 'target') return form.plannedTarget
  if (form.outcome === 'stop') return form.plannedStop
  if (form.outcome === 'breakeven') return form.averageEntry
  return form.manualExit
})

const computedPnl = computed(() => {
  if (form.outcome === 'manual') return form.manualPnl
  if (form.outcome === 'breakeven') return 0
  if (form.outcome === 'stop') {
    return -form.plannedRiskAmount
  }
  if (form.outcome === 'target') {
    if (form.quantity > 0) {
      const direction = form.side === 'long' ? 1 : -1
      return (form.plannedTarget - form.averageEntry) * form.quantity * direction
    }
    return form.plannedRiskAmount * rrRatio.value
  }
  return 0
})

const computedRMultiple = computed(() => {
  if (form.plannedRiskAmount <= 0) return 0
  return (computedPnl.value - form.fees - form.slippageEstimate) / form.plannedRiskAmount
})

const submit = () => {
  const exit = computedExit.value
  const gross = computedPnl.value
  emit('submitTrade', {
    symbolId: form.symbolId,
    setupId: form.setupId || null,
    marketType: selectedSymbol.value?.market_type ?? 'crypto_futures',
    side: form.side,
    openedAt: new Date(form.openedAt).toISOString(),
    closedAt: new Date(form.closedAt).toISOString(),
    session: form.session,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Mexico_City',
    plannedEntry: form.averageEntry,
    plannedStop: form.plannedStop,
    plannedTarget: form.outcome === 'target' || form.plannedTarget > 0 ? form.plannedTarget : undefined,
    averageEntry: form.averageEntry,
    averageExit: exit,
    quantity: form.quantity,
    plannedRiskAmount: form.plannedRiskAmount,
    grossPnl: gross,
    fees: form.fees,
    slippageEstimate: form.slippageEstimate,
    followedPlan: form.followedPlan,
    confidence: form.confidence,
    executionScore: form.executionScore,
    emotion: form.emotion || undefined,
    notes: form.notes || undefined
  })
  // reset to allow next entry
  form.notes = ''
  form.manualExit = 0
  form.manualPnl = 0
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
  showSymbolForm.value = false
}

const formatMoney = (value: number) => `${value >= 0 ? '+' : '-'}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
</script>

<template>
  <div class="card">
    <div class="card-head">
      <h3>Add trade</h3>
      <span class="meta">Manual entry · auto-calc P&L from outcome</span>
      <div class="grow" />
      <button class="btn btn-sm btn-ghost" @click="showSymbolForm = !showSymbolForm">{{ showSymbolForm ? 'Hide' : '+ Add symbol' }}</button>
    </div>

    <div v-if="showSymbolForm" class="card-body" style="border-bottom: 1px solid var(--line-1); background: var(--bg-1);">
      <div class="chips">
        <span class="lbl">New symbol</span>
        <input v-model="symbolForm.symbol" class="input mono" style="width: 130px;" placeholder="ETH/USDT" />
        <select v-model="symbolForm.marketType" class="input mono" style="width: 150px;">
          <option value="crypto_futures">crypto_futures</option>
          <option value="crypto_spot">crypto_spot</option>
          <option value="cfd">cfd</option>
          <option value="forex">forex</option>
          <option value="stocks">stocks</option>
          <option value="commodities">commodities</option>
          <option value="futures">futures</option>
        </select>
        <button class="btn btn-sm" type="button" @click="addSymbol">Create</button>
      </div>
    </div>

    <form class="card-body col" @submit.prevent="submit">
      <div class="grid" style="grid-template-columns: repeat(4, 1fr);">
        <div class="field">
          <label>Symbol</label>
          <select v-model="form.symbolId" class="input mono" required>
            <option v-for="symbol in symbols" :key="symbol.id" :value="symbol.id">{{ symbol.symbol }}</option>
          </select>
        </div>
        <div class="field">
          <label>Setup (optional)</label>
          <select v-model="form.setupId" class="input">
            <option value="">None</option>
            <option v-for="setup in setups" :key="setup.id" :value="setup.id">{{ setup.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>Direction</label>
          <div class="chips" style="gap: 4px;">
            <button type="button" class="chip" :aria-pressed="form.side === 'long'" @click="form.side = 'long'" style="flex: 1;">LONG</button>
            <button type="button" class="chip" :aria-pressed="form.side === 'short'" @click="form.side = 'short'" style="flex: 1;">SHORT</button>
          </div>
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
      </div>

      <div class="grid" style="grid-template-columns: repeat(4, 1fr);">
        <div class="field"><label>Opened at</label><input v-model="form.openedAt" class="input mono" type="datetime-local" required /></div>
        <div class="field"><label>Closed at</label><input v-model="form.closedAt" class="input mono" type="datetime-local" required /></div>
        <div class="field"><label>Quantity / size</label><input v-model.number="form.quantity" class="input mono" type="number" step="0.00000001" min="0" required /></div>
        <div class="field"><label>Planned risk $</label><input v-model.number="form.plannedRiskAmount" class="input mono" type="number" step="0.01" min="0" required /></div>
      </div>

      <div class="grid" style="grid-template-columns: repeat(3, 1fr);">
        <div class="field"><label>Entry price</label><input v-model.number="form.averageEntry" class="input mono" type="number" step="0.00000001" min="0" required /></div>
        <div class="field">
          <label>Stop (loss level)</label>
          <input v-model.number="form.plannedStop" class="input mono" type="number" step="0.00000001" min="0" required />
        </div>
        <div class="field">
          <label>Target (profit level)</label>
          <input v-model.number="form.plannedTarget" class="input mono" type="number" step="0.00000001" min="0" />
        </div>
      </div>

      <div class="card" style="background: var(--bg-1); border: 1px solid var(--line-1);">
        <div class="card-body col">
          <div class="lbl">How did the trade end?</div>
          <div class="chips">
            <button type="button" class="chip" :aria-pressed="form.outcome === 'target'" @click="form.outcome = 'target'">🎯 Target hit (profit)</button>
            <button type="button" class="chip" :aria-pressed="form.outcome === 'stop'" @click="form.outcome = 'stop'">🛑 Stop hit (loss)</button>
            <button type="button" class="chip" :aria-pressed="form.outcome === 'breakeven'" @click="form.outcome = 'breakeven'">⏸ Breakeven</button>
            <button type="button" class="chip" :aria-pressed="form.outcome === 'manual'" @click="form.outcome = 'manual'">✏️ Manual exit</button>
          </div>

          <div v-if="form.outcome === 'manual'" class="grid" style="grid-template-columns: 1fr 1fr;">
            <div class="field"><label>Exit price</label><input v-model.number="form.manualExit" class="input mono" type="number" step="0.00000001" min="0" required /></div>
            <div class="field"><label>Gross P&L $</label><input v-model.number="form.manualPnl" class="input mono" type="number" step="0.01" required /></div>
          </div>

          <div class="grid" style="grid-template-columns: repeat(4, 1fr); gap: 12px;">
            <div>
              <div class="lbl">Exit price</div>
              <div class="num" style="font-size: 14px;">{{ computedExit > 0 ? computedExit.toFixed(2) : '—' }}</div>
            </div>
            <div>
              <div class="lbl">Gross P&L</div>
              <div class="num" :class="computedPnl > 0 ? 'pos' : computedPnl < 0 ? 'neg' : ''" style="font-size: 14px;">{{ formatMoney(computedPnl) }}</div>
            </div>
            <div>
              <div class="lbl">Net P&L (after fees)</div>
              <div class="num" :class="(computedPnl - form.fees - form.slippageEstimate) > 0 ? 'pos' : (computedPnl - form.fees - form.slippageEstimate) < 0 ? 'neg' : ''" style="font-size: 14px;">{{ formatMoney(computedPnl - form.fees - form.slippageEstimate) }}</div>
            </div>
            <div>
              <div class="lbl">R multiple</div>
              <div class="num" :class="computedRMultiple > 0 ? 'pos' : computedRMultiple < 0 ? 'neg' : ''" style="font-size: 14px;">{{ computedRMultiple >= 0 ? '+' : '' }}{{ computedRMultiple.toFixed(2) }}R</div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid" style="grid-template-columns: repeat(4, 1fr);">
        <div class="field"><label>Fees</label><input v-model.number="form.fees" class="input mono" type="number" step="0.01" min="0" /></div>
        <div class="field"><label>Slippage</label><input v-model.number="form.slippageEstimate" class="input mono" type="number" step="0.01" min="0" /></div>
        <div class="field"><label>Confidence (1-10)</label><input v-model.number="form.confidence" class="input mono" type="number" min="1" max="10" /></div>
        <div class="field"><label>Execution (1-10)</label><input v-model.number="form.executionScore" class="input mono" type="number" min="1" max="10" /></div>
      </div>

      <div class="grid" style="grid-template-columns: 1fr 1fr;">
        <div class="field"><label>Emotion</label><input v-model="form.emotion" class="input" placeholder="Calm, Focused, FOMO..." /></div>
        <div class="field"><label>Notes / lesson</label><input v-model="form.notes" class="input" placeholder="Thesis, mistake, lesson..." /></div>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between;">
        <label style="display: flex; align-items: center; gap: 8px; color: var(--ink-1);">
          <input v-model="form.followedPlan" type="checkbox" /> I followed my plan
        </label>
        <button class="btn btn-primary" type="submit"><AppIcon name="plus" /> Save trade</button>
      </div>
    </form>
  </div>
</template>
