import { calculatePerformance } from '../../shared/domain/metrics'
import { formatCurrency, formatPercent, formatR, formatSignedCurrency } from '../../shared/domain/format'
import { insights, setups, trades } from '../../shared/data/mock'

export const useDashboard = () => {
  const sorted = trades.slice().sort((a, b) => a.closedAt?.localeCompare(b.closedAt ?? '') ?? 0)
  const startingEquity = 10000
  const equity = sorted.reduce<number[]>((curve, trade) => {
    curve.push((curve.at(-1) ?? startingEquity) + trade.netPnl)
    return curve
  }, [startingEquity])
  const metrics = calculatePerformance(trades, startingEquity)
  const todayTrades = trades.filter((trade) => trade.openedAt.slice(0, 10) === '2026-05-03')
  const todayPnl = todayTrades.reduce((sum, trade) => sum + trade.netPnl, 0)
  const setupRows = setups.map((setup) => {
    const setupTrades = trades.filter((trade) => trade.setupId === setup.id)
    return {
      id: setup.id,
      label: setup.name,
      value: setupTrades.reduce((sum, trade) => sum + trade.netPnl, 0),
      metrics: calculatePerformance(setupTrades, startingEquity)
    }
  }).sort((a, b) => b.value - a.value)
  const maxSetupAbs = Math.max(...setupRows.map((row) => Math.abs(row.value)), 1)
  const sessions = ['Asia', 'London', 'NY AM', 'NY PM', 'Overnight'] as const
  const sessionRows = sessions.map((session) => {
    const sessionTrades = trades.filter((trade) => trade.session === session)
    return { label: session, value: calculatePerformance(sessionTrades, startingEquity).winRate * 100 }
  })

  return {
    trades,
    setups,
    insights,
    metrics,
    equity,
    todayPnl,
    todayTrades,
    setupRows,
    maxSetupAbs,
    sessionRows,
    formatCurrency,
    formatSignedCurrency,
    formatPercent,
    formatR
  }
}
