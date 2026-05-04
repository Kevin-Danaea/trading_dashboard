<script setup lang="ts">
import JournalPage from '../components/journal/JournalPage.vue'
import PlaybookPage from '../components/playbook/PlaybookPage.vue'
import RiskPage from '../components/risk/RiskPage.vue'
import SettingsPage from '../components/settings/SettingsPage.vue'
import AnalyticsPage from '../components/analytics/AnalyticsPage.vue'
import TradeEntryForm from '../components/trades/TradeEntryForm.vue'

const route = ref('overview')
const range = ref('1M')
const supabase = useSupabaseClient()
const dashboard = reactive(useLiveDashboard())

const userEmail = ref<string | null>(null)

const initSession = async () => {
  const { data } = await supabase.auth.getSession()
  dashboard.session = data.session
  userEmail.value = data.session?.user.email ?? null
  await dashboard.refresh()
}

onMounted(async () => {
  await initSession()
  supabase.auth.onAuthStateChange(async (_event, session) => {
    dashboard.session = session
    userEmail.value = session?.user.email ?? null
    if (session) await dashboard.refresh()
  })
})

const signOut = async () => {
  await supabase.auth.signOut()
  dashboard.session = null
}

const filteredTrades = computed(() => dashboard.trades.slice(0, 80))
const selectedResult = ref('all')
const resultTrades = computed(() => selectedResult.value === 'all'
  ? filteredTrades.value
  : filteredTrades.value.filter((trade) => trade.result === selectedResult.value))

const recomputingInsights = ref(false)
const recomputeInsights = async () => {
  recomputingInsights.value = true
  try {
    await $fetch('/api/insights/recompute', { method: 'POST', headers: dashboard.authHeaders })
    await dashboard.refresh()
  } finally {
    recomputingInsights.value = false
  }
}

const heatCells = computed(() => {
  const days: Array<{ key: string; netPnl: number }> = []
  const today = new Date()
  for (let i = 55; i >= 0; i -= 1) {
    const d = new Date(today)
    d.setUTCDate(today.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    const dayTrades = dashboard.trades.filter((trade) => trade.openedAt.slice(0, 10) === key)
    days.push({ key, netPnl: dayTrades.reduce((sum, trade) => sum + trade.netPnl, 0) })
  }
  return days
})

const formatDelta = (value: number, currency = false) => {
  if (Math.abs(value) < 0.001) return '— flat'
  const arrow = value >= 0 ? '▲' : '▼'
  if (currency) return `${arrow} ${dashboard.formatCurrency(Math.abs(value), 0)}`
  return `${arrow} ${Math.abs(value).toFixed(2)}`
}
const formatPercentDelta = (value: number) => {
  if (Math.abs(value) < 0.0001) return '— flat'
  const arrow = value >= 0 ? '▲' : '▼'
  return `${arrow} ${(Math.abs(value) * 100).toFixed(1)}%`
}
const tone = (value: number, invert = false) => {
  if (Math.abs(value) < 0.0001) return 'pos'
  const positive = invert ? value < 0 : value > 0
  return positive ? 'pos' : 'neg'
}

const tradeModalOpen = ref(false)
const handleLogTrade = () => { tradeModalOpen.value = true }
const handleSubmitTrade = async (payload: Record<string, unknown>) => {
  await dashboard.createTrade(payload)
  tradeModalOpen.value = false
}
</script>

<template>
  <AuthLogin v-if="!dashboard.session" @signed-in="initSession" />
  <AppShell
    v-else
    v-model:route="route"
    v-model:range="range"
    :display-name="dashboard.profile?.display_name"
    :email="userEmail ?? undefined"
    :trade-count="dashboard.trades.length"
    :day-streak="dashboard.dayStreak"
    @add-trade="handleLogTrade"
  >
    <section v-if="route === 'overview'" class="grid dashboard-grid" style="grid-template-columns: 1fr 320px; gap: var(--gap-grid); padding: var(--gap-grid);">
      <div class="col">
        <div v-if="dashboard.error" class="alert loss"><AppIcon name="warn" />{{ dashboard.error }}</div>
        <div v-if="dashboard.loading" class="alert info"><AppIcon name="info" />Loading Supabase data...</div>
        <div class="grid overview-main" style="grid-template-columns: repeat(4, 1fr);">
          <KpiCard label="Net P&L · 30d" :value="dashboard.formatSignedCurrency(dashboard.metrics.netPnl)" :delta="formatDelta(dashboard.kpiDeltas.netPnl, true)" delta-label="vs prev 30d" :delta-tone="tone(dashboard.kpiDeltas.netPnl)" :spark-data="dashboard.equity.slice(-30)" />
          <KpiCard label="Win rate" :value="dashboard.formatPercent(dashboard.metrics.winRate)" :delta="formatPercentDelta(dashboard.kpiDeltas.winRate)" delta-label="vs prev 30d" :delta-tone="tone(dashboard.kpiDeltas.winRate)" />
          <KpiCard label="Profit factor" :value="dashboard.metrics.profitFactor?.toFixed(2) ?? '∞'" :delta="formatDelta(dashboard.kpiDeltas.profitFactor)" delta-label="vs prev" :delta-tone="tone(dashboard.kpiDeltas.profitFactor)" />
          <KpiCard label="Expectancy" :value="dashboard.formatCurrency(dashboard.metrics.expectancy)" :delta="formatDelta(dashboard.kpiDeltas.expectancy, true)" delta-label="per trade" :delta-tone="tone(dashboard.kpiDeltas.expectancy)" />
          <KpiCard label="Avg R multiple" :value="dashboard.formatR(dashboard.metrics.avgR)" :delta="formatDelta(dashboard.kpiDeltas.avgR)" delta-label="vs prev" :delta-tone="tone(dashboard.kpiDeltas.avgR)" />
          <KpiCard label="Max drawdown" :value="dashboard.formatPercent(dashboard.metrics.maxDrawdownPct)" :delta="formatPercentDelta(dashboard.kpiDeltas.maxDrawdown)" delta-label="from peak" delta-tone="warn" />
          <KpiCard label="Trades · 7d" :value="String(dashboard.kpiDeltas.weekTrades >= 0 ? dashboard.kpiDeltas.weekTrades : 0)" :delta="formatDelta(dashboard.kpiDeltas.weekTrades)" delta-label="vs last week" :delta-tone="tone(dashboard.kpiDeltas.weekTrades)" />
          <KpiCard label="Adherence score" :value="`${dashboard.metrics.adherenceScore}%`" :delta="formatDelta(dashboard.kpiDeltas.adherence)" delta-label="checklist hit" :delta-tone="tone(dashboard.kpiDeltas.adherence)" />
        </div>

        <div class="card">
          <div class="card-head">
            <h3>Equity curve</h3>
            <span class="badge accent">LIVE</span>
            <span class="meta">Cumulative · {{ dashboard.profile?.base_currency ?? 'USD' }}</span>
            <div class="grow" />
            <div class="tabs">
              <button class="tab" aria-selected="true">Equity</button>
              <button class="tab" aria-selected="false">Drawdown</button>
              <button class="tab" aria-selected="false">R-curve</button>
            </div>
          </div>
          <div class="card-body">
            <EquityChart :points="dashboard.equity" />
            <div style="display: flex; gap: 24px; margin-top: 8px; font-family: var(--font-mono); font-size: 11px;">
              <span><span class="muted">START </span>{{ dashboard.formatCurrency(dashboard.equity[0]!, 0) }}</span>
              <span><span class="muted">PEAK </span>{{ dashboard.formatCurrency(Math.max(...dashboard.equity), 0) }}</span>
              <span><span class="muted">CUR </span><span :class="dashboard.metrics.netPnl >= 0 ? 'pos' : 'neg'">{{ dashboard.formatCurrency(dashboard.equity.at(-1)!, 0) }}</span></span>
              <span><span class="muted">PnL </span><span :class="dashboard.metrics.netPnl >= 0 ? 'pos' : 'neg'">{{ dashboard.formatSignedCurrency(dashboard.metrics.netPnl, 0) }}</span></span>
            </div>
          </div>
        </div>

        <div class="grid" style="grid-template-columns: 1.4fr 1fr;">
          <div class="card">
            <div class="card-head">
              <h3>Daily P&L heatmap</h3>
              <span class="meta">Last 8 weeks</span>
              <div class="grow" />
              <span class="meta">loss → gain</span>
            </div>
            <div class="card-body">
              <div class="heat-grid">
                <div
                  v-for="cell in heatCells"
                  :key="cell.key"
                  class="heat-cell"
                  :style="{ background: cell.netPnl === 0 ? 'var(--bg-3)' : cell.netPnl > 0 ? `color-mix(in oklab, var(--gain) ${Math.min(85, 20 + Math.abs(cell.netPnl) / 8)}%, var(--bg-3))` : `color-mix(in oklab, var(--loss) ${Math.min(85, 20 + Math.abs(cell.netPnl) / 8)}%, var(--bg-3))` }"
                  :title="`${cell.key} ${dashboard.formatSignedCurrency(cell.netPnl)}`"
                />
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><h3>P&L by setup</h3><span class="meta">All time</span><div class="grow" /><button class="btn btn-sm btn-ghost" @click="route = 'playbook'">View all</button></div>
            <div class="card-body col">
              <div v-if="dashboard.setupRows.length === 0" class="muted" style="font-size: 12px;">No setups yet. Add one in Playbook.</div>
              <div v-for="row in dashboard.setupRows" :key="row.id" class="grid" style="grid-template-columns: 128px 1fr 76px; align-items: center; gap: 8px;">
                <span style="font-size: 11px; color: var(--ink-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ row.label }}</span>
                <div class="bar" :class="row.value < 0 ? 'neg' : 'pos'"><i :style="{ width: `${Math.abs(row.value) / dashboard.maxSetupAbs * 100}%` }" /></div>
                <span :class="['num', row.value >= 0 ? 'pos' : 'neg']" style="font-size: 11px; text-align: right;">{{ dashboard.formatSignedCurrency(row.value, 0) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3>Insights</h3><span class="badge accent">{{ dashboard.insights.length }}</span><div class="grow" /><button class="btn btn-sm btn-ghost" :disabled="recomputingInsights" @click="recomputeInsights"><AppIcon name="refresh" :size="11" /> {{ recomputingInsights ? 'Recomputing...' : 'Recompute' }}</button></div>
          <div class="card-body grid" style="grid-template-columns: 1fr 1fr;">
            <div v-if="dashboard.insights.length === 0" class="muted" style="grid-column: span 2; font-size: 12px;">No insights yet. Click recompute after logging trades.</div>
            <div v-for="insight in dashboard.insights" :key="insight.id" :class="['alert', insight.tone]">
              <AppIcon :name="insight.tone === 'warn' ? 'warn' : insight.tone === 'gain' ? 'trend' : 'info'" />
              <div>
                <div style="font-weight: 500; color: var(--ink-0); font-size: 12px; margin-bottom: 2px;">{{ insight.title }}</div>
                <div style="font-size: 11px; color: var(--ink-2);">{{ insight.body }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside class="col">
        <div class="card">
          <div class="card-head"><h3>Today</h3><span class="meta">{{ dashboard.today.slice(5) }}</span><div class="grow" /><span :class="['badge', dashboard.todayPnl > 0 ? 'gain' : dashboard.todayPnl < 0 ? 'loss' : '']">{{ dashboard.todayPnl > 0 ? 'UP' : dashboard.todayPnl < 0 ? 'DOWN' : 'FLAT' }}</span></div>
          <div class="card-body col">
            <div>
              <div class="lbl">Realized P&L</div>
              <div class="num" :class="dashboard.todayPnl >= 0 ? 'pos' : 'neg'" style="font-size: 22px;">{{ dashboard.formatSignedCurrency(dashboard.todayPnl) }}</div>
            </div>
            <div class="grid" style="grid-template-columns: 1fr 1fr;">
              <div><div class="lbl">Trades</div><div class="num">{{ dashboard.todayStats.count }}</div></div>
              <div><div class="lbl">Win / Loss</div><div class="num">{{ dashboard.todayStats.wins }} / {{ dashboard.todayStats.losses }}</div></div>
              <div><div class="lbl">Avg R</div><div class="num">{{ dashboard.todayStats.count > 0 ? dashboard.formatR(dashboard.todayStats.avgR) : '—' }}</div></div>
              <div><div class="lbl">Best / Worst</div>
                <div class="num">
                  <span class="pos">{{ dashboard.todayStats.bestR !== null ? dashboard.formatR(dashboard.todayStats.bestR) : '—' }}</span> /
                  <span class="neg">{{ dashboard.todayStats.worstR !== null ? dashboard.formatR(dashboard.todayStats.worstR) : '—' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Risk · today</h3><span class="meta" v-if="dashboard.risk">Cap {{ dashboard.formatCurrency(dashboard.risk.today.dailyLossLimitAmount, 0) }}</span></div>
          <div class="card-body col" v-if="dashboard.risk">
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                <span class="muted">Used</span>
                <span class="num">{{ dashboard.formatCurrency(dashboard.risk.today.usedRiskAmount, 0) }} <span class="muted">/ {{ dashboard.formatCurrency(dashboard.risk.today.dailyLossLimitAmount, 0) }}</span></span>
              </div>
              <div class="bar" :class="dashboard.risk.status === 'blocked' ? 'neg' : dashboard.risk.today.usedRiskAmount > dashboard.risk.today.dailyLossLimitAmount * 0.5 ? 'warn' : ''">
                <i :style="{ width: `${Math.min(100, (dashboard.risk.today.usedRiskAmount / Math.max(1, dashboard.risk.today.dailyLossLimitAmount)) * 100)}%` }" />
              </div>
            </div>
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                <span class="muted">Loss streak</span>
                <span class="num">{{ dashboard.lossStreak }} <span class="muted">/ {{ dashboard.risk.today.maxConsecutiveLosses }} cutoff</span></span>
              </div>
              <div class="bar" :class="dashboard.lossStreak >= dashboard.risk.today.maxConsecutiveLosses ? 'neg' : ''">
                <i :style="{ width: `${Math.min(100, (dashboard.lossStreak / Math.max(1, dashboard.risk.today.maxConsecutiveLosses)) * 100)}%` }" />
              </div>
            </div>
            <div :class="['alert', dashboard.risk.status === 'blocked' ? 'loss' : 'info']">
              <AppIcon :name="dashboard.risk.status === 'blocked' ? 'warn' : 'info'" :size="12" />
              <div style="font-size: 11px;">
                <span v-if="dashboard.risk.status === 'blocked'">Trading blocked.</span>
                <span v-else>{{ dashboard.formatCurrency(dashboard.risk.today.remainingRiskAmount, 0) }} risk remaining. {{ Math.max(0, dashboard.risk.today.maxConsecutiveLosses - dashboard.lossStreak) }} loss before cutoff.</span>
              </div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Discipline checklist</h3><span class="meta">{{ dashboard.adherenceRatio }}</span></div>
          <div class="card-body col" style="gap: 6px;">
            <div v-for="item in dashboard.disciplineChecklist" :key="item.label" style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--ink-1);">
              <span :style="{ width: '14px', height: '14px', borderRadius: '3px', border: `1px solid ${item.done ? 'var(--accent)' : 'var(--line-2)'}`, background: item.done ? 'var(--accent)' : 'transparent' }" />
              <span>{{ item.label }}</span>
            </div>
          </div>
        </div>
        <button class="btn btn-sm btn-ghost" style="justify-content: center;" @click="signOut">Sign out</button>
      </aside>
    </section>

    <section v-else-if="route === 'trades'" style="padding: var(--gap-grid);" class="col">
      <div v-if="dashboard.error" class="alert loss"><AppIcon name="warn" />{{ dashboard.error }}</div>
      <div class="card">
        <div class="card-body" style="display: flex; align-items: center; gap: 12px;">
          <div>
            <h3 style="margin: 0;">Trades</h3>
            <div class="meta">{{ dashboard.trades.length }} total · source: Supabase/Postgres with RLS</div>
          </div>
          <div class="grow" />
          <button class="btn btn-primary" @click="tradeModalOpen = true"><AppIcon name="plus" /> New trade</button>
        </div>
      </div>
      <div class="card">
        <div class="card-body col">
          <div class="chips">
            <span class="lbl">Result</span>
            <button v-for="item in ['all', 'win', 'loss', 'breakeven']" :key="item" class="chip" :aria-pressed="selectedResult === item" @click="selectedResult = item">{{ item }}</button>
          </div>
          <div class="meta">Showing {{ resultTrades.length }} trades</div>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table class="t mono">
            <thead><tr><th>Date / Time</th><th>Asset</th><th>Setup</th><th>Dir</th><th class="num">Entry</th><th class="num">Exit</th><th class="num">Risk $</th><th class="num">Net P&L</th><th class="num">R</th><th>Session</th><th>Result</th></tr></thead>
            <tbody>
              <tr v-if="resultTrades.length === 0">
                <td colspan="11" class="muted" style="text-align: center; padding: 24px;">
                  No trades yet. <button class="btn btn-sm" type="button" @click="tradeModalOpen = true"><AppIcon name="plus" /> Add your first trade</button>
                </td>
              </tr>
              <tr v-for="trade in resultTrades" :key="trade.id">
                <td><span class="muted">{{ trade.openedAt.slice(5, 10) }}</span> {{ trade.openedAt.slice(11, 16) }}</td>
                <td>{{ trade.symbol }}</td>
                <td>{{ dashboard.setups.find((setup) => setup.id === trade.setupId)?.name ?? '—' }}</td>
                <td><span :class="['dir', trade.side === 'long' ? 'long' : 'short']">{{ trade.side[0]?.toUpperCase() }}</span></td>
                <td class="num">{{ Number(trade.averageEntry).toFixed(trade.symbol.startsWith('BTC') ? 1 : 2) }}</td>
                <td class="num">{{ trade.averageExit !== undefined ? Number(trade.averageExit).toFixed(trade.symbol.startsWith('BTC') ? 1 : 2) : '—' }}</td>
                <td class="num muted">${{ Number(trade.plannedRiskAmount).toFixed(0) }}</td>
                <td :class="['num', trade.netPnl >= 0 ? 'pos' : 'neg']">{{ dashboard.formatSignedCurrency(trade.netPnl) }}</td>
                <td :class="['num', trade.netPnl >= 0 ? 'pos' : 'neg']">{{ trade.plannedRiskAmount > 0 ? dashboard.formatR(trade.netPnl / trade.plannedRiskAmount) : '—' }}</td>
                <td>{{ trade.session }}</td>
                <td><span :class="['badge', trade.result === 'win' ? 'gain' : trade.result === 'loss' ? 'loss' : '']">{{ trade.result.toUpperCase() }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <AnalyticsPage v-else-if="route === 'analytics'" :trades="dashboard.trades" :setups="dashboard.setups" :symbols="dashboard.symbols" />
    <JournalPage v-else-if="route === 'journal'" :auth-headers="dashboard.authHeaders" :trades="dashboard.trades" />
    <PlaybookPage v-else-if="route === 'playbook'" :auth-headers="dashboard.authHeaders" :trades="dashboard.trades" @refresh="dashboard.refresh" />
    <RiskPage v-else-if="route === 'risk'" :auth-headers="dashboard.authHeaders" :risk-status="dashboard.risk" @refresh="dashboard.refresh" />
    <SettingsPage v-else-if="route === 'settings'" :auth-headers="dashboard.authHeaders" :profile="dashboard.profile" :accounts="dashboard.accounts" @refresh="dashboard.refresh" />

    <div v-if="tradeModalOpen" class="modal-backdrop" @click.self="tradeModalOpen = false">
      <div class="modal">
        <div class="modal-head">
          <h3 style="margin: 0;">Add trade</h3>
          <div class="grow" />
          <button class="icon-btn" aria-label="Close" @click="tradeModalOpen = false">✕</button>
        </div>
        <div class="modal-body">
          <TradeEntryForm
            :symbols="dashboard.symbols"
            :setups="dashboard.setups"
            @submit-trade="handleSubmitTrade"
            @create-symbol="dashboard.createSymbol"
          />
        </div>
      </div>
    </div>
  </AppShell>
</template>
