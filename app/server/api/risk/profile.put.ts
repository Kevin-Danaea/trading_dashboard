import { z } from 'zod'

const dto = z.object({
  maxRiskPerTradePct: z.number().positive().optional(),
  dailyLossLimitAmount: z.number().min(0).optional(),
  weeklyLossLimitAmount: z.number().min(0).optional(),
  maxConsecutiveLosses: z.number().int().min(1).optional(),
  cooldownMinutesAfterStop: z.number().int().min(0).optional()
})

const map: Record<string, string> = {
  maxRiskPerTradePct: 'max_risk_per_trade_pct',
  dailyLossLimitAmount: 'daily_loss_limit_amount',
  weeklyLossLimitAmount: 'weekly_loss_limit_amount',
  maxConsecutiveLosses: 'max_consecutive_losses',
  cooldownMinutesAfterStop: 'cooldown_minutes_after_stop'
}

export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const body = dto.parse(await readBody(event))

  const update: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue
    update[map[key] ?? key] = value
  }

  const { data: existing, error: findError } = await supabase
    .from('risk_profiles')
    .select('id')
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()

  if (findError) throw createError({ statusCode: 500, statusMessage: findError.message })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'No risk profile found' })

  const { data, error } = await supabase
    .from('risk_profiles')
    .update(update)
    .eq('id', existing.id)
    .select('*')
    .single()

  if (error) throw createError({ statusCode: 400, statusMessage: error.message })
  return data
})
