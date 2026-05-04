import type { Session } from '@supabase/supabase-js'
import type { Trade } from '../../shared/domain/types'
import { calculatePerformance } from '../../shared/domain/metrics'
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
}

type BootstrapAccount = {
  id: string
  name: string
  is_default: boolean
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
  const insights = ref<OverviewResponse['insights']>([])
  const metrics = ref(calculatePerformance([], 0))

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
      const [bootstrap, overview] = await Promise.all([
        $fetch<{ symbols: BootstrapSymbol[]; setups: BootstrapSetup[]; accounts: BootstrapAccount[] }>('/api/bootstrap', { headers: authHeaders.value }),
        $fetch<OverviewResponse>('/api/analytics/overview', { headers: authHeaders.value })
      ])
      symbols.value = bootstrap.symbols
      setups.value = bootstrap.setups
      accounts.value = bootstrap.accounts
      trades.value = overview.trades
      insights.value = overview.insights
      metrics.value = overview.metrics
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unable to load Supabase data'
    } finally {
      loading.value = false
    }
  }

  const equity = computed(() => trades.value
    .slice()
    .sort((a, b) => (a.closedAt ?? a.openedAt).localeCompare(b.closedAt ?? b.openedAt))
    .reduce<number[]>((curve, trade) => {
      curve.push((curve.at(-1) ?? 0) + trade.netPnl)
      return curve
    }, [0]))

  const todayPnl = computed(() => {
    const today = new Date().toISOString().slice(0, 10)
    return trades.value
      .filter((trade) => trade.openedAt.slice(0, 10) === today)
      .reduce((sum, trade) => sum + trade.netPnl, 0)
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
    symbols,
    setups,
    accounts,
    insights,
    metrics,
    equity,
    todayPnl,
    setupRows,
    maxSetupAbs,
    refresh,
    createTrade,
    createSymbol,
    formatCurrency,
    formatSignedCurrency,
    formatPercent,
    formatR
  }
}
