<script setup lang="ts">
import type { Trade } from '../../../shared/domain/types'
import { calculatePerformance } from '../../../shared/domain/metrics'
import { formatCurrency, formatPercent, formatR, formatSignedCurrency } from '../../../shared/domain/format'

const props = defineProps<{
  trades: Trade[]
  setups: Array<{ id: string; name: string }>
  symbols: Array<{ id: string; symbol: string }>
}>()

const filters = reactive({
  from: '',
  to: '',
  symbol: '',
  setupId: '',
  session: '',
  side: ''
})

const filtered = computed(() => {
  let list = props.trades.slice()
  if (filters.from) list = list.filter((trade) => trade.openedAt >= new Date(filters.from).toISOString())
  if (filters.to) list = list.filter((trade) => trade.openedAt <= new Date(filters.to).toISOString())
  if (filters.symbol) list = list.filter((trade) => trade.symbol === filters.symbol)
  if (filters.setupId) list = list.filter((trade) => trade.setupId === filters.setupId)
  if (filters.session) list = list.filter((trade) => trade.session === filters.session)
  if (filters.side) list = list.filter((trade) => trade.side === filters.side)
  return list
})

const metrics = computed(() => calculatePerformance(filtered.value, 0))

const sessions = ['Asia', 'London', 'NY AM', 'NY PM', 'Overnight'] as const
const sides = ['long', 'short']

const sessionRows = computed(() => sessions.map((session) => {
  const sessionTrades = filtered.value.filter((trade) => trade.session === session)
  const m = calculatePerformance(sessionTrades, 0)
  return { label: session, count: sessionTrades.length, winRate: m.winRate, netPnl: m.netPnl, avgR: m.avgR }
}))

const sideRows = computed(() => sides.map((side) => {
  const sideTrades = filtered.value.filter((trade) => trade.side === side)
  const m = calculatePerformance(sideTrades, 0)
  return { label: side, count: sideTrades.length, winRate: m.winRate, netPnl: m.netPnl, avgR: m.avgR }
}))

const monthRows = computed(() => {
  const groups = new Map<string, Trade[]>()
  for (const trade of filtered.value) {
    const key = trade.openedAt.slice(0, 7)
    const arr = groups.get(key) ?? []
    arr.push(trade)
    groups.set(key, arr)
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, list]) => ({ month, count: list.length, ...calculatePerformance(list, 0) }))
})

const reset = () => {
  filters.from = ''
  filters.to = ''
  filters.symbol = ''
  filters.setupId = ''
  filters.session = ''
  filters.side = ''
}
</script>

<template>
  <div class="col" style="padding: var(--gap-grid);">
    <div class="card">
      <div class="card-head"><h3>Filters</h3><div class="grow" /><button class="btn btn-sm btn-ghost" @click="reset">Reset</button></div>
      <div class="card-body grid" style="grid-template-columns: repeat(6, 1fr);">
        <div class="field"><label>From</label><input v-model="filters.from" class="input mono" type="date" /></div>
        <div class="field"><label>To</label><input v-model="filters.to" class="input mono" type="date" /></div>
        <div class="field"><label>Symbol</label>
          <select v-model="filters.symbol" class="input mono">
            <option value="">All</option>
            <option v-for="sym in symbols" :key="sym.id" :value="sym.symbol">{{ sym.symbol }}</option>
          </select>
        </div>
        <div class="field"><label>Setup</label>
          <select v-model="filters.setupId" class="input">
            <option value="">All</option>
            <option v-for="setup in setups" :key="setup.id" :value="setup.id">{{ setup.name }}</option>
          </select>
        </div>
        <div class="field"><label>Session</label>
          <select v-model="filters.session" class="input">
            <option value="">All</option>
            <option v-for="s in sessions" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div class="field"><label>Side</label>
          <select v-model="filters.side" class="input">
            <option value="">All</option>
            <option v-for="s in sides" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="grid" style="grid-template-columns: repeat(4, 1fr);">
      <KpiCard label="Trades" :value="String(metrics.tradeCount)" />
      <KpiCard label="Net P&L" :value="formatSignedCurrency(metrics.netPnl)" :delta-tone="metrics.netPnl >= 0 ? 'pos' : 'neg'" />
      <KpiCard label="Win rate" :value="formatPercent(metrics.winRate)" />
      <KpiCard label="Profit factor" :value="metrics.profitFactor?.toFixed(2) ?? '∞'" />
      <KpiCard label="Expectancy" :value="formatCurrency(metrics.expectancy)" />
      <KpiCard label="Avg R" :value="formatR(metrics.avgR)" />
      <KpiCard label="Max DD" :value="formatPercent(metrics.maxDrawdownPct)" delta-tone="warn" />
      <KpiCard label="Adherence" :value="`${metrics.adherenceScore}%`" />
    </div>

    <div class="grid" style="grid-template-columns: 1fr 1fr;">
      <div class="card">
        <div class="card-head"><h3>By session</h3></div>
        <div class="table-wrap">
          <table class="t mono">
            <thead><tr><th>Session</th><th class="num">Trades</th><th class="num">Win rate</th><th class="num">Net P&L</th><th class="num">Avg R</th></tr></thead>
            <tbody>
              <tr v-for="row in sessionRows" :key="row.label">
                <td>{{ row.label }}</td>
                <td class="num">{{ row.count }}</td>
                <td class="num">{{ formatPercent(row.winRate) }}</td>
                <td :class="['num', row.netPnl >= 0 ? 'pos' : 'neg']">{{ formatSignedCurrency(row.netPnl, 0) }}</td>
                <td class="num">{{ formatR(row.avgR) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h3>By side</h3></div>
        <div class="table-wrap">
          <table class="t mono">
            <thead><tr><th>Side</th><th class="num">Trades</th><th class="num">Win rate</th><th class="num">Net P&L</th><th class="num">Avg R</th></tr></thead>
            <tbody>
              <tr v-for="row in sideRows" :key="row.label">
                <td>{{ row.label }}</td>
                <td class="num">{{ row.count }}</td>
                <td class="num">{{ formatPercent(row.winRate) }}</td>
                <td :class="['num', row.netPnl >= 0 ? 'pos' : 'neg']">{{ formatSignedCurrency(row.netPnl, 0) }}</td>
                <td class="num">{{ formatR(row.avgR) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h3>By month</h3></div>
      <div class="table-wrap">
        <table class="t mono">
          <thead><tr><th>Month</th><th class="num">Trades</th><th class="num">Win rate</th><th class="num">Profit factor</th><th class="num">Net P&L</th><th class="num">Avg R</th></tr></thead>
          <tbody>
            <tr v-for="row in monthRows" :key="row.month">
              <td>{{ row.month }}</td>
              <td class="num">{{ row.tradeCount }}</td>
              <td class="num">{{ formatPercent(row.winRate) }}</td>
              <td class="num">{{ row.profitFactor?.toFixed(2) ?? '∞' }}</td>
              <td :class="['num', row.netPnl >= 0 ? 'pos' : 'neg']">{{ formatSignedCurrency(row.netPnl, 0) }}</td>
              <td class="num">{{ formatR(row.avgR) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
