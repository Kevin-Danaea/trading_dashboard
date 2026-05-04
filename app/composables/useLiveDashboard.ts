import type { Session } from '@supabase/supabase-js'
import type { Trade } from '../../shared/domain/types'
import { calculatePerformance, currentLossStreak, dailyStats, tradesInRange, tradingDayStreak } from '../../shared/domain/metrics'
import { formatCurrency, formatPercent, formatR, formatSignedCurrency } from '../../shared/domain/format'

type BootstrapSymbol = {
  id: string
  symbol: string
  base_asset: string
  quote_asset: string
  market_type: Trade['marketType']
  is_default: boolean
}

type BootstrapSetup = {
  id: string
  name: string
  status: string
  context?: string
  triggers?: string
  invalidations?: string
  confirmations?: string | null
  risk_management?: string
  checklist?: string[]
}

type BootstrapAccount = {
  id: string
  name: string
  is_default: boolean
  starting_balance: number
  base_currency: string
}

type BootstrapProfile = {
  id: string
  display_name: string
  timezone: string
  base_currency: string
  onboarding_completed: boolean
}

type RiskStatus = {
  accountId: string | null
  status: 'allowed' | 'blocked'
  timezone: string
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

type OverviewResponse = {
  metrics: ReturnType<typeof calculatePerformance>
  trades: Trade[]
  setupBreakdown: Array<{ setup: BootstrapSetup; metrics: ReturnType<typeof calculatePerformance> }>
  insights: Array<{ id: string; title: string; body: string; tone: 'gain' | 'loss' | 'warn' | 'info' }>
}

export const useLiveDashboard = () => {
  const session = ref<Session | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const trades = ref<Trade[]>([])
  const symbols = ref<BootstrapSymbol[]>([])
  const setups = ref<BootstrapSetup[]>([])
  const accounts = ref<BootstrapAccount[]>([])
  const profile = ref<BootstrapProfile | null>(null)
  const insights = ref<OverviewResponse['insights']>([])
  const metrics = ref(calculatePerformance([], 0))
  const risk = ref<RiskStatus | null>(null)

  const authHeaders = computed<Record<string, string>>(() => {
    const headers: Record<string, string> = {}
    if (session.value) headers.Authorization = `Bearer ${session.value.access_token}`
    return headers
  })

  const refresh = async () => {
    if (!session.value) return
    loading.value = true
    error.value = null
    try {
      const [bootstrap, overview, riskStatus] = await Promise.all([
        $fetch<{ profile: BootstrapProfile; symbols: BootstrapSymbol[]; setups: BootstrapSetup[]; accounts: BootstrapAccount[] }>('/api/bootstrap', { headers: authHeaders.value }),
        $fetch<OverviewResponse>('/api/analytics/overview', { headers: authHeaders.value }),
        $fetch<RiskStatus>('/api/risk/status', { headers: authHeaders.value })
      ])
      profile.value = bootstrap.profile
      symbols.value = bootstrap.symbols
      setups.value = bootstrap.setups
      accounts.value = bootstrap.accounts
      trades.value = overview.trades
      insights.value = overview.insights
      metrics.value = overview.metrics
      risk.value = riskStatus
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unable to load Supabase data'
    } finally {
      loading.value = false
    }
  }

  const defaultAccount = computed(() => accounts.value.find((acc) => acc.is_default) ?? accounts.value[0] ?? null)
  const startingEquity = computed(() => Number(defaultAccount.value?.starting_balance ?? 0))

  const closedTrades = computed(() => trades.value.filter((trade) => trade.status === 'closed'))

  const equity = computed(() => closedTrades.value
    .slice()
    .sort((a, b) => (a.closedAt ?? a.openedAt).localeCompare(b.closedAt ?? b.openedAt))
    .reduce<number[]>((curve, trade) => {
      curve.push((curve.at(-1) ?? startingEquity.value) + trade.netPnl)
      return curve
    }, [startingEquity.value]))

  const today = computed(() => new Date().toISOString().slice(0, 10))
  const todayStats = computed(() => dailyStats(trades.value, today.value))
  const todayPnl = computed(() => todayStats.value.netPnl)

  const lossStreak = computed(() => currentLossStreak(trades.value))
  const dayStreak = computed(() => tradingDayStreak(trades.value))

  const previousMetrics = computed(() => {
    const now = Date.now()
    const days30Ago = new Date(now - 30 * 86400000).toISOString()
    const days60Ago = new Date(now - 60 * 86400000).toISOString()
    const last30 = tradesInRange(trades.value, days30Ago, new Date(now).toISOString())
    const prev30 = tradesInRange(trades.value, days60Ago, days30Ago)
    return {
      current: calculatePerformance(last30, startingEquity.value),
      previous: calculatePerformance(prev30, startingEquity.value),
      weekCount: tradesInRange(trades.value, new Date(now - 7 * 86400000).toISOString(), new Date(now).toISOString()).length,
      prevWeekCount: tradesInRange(trades.value, new Date(now - 14 * 86400000).toISOString(), new Date(now - 7 * 86400000).toISOString()).length
    }
  })

  const kpiDeltas = computed(() => {
    const { current, previous } = previousMetrics.value
    const delta = (a: number, b: number) => a - b
    return {
      netPnl: delta(current.netPnl, previous.netPnl),
      winRate: delta(current.winRate, previous.winRate),
      profitFactor: (current.profitFactor ?? 0) - (previous.profitFactor ?? 0),
      expectancy: delta(current.expectancy, previous.expectancy),
      avgR: delta(current.avgR, previous.avgR),
      maxDrawdown: delta(current.maxDrawdownPct, previous.maxDrawdownPct),
      adherence: delta(current.adherenceScore, previous.adherenceScore),
      weekTrades: previousMetrics.value.weekCount - previousMetrics.value.prevWeekCount
    }
  })

  const setupRows = computed(() => setups.value.map((setup) => {
    const setupTrades = trades.value.filter((trade) => trade.setupId === setup.id)
    return {
      id: setup.id,
      label: setup.name,
      value: setupTrades.reduce((sum, trade) => sum + trade.netPnl, 0),
      metrics: calculatePerformance(setupTrades, 0)
    }
  }).sort((a, b) => b.value - a.value))

  const maxSetupAbs = computed(() => Math.max(...setupRows.value.map((row) => Math.abs(row.value)), 1))

  const disciplineChecklist = computed(() => {
    const t = todayStats.value
    const r = risk.value
    return [
      { label: 'Pre-market plan written', done: closedTrades.value.some((trade) => trade.openedAt.slice(0, 10) === today.value) },
      { label: 'Risk per trade <= 1%', done: t.count === 0 || trades.value.filter((trade) => trade.openedAt.slice(0, 10) === today.value).every((trade) => trade.plannedRiskAmount <= (startingEquity.value * 0.01 || trade.plannedRiskAmount)) },
      { label: 'Setup matches playbook', done: t.count === 0 || trades.value.filter((trade) => trade.openedAt.slice(0, 10) === today.value).every((trade) => Boolean(trade.setupId)) },
      { label: 'Followed plan today', done: t.count === 0 || trades.value.filter((trade) => trade.openedAt.slice(0, 10) === today.value).every((trade) => trade.followedPlan) },
      { label: 'Within daily risk cap', done: !r || r.status === 'allowed' },
      { label: 'No active loss-streak block', done: !r || r.warnings.length === 0 }
    ]
  })

  const adherenceRatio = computed(() => {
    const items = disciplineChecklist.value
    return `${items.filter((item) => item.done).length} / ${items.length}`
  })

  const createTrade = async (payload: Record<string, unknown>) => {
    await $fetch('/api/trades', {
      method: 'POST',
      headers: authHeaders.value,
      body: payload
    })
    await refresh()
  }

  const createSymbol = async (payload: Record<string, unknown>) => {
    await $fetch('/api/symbols', {
      method: 'POST',
      headers: authHeaders.value,
      body: payload
    })
    await refresh()
  }

  return {
    session,
    loading,
    error,
    trades,
    closedTrades,
    symbols,
    setups,
    accounts,
    profile,
    insights,
    metrics,
    equity,
    startingEquity,
    today,
    todayStats,
    todayPnl,
    lossStreak,
    dayStreak,
    risk,
    kpiDeltas,
    setupRows,
    maxSetupAbs,
    disciplineChecklist,
    adherenceRatio,
    authHeaders,
    refresh,
    createTrade,
    createSymbol,
    formatCurrency,
    formatSignedCurrency,
    formatPercent,
    formatR
  }
}
