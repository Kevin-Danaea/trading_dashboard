import type { ImportedFile, Insight, JournalEntry, Setup, Trade } from '../domain/types'

const now = '2026-05-03T20:00:00.000Z'
const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'AVAX/USDT', 'LINK/USDT']
const setupNames = ['Liquidity Sweep', 'Range Reclaim', 'VWAP Fade', 'Breakout Pullback', 'HTF FVG']
const sessions = ['Asia', 'London', 'NY AM', 'NY PM', 'Overnight'] as const

const seeded = (seed: number) => {
  let s = seed
  return () => {
    s += 0x6D2B79F5
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rng = seeded(17)
const isoDaysAgo = (days: number, hour: number) => {
  const date = new Date(now)
  date.setUTCDate(date.getUTCDate() - days)
  date.setUTCHours(hour, Math.floor(rng() * 60), 0, 0)
  return date.toISOString()
}

export const setups: Setup[] = setupNames.map((name, index) => ({
  id: `setup-${index + 1}`,
  userId: 'user-demo',
  name,
  status: name === 'VWAP Fade' ? 'review' : 'active',
  context: 'Defined market structure, liquidity context, and a clean invalidation before entry.',
  triggers: 'Confirmation candle, volume reaction, and lower-timeframe structure shift.',
  invalidations: 'No reaction after trigger or clean close through invalidation level.',
  confirmations: 'Session alignment, setup checklist, and acceptable spread.',
  riskManagement: 'Stop beyond invalidation. First partial around 1R when structure permits.',
  checklist: ['HTF context aligned', 'Setup pattern present', 'Risk defined', 'Invalidation clear', 'No news within 30m', 'Cooldown respected'],
  createdAt: now,
  updatedAt: now
}))

export const trades: Trade[] = Array.from({ length: 120 }, (_, index) => {
  const symbol = symbols[Math.floor(rng() * symbols.length)]!
  const setup = setups[Math.floor(rng() * setups.length)]!
  const side = rng() > 0.45 ? 'long' as const : 'short' as const
  const day = Math.floor(rng() * 62)
  const openedAt = isoDaysAgo(day, Math.floor(rng() * 22))
  const holdMinutes = Math.floor(20 + rng() * 280)
  const closedAt = new Date(Date.parse(openedAt) + holdMinutes * 60000).toISOString()
  const plannedRiskAmount = 80 + Math.floor(rng() * 320)
  const won = rng() < 0.56
  const r = won ? 0.35 + rng() * 2.8 : -(0.35 + rng() * 1.15)
  const grossPnl = r * plannedRiskAmount
  const fees = 4 + rng() * 42
  const slippageEstimate = rng() > 0.75 ? rng() * 18 : 0
  const netPnl = grossPnl - fees - slippageEstimate
  const averageEntry = symbol.startsWith('BTC') ? 62000 + rng() * 14000 : symbol.startsWith('ETH') ? 2900 + rng() * 800 : 25 + rng() * 155
  const stopDistance = averageEntry * (0.006 + rng() * 0.014)
  const averageExit = side === 'long' ? averageEntry + (netPnl >= 0 ? stopDistance * Math.abs(r) : -stopDistance * Math.abs(r)) : averageEntry - (netPnl >= 0 ? stopDistance * Math.abs(r) : -stopDistance * Math.abs(r))
  const followedPlan = rng() > 0.22
  return {
    id: `trade-${4200 + index}`,
    userId: 'user-demo',
    accountId: 'account-demo',
    symbol,
    marketType: 'crypto_futures' as const,
    side,
    status: 'closed' as const,
    openedAt,
    closedAt,
    session: sessions[Math.floor(rng() * sessions.length)]!,
    timezone: 'America/New_York',
    plannedEntry: averageEntry,
    plannedStop: side === 'long' ? averageEntry - stopDistance : averageEntry + stopDistance,
    plannedTarget: side === 'long' ? averageEntry + stopDistance * 2.2 : averageEntry - stopDistance * 2.2,
    averageEntry,
    averageExit,
    quantity: plannedRiskAmount / stopDistance,
    plannedRiskAmount,
    fees,
    slippageEstimate,
    grossPnl,
    netPnl,
    setupId: setup.id,
    strategyId: 'strategy-discretionary',
    tagIds: [`tag-${setup.name.toLowerCase().replaceAll(' ', '-')}`],
    followedPlan,
    confidence: Math.ceil(rng() * 10),
    executionScore: followedPlan ? 7 + Math.floor(rng() * 4) : 3 + Math.floor(rng() * 5),
    emotion: ['Calm', 'Focused', 'FOMO', 'Revenge', 'Anxious', 'Confident'][Math.floor(rng() * 6)],
    result: netPnl > 0 ? 'win' as const : Math.abs(netPnl) < 5 ? 'breakeven' as const : 'loss' as const,
    createdAt: openedAt,
    updatedAt: closedAt
  }
}).sort((a, b) => b.openedAt.localeCompare(a.openedAt))

export const journalEntries: JournalEntry[] = [
  {
    id: 'journal-2026-05-03',
    userId: 'user-demo',
    date: '2026-05-03',
    timezone: 'America/New_York',
    confidence: 7,
    executionScore: 8,
    emotion: 'Calm',
    marketContext: 'BTC ranged between 67.4k and 68.1k. Waited for liquidity sweep before accepting risk.',
    wins: 'Held the runner per plan and took the ETH loss without sizing up.',
    losses: 'Entered SOL early before confirmation.',
    lesson: 'Wait for confirmation candle.',
    createdAt: now,
    updatedAt: now
  }
]

export const insights: Insight[] = [
  {
    id: 'insight-1',
    userId: 'user-demo',
    title: 'Worst performance follows 3 consecutive losses',
    body: 'Win rate drops sharply on the fourth trade after a 3-loss streak. Consider a 2-loss daily cutoff.',
    tone: 'warn',
    dimensions: { event: 'loss_streak' },
    metricRefs: ['winRate', 'consecutiveLosses'],
    generatedAt: now,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'insight-2',
    userId: 'user-demo',
    title: 'Liquidity Sweep remains the strongest setup',
    body: 'Positive expectancy with high plan adherence. Keep it active in the playbook rotation.',
    tone: 'gain',
    dimensions: { setup: 'Liquidity Sweep' },
    metricRefs: ['expectancy', 'adherenceScore'],
    generatedAt: now,
    createdAt: now,
    updatedAt: now
  }
]

export const importedFiles: ImportedFile[] = [
  {
    id: 'import-1',
    userId: 'user-demo',
    source: 'csv_import',
    filename: 'binance_2026_04.csv',
    status: 'persisted',
    contentHash: 'sha256:demo-binance-2026-04',
    mappingVersion: 1,
    rowCount: 312,
    acceptedRows: 312,
    rejectedRows: 0,
    createdAt: '2026-04-30T22:14:00.000Z',
    updatedAt: '2026-04-30T22:16:00.000Z'
  }
]
