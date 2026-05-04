import { describe, expect, it } from 'vitest'
import { calculatePerformance, maxDrawdownPct, netPnl, rMultiple } from './metrics'
import type { Trade } from './types'

const baseTrade = (overrides: Partial<Trade>): Trade => ({
  id: crypto.randomUUID(),
  userId: 'user',
  accountId: 'account',
  symbol: 'BTC/USDT',
  marketType: 'crypto_futures',
  side: 'long',
  status: 'closed',
  openedAt: '2026-05-01T10:00:00.000Z',
  closedAt: '2026-05-01T11:00:00.000Z',
  session: 'NY AM',
  timezone: 'America/New_York',
  plannedStop: 9900,
  averageEntry: 10000,
  averageExit: 10200,
  quantity: 1,
  plannedRiskAmount: 100,
  fees: 5,
  grossPnl: 200,
  netPnl: 195,
  tagIds: [],
  followedPlan: true,
  result: 'win',
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T11:00:00.000Z',
  ...overrides
})

describe('performance metrics', () => {
  it('calculates net pnl from gross, fees, and slippage', () => {
    expect(netPnl({ grossPnl: 120, fees: 4, slippageEstimate: 6 })).toBe(110)
  })

  it('uses planned risk for r multiple', () => {
    expect(rMultiple({ netPnl: 150, plannedRiskAmount: 100 })).toBe(1.5)
  })

  it('guards zero planned risk', () => {
    expect(rMultiple({ netPnl: 150, plannedRiskAmount: 0 })).toBeNull()
  })

  it('calculates drawdown from equity curve', () => {
    expect(maxDrawdownPct([100, 120, 90, 140])).toBeCloseTo(0.25)
  })

  it('calculates win rate, profit factor, expectancy, fees ratio, and streaks', () => {
    const metrics = calculatePerformance([
      baseTrade({ netPnl: 195, grossPnl: 200, fees: 5, result: 'win' }),
      baseTrade({ netPnl: -105, grossPnl: -100, fees: 5, result: 'loss', followedPlan: false }),
      baseTrade({ netPnl: 95, grossPnl: 100, fees: 5, result: 'win' })
    ], 1000)

    expect(metrics.winRate).toBeCloseTo(2 / 3)
    expect(metrics.profitFactor).toBeCloseTo(290 / 105)
    expect(metrics.expectancy).toBeCloseTo((2 / 3) * 145 - (1 / 3) * 105)
    expect(metrics.feesRatio).toBeCloseTo(15 / 200)
    expect(metrics.consecutiveWins).toBe(1)
    expect(metrics.consecutiveLosses).toBe(1)
    expect(metrics.adherenceScore).toBe(67)
  })
})
