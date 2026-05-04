import type { PerformanceMetrics, Trade } from './types'

export const grossPnl = (trade: Pick<Trade, 'grossPnl'>) => trade.grossPnl

export const netPnl = (trade: Pick<Trade, 'grossPnl' | 'fees' | 'slippageEstimate'>) =>
  trade.grossPnl - trade.fees - (trade.slippageEstimate ?? 0)

export const rMultiple = (trade: Pick<Trade, 'netPnl' | 'plannedRiskAmount'>) =>
  trade.plannedRiskAmount > 0 ? trade.netPnl / trade.plannedRiskAmount : null

export const maxDrawdownPct = (equity: number[]) => {
  if (equity.length === 0) return 0
  let peak = equity[0] ?? 0
  let maxDrawdown = 0
  for (const point of equity) {
    peak = Math.max(peak, point)
    if (peak > 0) maxDrawdown = Math.max(maxDrawdown, (peak - point) / peak)
  }
  return maxDrawdown
}

export const consecutive = (trades: Pick<Trade, 'netPnl'>[]) => {
  let bestWins = 0
  let bestLosses = 0
  let wins = 0
  let losses = 0
  for (const trade of trades) {
    if (trade.netPnl > 0) {
      wins += 1
      losses = 0
    } else if (trade.netPnl < 0) {
      losses += 1
      wins = 0
    } else {
      wins = 0
      losses = 0
    }
    bestWins = Math.max(bestWins, wins)
    bestLosses = Math.max(bestLosses, losses)
  }
  return { consecutiveWins: bestWins, consecutiveLosses: bestLosses }
}

export const calculatePerformance = (trades: Trade[], startingEquity = 0): PerformanceMetrics => {
  const closed = trades.filter((trade) => trade.status === 'closed')
  const wins = closed.filter((trade) => trade.netPnl > 0)
  const losses = closed.filter((trade) => trade.netPnl < 0)
  const tradeCount = closed.length
  const gross = closed.reduce((sum, trade) => sum + trade.grossPnl, 0)
  const fees = closed.reduce((sum, trade) => sum + trade.fees, 0)
  const slippage = closed.reduce((sum, trade) => sum + (trade.slippageEstimate ?? 0), 0)
  const net = gross - fees - slippage
  const totalRisk = closed.reduce((sum, trade) => sum + trade.plannedRiskAmount, 0)
  const totalR = closed.reduce((sum, trade) => sum + (rMultiple(trade) ?? 0), 0)
  const grossWins = wins.reduce((sum, trade) => sum + trade.netPnl, 0)
  const grossLossesAbs = Math.abs(losses.reduce((sum, trade) => sum + trade.netPnl, 0))
  const averageWin = wins.length > 0 ? grossWins / wins.length : 0
  const averageLoss = losses.length > 0 ? grossLossesAbs / losses.length : 0
  const winRate = tradeCount > 0 ? wins.length / tradeCount : 0
  const expectancy = tradeCount > 0 ? winRate * averageWin - (1 - winRate) * averageLoss : 0
  const equity = closed
    .slice()
    .sort((a, b) => a.closedAt?.localeCompare(b.closedAt ?? '') ?? 0)
    .reduce<number[]>((curve, trade) => {
      curve.push((curve.at(-1) ?? startingEquity) + trade.netPnl)
      return curve
    }, startingEquity ? [startingEquity] : [])
  const holdDurations = closed
    .filter((trade) => trade.closedAt)
    .map((trade) => (Date.parse(trade.closedAt!) - Date.parse(trade.openedAt)) / 60000)
    .filter((minutes) => Number.isFinite(minutes) && minutes >= 0)
  const streaks = consecutive(closed.slice().sort((a, b) => a.closedAt?.localeCompare(b.closedAt ?? '') ?? 0))
  const adherenceScore = tradeCount > 0
    ? Math.round((closed.filter((trade) => trade.followedPlan).length / tradeCount) * 100)
    : 0

  return {
    tradeCount,
    grossPnl: gross,
    netPnl: net,
    pnlPct: startingEquity > 0 ? net / startingEquity : null,
    totalFees: fees,
    totalSlippage: slippage,
    totalR,
    avgR: tradeCount > 0 ? totalR / tradeCount : 0,
    winRate,
    averageWin,
    averageLoss,
    profitFactor: grossLossesAbs > 0 ? grossWins / grossLossesAbs : wins.length > 0 ? null : 0,
    expectancy,
    maxDrawdownPct: maxDrawdownPct(equity),
    consecutiveWins: streaks.consecutiveWins,
    consecutiveLosses: streaks.consecutiveLosses,
    averageHoldMinutes: holdDurations.length > 0
      ? holdDurations.reduce((sum, minutes) => sum + minutes, 0) / holdDurations.length
      : null,
    feesRatio: Math.abs(gross) > 0 ? fees / Math.abs(gross) : null,
    adherenceScore
  }
}

export interface DailyStats {
  count: number
  netPnl: number
  wins: number
  losses: number
  breakeven: number
  bestR: number | null
  worstR: number | null
  avgR: number
}

export const dailyStats = (trades: Trade[], dayIso: string): DailyStats => {
  const dayTrades = trades.filter((trade) => trade.openedAt.slice(0, 10) === dayIso && trade.status === 'closed')
  const wins = dayTrades.filter((trade) => trade.netPnl > 0).length
  const losses = dayTrades.filter((trade) => trade.netPnl < 0).length
  const breakeven = dayTrades.length - wins - losses
  const rs = dayTrades.map((trade) => trade.plannedRiskAmount > 0 ? trade.netPnl / trade.plannedRiskAmount : 0)
  return {
    count: dayTrades.length,
    netPnl: dayTrades.reduce((sum, trade) => sum + trade.netPnl, 0),
    wins,
    losses,
    breakeven,
    bestR: rs.length > 0 ? Math.max(...rs) : null,
    worstR: rs.length > 0 ? Math.min(...rs) : null,
    avgR: rs.length > 0 ? rs.reduce((sum, r) => sum + r, 0) / rs.length : 0
  }
}

export const tradesInRange = (trades: Trade[], fromIso: string, toIso: string) =>
  trades.filter((trade) => trade.openedAt >= fromIso && trade.openedAt < toIso)

export const currentLossStreak = (trades: Trade[]) => {
  const sorted = trades
    .filter((trade) => trade.status === 'closed')
    .slice()
    .sort((a, b) => (b.closedAt ?? b.openedAt).localeCompare(a.closedAt ?? a.openedAt))
  let streak = 0
  for (const trade of sorted) {
    if (trade.netPnl < 0) streak += 1
    else break
  }
  return streak
}

export const tradingDayStreak = (trades: Trade[]) => {
  if (trades.length === 0) return 0
  const days = new Set(trades.map((trade) => trade.openedAt.slice(0, 10)))
  let streak = 0
  const cursor = new Date()
  while (true) {
    const iso = cursor.toISOString().slice(0, 10)
    if (days.has(iso)) {
      streak += 1
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    } else if (streak === 0) {
      cursor.setUTCDate(cursor.getUTCDate() - 1)
      if (Date.now() - cursor.getTime() > 7 * 86400000) break
    } else {
      break
    }
  }
  return streak
}

export const setupPerformanceScore = (metrics: Pick<PerformanceMetrics, 'expectancy' | 'profitFactor' | 'winRate' | 'adherenceScore' | 'tradeCount'>) => {
  const sampleConfidence = Math.min(1, metrics.tradeCount / 30)
  const pfScore = Math.min(35, ((metrics.profitFactor ?? 0) / 2.5) * 35)
  const expectancyScore = Math.max(0, Math.min(30, (metrics.expectancy / 150) * 30))
  const winScore = Math.min(20, metrics.winRate * 20)
  const adherenceScore = (metrics.adherenceScore / 100) * 15
  return Math.round((pfScore + expectancyScore + winScore + adherenceScore) * sampleConfidence)
}
