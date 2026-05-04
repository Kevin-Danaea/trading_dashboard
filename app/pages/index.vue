<script setup lang="ts">
const route = ref('overview')
const range = ref('1M')
const supabase = useSupabaseClient()
const dashboard = reactive(useLiveDashboard())

const initSession = async () => {
  const { data } = await supabase.auth.getSession()
  dashboard.session = data.session
  await dashboard.refresh()
}

onMounted(async () => {
  await initSession()
  supabase.auth.onAuthStateChange(async (_event, session) => {
    dashboard.session = session
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
</script>

<template>
  <AuthLogin v-if="!dashboard.session" @signed-in="initSession" />
  <AppShell v-else v-model:route="route" v-model:range="range">
    <section v-if="route === 'overview'" class="grid dashboard-grid" style="grid-template-columns: 1fr 320px; gap: var(--gap-grid); padding: var(--gap-grid);">
      <div class="col">
        <div v-if="dashboard.error" class="alert loss"><AppIcon name="warn" />{{ dashboard.error }}</div>
        <div v-if="dashboard.loading" class="alert info"><AppIcon name="info" />Loading Supabase data...</div>
        <div class="grid overview-main" style="grid-template-columns: repeat(4, 1fr);">
          <KpiCard label="Net P&L · 30d" :value="dashboard.formatSignedCurrency(dashboard.metrics.netPnl)" delta="▲ 12.40" delta-label="vs prev 30d" delta-tone="pos" :spark-data="dashboard.equity.slice(-30)" />
          <KpiCard label="Win rate" :value="dashboard.formatPercent(dashboard.metrics.winRate)" delta="▲ 2.10" delta-label="vs 30d avg" delta-tone="pos" />
          <KpiCard label="Profit factor" :value="dashboard.metrics.profitFactor?.toFixed(2) ?? '∞'" delta="▲ 0.18" delta-label="vs prev" delta-tone="pos" />
          <KpiCard label="Expectancy" :value="dashboard.formatCurrency(dashboard.metrics.expectancy)" delta="▼ 3.20" delta-label="per trade" delta-tone="neg" />
          <KpiCard label="Avg R multiple" :value="dashboard.formatR(dashboard.metrics.avgR)" delta="▲ 0.04" delta-label="last 50" delta-tone="pos" />
          <KpiCard label="Max drawdown" :value="dashboard.formatPercent(dashboard.metrics.maxDrawdownPct)" delta="▼ 0.40" delta-label="from peak" delta-tone="warn" />
          <KpiCard label="Trades · this week" value="18" delta="▲ 3" delta-label="vs last week" />
          <KpiCard label="Adherence score" :value="String(dashboard.metrics.adherenceScore)" delta="▲ 4" delta-label="checklist hit %" />
        </div>

        <div class="card">
          <div class="card-head">
            <h3>Equity curve</h3>
            <span class="badge accent">LIVE</span>
            <span class="meta">Cumulative · USDT</span>
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
              <span><span class="muted">CUR </span><span class="pos">{{ dashboard.formatCurrency(dashboard.equity.at(-1)!, 0) }}</span></span>
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
                  v-for="trade in dashboard.trades.slice(0, 56)"
                  :key="trade.id"
                  class="heat-cell"
                  :style="{ background: trade.netPnl > 0 ? `color-mix(in oklab, var(--gain) ${Math.min(85, 20 + Math.abs(trade.netPnl) / 8)}%, var(--bg-3))` : `color-mix(in oklab, var(--loss) ${Math.min(85, 20 + Math.abs(trade.netPnl) / 8)}%, var(--bg-3))` }"
                  :title="`${trade.openedAt.slice(0, 10)} ${dashboard.formatSignedCurrency(trade.netPnl)}`"
                />
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><h3>P&L by setup</h3><span class="meta">30d net</span><div class="grow" /><button class="btn btn-sm btn-ghost">View all</button></div>
            <div class="card-body col">
              <div v-for="row in dashboard.setupRows" :key="row.id" class="grid" style="grid-template-columns: 128px 1fr 76px; align-items: center; gap: 8px;">
                <span style="font-size: 11px; color: var(--ink-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ row.label }}</span>
                <div class="bar" :class="row.value < 0 ? 'neg' : 'pos'"><i :style="{ width: `${Math.abs(row.value) / dashboard.maxSetupAbs * 100}%` }" /></div>
                <span :class="['num', row.value >= 0 ? 'pos' : 'neg']" style="font-size: 11px; text-align: right;">{{ dashboard.formatSignedCurrency(row.value, 0) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3>Insights</h3><span class="badge accent">2 new</span><div class="grow" /><button class="btn btn-sm btn-ghost"><AppIcon name="refresh" :size="11" /> Recompute</button></div>
          <div class="card-body grid" style="grid-template-columns: 1fr 1fr;">
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
          <div class="card-head"><h3>Today</h3><span class="meta">{{ new Date().toISOString().slice(5, 10) }}</span><div class="grow" /><span :class="['badge', dashboard.todayPnl >= 0 ? 'gain' : 'loss']">{{ dashboard.todayPnl >= 0 ? 'UP' : 'DOWN' }}</span></div>
          <div class="card-body col">
            <div>
              <div class="lbl">Realized P&L</div>
              <div class="num" :class="dashboard.todayPnl >= 0 ? 'pos' : 'neg'" style="font-size: 22px;">{{ dashboard.formatSignedCurrency(dashboard.todayPnl) }}</div>
            </div>
            <div class="grid" style="grid-template-columns: 1fr 1fr;">
              <div><div class="lbl">Trades</div><div class="num">4</div></div>
              <div><div class="lbl">Win / Loss</div><div class="num">2 / 2</div></div>
              <div><div class="lbl">Avg R</div><div class="num">+0.42R</div></div>
              <div><div class="lbl">Best / Worst</div><div class="num"><span class="pos">+1.8R</span> / <span class="neg">-1.0R</span></div></div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Risk · today</h3><span class="meta">Cap $300</span></div>
          <div class="card-body col">
            <div><div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;"><span class="muted">Used</span><span class="num">$184 <span class="muted">/ $300</span></span></div><div class="bar warn"><i style="width: 61%;" /></div></div>
            <div><div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;"><span class="muted">Loss streak</span><span class="num">1 <span class="muted">/ 2 cutoff</span></span></div><div class="bar"><i style="width: 50%;" /></div></div>
            <div class="alert info"><AppIcon name="info" :size="12" /><div style="font-size: 11px;">$116 risk remaining. 1 loss before cutoff.</div></div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Discipline checklist</h3><span class="meta">5 / 6</span></div>
          <div class="card-body col" style="gap: 6px;">
            <div v-for="item in ['Pre-market plan written', 'Risk per trade <= 1%', 'Setup matches playbook', 'No trades during news window', 'Journal entry started', 'Cooldown after stop-out']" :key="item" style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--ink-1);">
              <span :style="{ width: '14px', height: '14px', borderRadius: '3px', border: `1px solid ${item.includes('Cooldown') ? 'var(--line-2)' : 'var(--accent)'}`, background: item.includes('Cooldown') ? 'transparent' : 'var(--accent)' }" />
              <span>{{ item }}</span>
            </div>
          </div>
        </div>
        <button class="btn btn-sm btn-ghost" style="justify-content: center;" @click="signOut">Sign out</button>
      </aside>
    </section>

    <section v-else-if="route === 'trades'" style="padding: var(--gap-grid);" class="col">
      <div v-if="dashboard.error" class="alert loss"><AppIcon name="warn" />{{ dashboard.error }}</div>
      <TradeEntryForm
        :symbols="dashboard.symbols"
        :setups="dashboard.setups"
        @submit-trade="dashboard.createTrade"
        @create-symbol="dashboard.createSymbol"
      />
      <div class="card">
        <div class="card-body col">
          <div class="chips">
            <span class="lbl">Result</span>
            <button v-for="item in ['all', 'win', 'loss', 'breakeven']" :key="item" class="chip" :aria-pressed="selectedResult === item" @click="selectedResult = item">{{ item }}</button>
          </div>
          <div class="meta">Showing {{ resultTrades.length }} trades · source: Supabase/Postgres with RLS.</div>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table class="t mono">
            <thead><tr><th>Date / Time</th><th>Asset</th><th>Setup</th><th>Dir</th><th class="num">Entry</th><th class="num">Exit</th><th class="num">Risk $</th><th class="num">Net P&L</th><th class="num">R</th><th>Session</th><th>Result</th></tr></thead>
            <tbody>
              <tr v-if="resultTrades.length === 0">
                <td colspan="11" class="muted" style="text-align: center;">No trades yet. Log your first BTC/USDT or XAU/USD trade above.</td>
              </tr>
              <tr v-for="trade in resultTrades" :key="trade.id">
                <td><span class="muted">{{ trade.openedAt.slice(5, 10) }}</span> {{ trade.openedAt.slice(11, 16) }}</td>
                <td>{{ trade.symbol }}</td>
                <td>{{ dashboard.setups.find((setup) => setup.id === trade.setupId)?.name }}</td>
                <td><span :class="['dir', trade.side === 'long' ? 'long' : 'short']">{{ trade.side[0]?.toUpperCase() }}</span></td>
                <td class="num">{{ trade.averageEntry.toFixed(trade.symbol.startsWith('BTC') ? 1 : 2) }}</td>
                <td class="num">{{ trade.averageExit?.toFixed(trade.symbol.startsWith('BTC') ? 1 : 2) }}</td>
                <td class="num muted">${{ trade.plannedRiskAmount.toFixed(0) }}</td>
                <td :class="['num', trade.netPnl >= 0 ? 'pos' : 'neg']">{{ dashboard.formatSignedCurrency(trade.netPnl) }}</td>
                <td :class="['num', trade.netPnl >= 0 ? 'pos' : 'neg']">{{ dashboard.formatR(trade.netPnl / trade.plannedRiskAmount) }}</td>
                <td>{{ trade.session }}</td>
                <td><span :class="['badge', trade.result === 'win' ? 'gain' : trade.result === 'loss' ? 'loss' : '']">{{ trade.result.toUpperCase() }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section v-else class="grid" style="padding: var(--gap-grid); grid-template-columns: 1fr 1fr;">
      <div class="card">
        <div class="card-head"><h3>{{ route[0]?.toUpperCase() + route.slice(1) }}</h3><span class="meta">MVP scaffold</span></div>
        <div class="card-body col">
          <p class="muted" style="margin: 0;">Esta pantalla conserva la ruta, shell, tokens y contrato visual del handoff. La construcción iterativa recomendada está documentada en <span class="mono">docs/PRODUCT_ARCHITECTURE.md</span>.</p>
          <div class="alert info"><AppIcon name="info" />Los endpoints Nuxt API ya existen para trades, analytics, imports, journal, playbook y risk.</div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Next component slice</h3><span class="meta">Production path</span></div>
        <div class="card-body col">
          <div class="field"><label>Primary concern</label><input class="input" :value="route === 'imports' ? 'CSV upload -> mapping -> preview -> persist' : 'Domain-first feature module'" readonly /></div>
          <div class="field"><label>Recommended data source</label><input class="input mono" value="Nuxt server/api + Prisma repository" readonly /></div>
        </div>
      </div>
    </section>
  </AppShell>
</template>
