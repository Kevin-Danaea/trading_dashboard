import { calculatePerformance } from '#shared/domain/metrics'
import { tradeRowToDomain, type TradeRow } from '#shared/domain/db'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)

  const { data: tradeRows, error: tradesError } = await supabase
    .from('trades')
    .select('*, symbols(symbol), setups(name)')
    .is('deleted_at', null)
    .order('opened_at', { ascending: false })
    .limit(500)

  if (tradesError) throw createError({ statusCode: 500, statusMessage: tradesError.message })
  const trades = (tradeRows as TradeRow[] | null ?? []).map(tradeRowToDomain)
  const metrics = calculatePerformance(trades, 0)

  const insights: Array<{ user_id: string; title: string; body: string; tone: 'gain' | 'loss' | 'warn' | 'info'; dimensions: Record<string, string>; metric_refs: string[] }> = []

  if (metrics.tradeCount === 0) {
    insights.push({
      user_id: user.id,
      title: 'No closed trades yet',
      body: 'Log your first trade to start receiving insights about your edge and discipline.',
      tone: 'info',
      dimensions: {},
      metric_refs: []
    })
  } else {
    if (metrics.consecutiveLosses >= 3) {
      insights.push({
        user_id: user.id,
        title: `${metrics.consecutiveLosses} consecutive losses detected`,
        body: 'Consider a hard stop after 2 losses. Win rate typically drops on trades following a 3-loss streak.',
        tone: 'warn',
        dimensions: { event: 'loss_streak' },
        metric_refs: ['consecutiveLosses', 'winRate']
      })
    }
    if (metrics.profitFactor !== null && metrics.profitFactor >= 1.5) {
      insights.push({
        user_id: user.id,
        title: `Profit factor at ${metrics.profitFactor.toFixed(2)}`,
        body: 'Sound expectancy. Keep size disciplined and avoid revenge trading after wins.',
        tone: 'gain',
        dimensions: {},
        metric_refs: ['profitFactor', 'expectancy']
      })
    }
    if (metrics.adherenceScore < 70 && metrics.tradeCount >= 10) {
      insights.push({
        user_id: user.id,
        title: `Plan adherence at ${metrics.adherenceScore}%`,
        body: 'Less than 70% of trades followed plan. Review your pre-trade checklist for the next session.',
        tone: 'warn',
        dimensions: {},
        metric_refs: ['adherenceScore']
      })
    }
    if (metrics.feesRatio !== null && metrics.feesRatio > 0.15) {
      insights.push({
        user_id: user.id,
        title: 'Fees consume more than 15% of gross PnL',
        body: 'Consider larger holding periods or a different fee tier to protect expectancy.',
        tone: 'info',
        dimensions: {},
        metric_refs: ['feesRatio']
      })
    }
    const setupGroups = new Map<string, { trades: typeof trades; name: string }>()
    for (const trade of trades) {
      if (!trade.setupId) continue
      const existing = setupGroups.get(trade.setupId) ?? { trades: [], name: 'Unknown' }
      existing.trades.push(trade)
      setupGroups.set(trade.setupId, existing)
    }
    let bestSetup: { name: string; expectancy: number; trades: number } | null = null
    for (const [, group] of setupGroups) {
      if (group.trades.length < 5) continue
      const setupMetrics = calculatePerformance(group.trades, 0)
      if (!bestSetup || setupMetrics.expectancy > bestSetup.expectancy) {
        bestSetup = { name: group.name, expectancy: setupMetrics.expectancy, trades: group.trades.length }
      }
    }
    if (bestSetup && bestSetup.expectancy > 0) {
      insights.push({
        user_id: user.id,
        title: `Best edge: ${bestSetup.name}`,
        body: `Positive expectancy across ${bestSetup.trades} trades. Keep this setup in active rotation.`,
        tone: 'gain',
        dimensions: { setup: bestSetup.name },
        metric_refs: ['expectancy']
      })
    }
  }

  await supabase.from('insights').update({ deleted_at: new Date().toISOString() }).is('deleted_at', null)

  if (insights.length > 0) {
    const { error } = await supabase.from('insights').insert(insights)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { count: insights.length }
})
