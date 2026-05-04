import { z } from 'zod'

const dto = z.object({
  setupId: z.string().uuid().optional().nullable(),
  side: z.enum(['long', 'short']).optional(),
  status: z.enum(['planned', 'open', 'closed', 'void']).optional(),
  openedAt: z.string().datetime().optional(),
  closedAt: z.string().datetime().optional().nullable(),
  session: z.enum(['Asia', 'London', 'NY AM', 'NY PM', 'Overnight']).optional(),
  plannedEntry: z.number().positive().optional().nullable(),
  plannedStop: z.number().positive().optional(),
  plannedTarget: z.number().positive().optional().nullable(),
  averageEntry: z.number().positive().optional(),
  averageExit: z.number().positive().optional().nullable(),
  quantity: z.number().positive().optional(),
  plannedRiskAmount: z.number().positive().optional(),
  grossPnl: z.number().optional(),
  fees: z.number().min(0).optional(),
  slippageEstimate: z.number().min(0).optional(),
  followedPlan: z.boolean().optional(),
  confidence: z.number().int().min(1).max(10).optional().nullable(),
  executionScore: z.number().int().min(1).max(10).optional().nullable(),
  emotion: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
})

const map: Record<string, string> = {
  setupId: 'setup_id',
  openedAt: 'opened_at',
  closedAt: 'closed_at',
  plannedEntry: 'planned_entry',
  plannedStop: 'planned_stop',
  plannedTarget: 'planned_target',
  averageEntry: 'average_entry',
  averageExit: 'average_exit',
  plannedRiskAmount: 'planned_risk_amount',
  grossPnl: 'gross_pnl',
  slippageEstimate: 'slippage_estimate',
  followedPlan: 'followed_plan',
  executionScore: 'execution_score'
}

export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing trade id' })
  const body = dto.parse(await readBody(event))

  const update: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue
    update[map[key] ?? key] = value
  }

  const { data, error } = await supabase
    .from('trades')
    .update(update)
    .eq('id', id)
    .select('*, symbols(symbol), setups(name)')
    .single()

  if (error) throw createError({ statusCode: 400, statusMessage: error.message })
  return data
})
