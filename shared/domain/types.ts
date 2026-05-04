export type UUID = string
export type CurrencyCode = 'USD' | 'USDT' | 'USDC' | 'BTC' | 'EUR'
export type MarketType = 'crypto_spot' | 'crypto_futures' | 'futures' | 'forex' | 'stocks'
export type TradeSide = 'long' | 'short'
export type TradeStatus = 'planned' | 'open' | 'closed' | 'void'
export type TradeResult = 'win' | 'loss' | 'breakeven'
export type SessionName = 'Asia' | 'London' | 'NY AM' | 'NY PM' | 'Overnight'
export type ExecutionSource = 'manual' | 'csv_import' | 'exchange_api'
export type ImportStatus = 'uploaded' | 'mapped' | 'validated' | 'persisted' | 'failed' | 'partial'
export type DisciplineEventType = 'oversize' | 'no_stop' | 'revenge' | 'fomo' | 'cooldown_skipped' | 'news_window' | 'early_exit' | 'late_entry'

export interface Auditable {
  id: UUID
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface User extends Auditable {
  displayName: string
  email?: string
  timezone: string
  baseCurrency: CurrencyCode
}

export interface Account extends Auditable {
  userId: UUID
  name: string
  brokerId?: UUID
  marketTypes: MarketType[]
  baseCurrency: CurrencyCode
  startingBalance: number
  currentBalanceCache?: number
}

export interface Broker extends Auditable {
  name: string
  kind: 'broker' | 'exchange'
  supportedMarkets: MarketType[]
}

export interface ImportedFile extends Auditable {
  userId: UUID
  brokerId?: UUID
  source: ExecutionSource
  filename: string
  status: ImportStatus
  contentHash: string
  mappingVersion: number
  rowCount: number
  acceptedRows: number
  rejectedRows: number
}

export interface Execution extends Auditable {
  userId: UUID
  accountId: UUID
  importedFileId?: UUID
  externalExecutionId?: string
  symbol: string
  marketType: MarketType
  side: TradeSide
  executedAt: string
  quantity: number
  price: number
  grossValue: number
  fee: number
  feeCurrency: CurrencyCode
  source: ExecutionSource
  dedupeKey: string
}

export interface Trade extends Auditable {
  userId: UUID
  accountId: UUID
  positionId?: UUID
  symbol: string
  marketType: MarketType
  side: TradeSide
  status: TradeStatus
  openedAt: string
  closedAt?: string
  session: SessionName
  timezone: string
  plannedEntry?: number
  plannedStop: number
  plannedTarget?: number
  averageEntry: number
  averageExit?: number
  quantity: number
  plannedRiskAmount: number
  fees: number
  slippageEstimate?: number
  grossPnl: number
  netPnl: number
  setupId?: UUID
  strategyId?: UUID
  tagIds: UUID[]
  followedPlan: boolean
  confidence?: number
  executionScore?: number
  emotion?: string
  result: TradeResult
}

export interface Position extends Auditable {
  userId: UUID
  accountId: UUID
  symbol: string
  marketType: MarketType
  side: TradeSide
  openedAt: string
  closedAt?: string
  tradeIds: UUID[]
  executionIds: UUID[]
}

export interface Setup extends Auditable {
  userId: UUID
  name: string
  status: 'active' | 'review' | 'paused' | 'archived'
  context: string
  triggers: string
  invalidations: string
  confirmations?: string
  riskManagement: string
  checklist: string[]
}

export interface Strategy extends Auditable {
  userId: UUID
  name: string
  description?: string
  setupIds: UUID[]
}

export interface Tag extends Auditable {
  userId: UUID
  name: string
  color?: string
}

export interface JournalEntry extends Auditable {
  userId: UUID
  tradeId?: UUID
  date: string
  timezone: string
  confidence?: number
  executionScore?: number
  emotion?: string
  marketContext?: string
  wins?: string
  losses?: string
  lesson?: string
}

export interface DailyReview extends Auditable {
  userId: UUID
  date: string
  timezone: string
  adherenceScore: number
  netPnl: number
  totalR: number
  tradeCount: number
  notes?: string
}

export interface RiskProfile extends Auditable {
  userId: UUID
  accountId: UUID
  maxRiskPerTradePct: number
  dailyLossLimitAmount: number
  weeklyLossLimitAmount: number
  maxConsecutiveLosses: number
  cooldownMinutesAfterStop: number
}

export interface RiskRule extends Auditable {
  userId: UUID
  profileId: UUID
  code: string
  name: string
  enabled: boolean
  severity: 'info' | 'warn' | 'block'
  params: Record<string, unknown>
}

export interface DisciplineEvent extends Auditable {
  userId: UUID
  tradeId?: UUID
  dailyReviewId?: UUID
  type: DisciplineEventType
  severity: 'low' | 'medium' | 'high'
  occurredAt: string
  note?: string
}

export interface Insight extends Auditable {
  userId: UUID
  title: string
  body: string
  tone: 'gain' | 'loss' | 'warn' | 'info'
  dimensions: Record<string, string>
  metricRefs: string[]
  generatedAt: string
}

export interface Attachment extends Auditable {
  userId: UUID
  tradeId?: UUID
  journalEntryId?: UUID
  kind: 'screenshot' | 'document' | 'csv' | 'other'
  url: string
  contentHash: string
}

export interface PerformanceMetrics {
  tradeCount: number
  grossPnl: number
  netPnl: number
  pnlPct: number | null
  totalFees: number
  totalSlippage: number
  totalR: number
  avgR: number
  winRate: number
  averageWin: number
  averageLoss: number
  profitFactor: number | null
  expectancy: number
  maxDrawdownPct: number
  consecutiveWins: number
  consecutiveLosses: number
  averageHoldMinutes: number | null
  feesRatio: number | null
  adherenceScore: number
}

export interface AnalyticsFilters {
  from?: string
  to?: string
  symbol?: string
  setupId?: UUID
  session?: SessionName
  marketType?: MarketType
  strategyId?: UUID
}
