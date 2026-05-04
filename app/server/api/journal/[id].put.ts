import { z } from 'zod'

const dto = z.object({
  tradeId: z.string().uuid().optional().nullable(),
  journalDate: z.string().optional(),
  timezone: z.string().optional(),
  confidence: z.number().int().min(1).max(10).optional().nullable(),
  executionScore: z.number().int().min(1).max(10).optional().nullable(),
  emotion: z.string().optional().nullable(),
  marketContext: z.string().optional().nullable(),
  wins: z.string().optional().nullable(),
  losses: z.string().optional().nullable(),
  lesson: z.string().optional().nullable()
})

const map: Record<string, string> = {
  tradeId: 'trade_id',
  journalDate: 'journal_date',
  executionScore: 'execution_score',
  marketContext: 'market_context'
}

export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing entry id' })
  const body = dto.parse(await readBody(event))

  const update: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue
    update[map[key] ?? key] = value
  }

  const { data, error } = await supabase
    .from('journal_entries')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw createError({ statusCode: 400, statusMessage: error.message })
  return data
})
