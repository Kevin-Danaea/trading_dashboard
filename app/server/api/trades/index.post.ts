import { z } from 'zod'
import type { TradeRow } from '../../../../shared/domain/db'

const createTradeDto = z.object({
  accountId: z.string().uuid().optional(),
  symbolId: z.string().uuid(),
  setupId: z.string().uuid().optional().nullable(),
  side: z.enum(['long', 'short']),
  marketType: z.enum(['crypto_spot', 'crypto_futures', 'futures', 'forex', 'stocks', 'commodities', 'cfd']),
  openedAt: z.string().datetime(),
  closedAt: z.string().datetime(),
  session: z.enum(['Asia', 'London', 'NY AM', 'NY PM', 'Overnight']),
  timezone: z.string().min(1).default('America/Mexico_City'),
  plannedEntry: z.number().positive().optional(),
  plannedStop: z.number().positive(),
  plannedTarget: z.number().positive().optional(),
  averageEntry: z.number().positive(),
  averageExit: z.number().positive(),
  quantity: z.number().positive(),
  plannedRiskAmount: z.number().positive(),
  grossPnl: z.number(),
  fees: z.number().min(0),
  slippageEstimate: z.number().min(0).default(0),
  followedPlan: z.boolean().default(false),
  confidence: z.number().int().min(1).max(10).optional(),
  executionScore: z.number().int().min(1).max(10).optional(),
  emotion: z.string().optional(),
  notes: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const dto = createTradeDto.parse(await readBody(event))

  const accountId = dto.accountId ?? await getDefaultAccountId(supabase)

  const { data, error } = await supabase
    .from('trades')
    .insert({
      user_id: user.id,
      account_id: accountId,
      symbol_id: dto.symbolId,
      setup_id: dto.setupId ?? null,
      market_type: dto.marketType,
      side: dto.side,
      status: 'closed',
      opened_at: dto.openedAt,
      closed_at: dto.closedAt,
      session: dto.session,
      timezone: dto.timezone,
      planned_entry: dto.plannedEntry ?? null,
      planned_stop: dto.plannedStop,
      planned_target: dto.plannedTarget ?? null,
      average_entry: dto.averageEntry,
      average_exit: dto.averageExit,
      quantity: dto.quantity,
      planned_risk_amount: dto.plannedRiskAmount,
      gross_pnl: dto.grossPnl,
      fees: dto.fees,
      slippage_estimate: dto.slippageEstimate,
      followed_plan: dto.followedPlan,
      confidence: dto.confidence ?? null,
      execution_score: dto.executionScore ?? null,
      emotion: dto.emotion ?? null,
      notes: dto.notes ?? null
    })
    .select('*, symbols(symbol), setups(name)')
    .single()

  if (error) throw createError({ statusCode: 400, statusMessage: error.message })
  return data as TradeRow
})

const getDefaultAccountId = async (supabase: ReturnType<typeof useSupabaseServerClient>) => {
  const { data, error } = await supabase
    .from('accounts')
    .select('id')
    .is('deleted_at', null)
    .eq('is_default', true)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 422, statusMessage: 'No default trading account found. Run the Supabase migration or create an account.' })
  }
  return data.id as string
}
