import type { Trade, TradeResult, TradeSide, TradeStatus } from './types'

export type TradeRow = {
  id: string
  user_id: string
  account_id: string
  position_id: string | null
  symbol_id: string
  setup_id: string | null
  strategy_id: string | null
  market_type: Trade['marketType']
  side: TradeSide
  status: TradeStatus
  opened_at: string
  closed_at: string | null
  session: Trade['session']
  timezone: string
  planned_entry: number | null
  planned_stop: number
  planned_target: number | null
  average_entry: number
  average_exit: number | null
  quantity: number
  planned_risk_amount: number
  fees: number
  slippage_estimate: number
  gross_pnl: number
  net_pnl: number
  r_multiple: number
  followed_plan: boolean
  confidence: number | null
  execution_score: number | null
  emotion: string | null
  result: TradeResult
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  symbols?: { symbol: string } | null
  setups?: { name: string } | null
}

export const tradeRowToDomain = (row: TradeRow): Trade => ({
  id: row.id,
  userId: row.user_id,
  accountId: row.account_id,
  positionId: row.position_id ?? undefined,
  symbol: row.symbols?.symbol ?? row.symbol_id,
  marketType: row.market_type,
  side: row.side,
  status: row.status,
  openedAt: row.opened_at,
  closedAt: row.closed_at ?? undefined,
  session: row.session,
  timezone: row.timezone,
  plannedEntry: row.planned_entry ?? undefined,
  plannedStop: row.planned_stop,
  plannedTarget: row.planned_target ?? undefined,
  averageEntry: row.average_entry,
  averageExit: row.average_exit ?? undefined,
  quantity: row.quantity,
  plannedRiskAmount: row.planned_risk_amount,
  fees: row.fees,
  slippageEstimate: row.slippage_estimate,
  grossPnl: row.gross_pnl,
  netPnl: row.net_pnl,
  setupId: row.setup_id ?? undefined,
  strategyId: row.strategy_id ?? undefined,
  tagIds: [],
  followedPlan: row.followed_plan,
  confidence: row.confidence ?? undefined,
  executionScore: row.execution_score ?? undefined,
  emotion: row.emotion ?? undefined,
  result: row.result,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at
})
