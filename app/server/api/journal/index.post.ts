import { z } from 'zod'

const dto = z.object({
  tradeId: z.string().uuid().optional().nullable(),
  journalDate: z.string(),
  timezone: z.string().default('America/Mexico_City'),
  confidence: z.number().int().min(1).max(10).optional().nullable(),
  executionScore: z.number().int().min(1).max(10).optional().nullable(),
  emotion: z.string().optional().nullable(),
  marketContext: z.string().optional().nullable(),
  wins: z.string().optional().nullable(),
  losses: z.string().optional().nullable(),
  lesson: z.string().optional().nullable()
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const body = dto.parse(await readBody(event))

  const { data, error } = await supabase
    .from('journal_entries')
    .insert({
      user_id: user.id,
      trade_id: body.tradeId ?? null,
      journal_date: body.journalDate,
      timezone: body.timezone,
      confidence: body.confidence ?? null,
      execution_score: body.executionScore ?? null,
      emotion: body.emotion ?? null,
      market_context: body.marketContext ?? null,
      wins: body.wins ?? null,
      losses: body.losses ?? null,
      lesson: body.lesson ?? null
    })
    .select('*')
    .single()

  if (error) throw createError({ statusCode: 400, statusMessage: error.message })
  return data
})
