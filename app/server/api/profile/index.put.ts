import { z } from 'zod'

const dto = z.object({
  displayName: z.string().min(1).optional(),
  timezone: z.string().min(1).optional(),
  baseCurrency: z.string().min(1).optional(),
  onboardingCompleted: z.boolean().optional()
})

const map: Record<string, string> = {
  displayName: 'display_name',
  baseCurrency: 'base_currency',
  onboardingCompleted: 'onboarding_completed'
}

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const body = dto.parse(await readBody(event))

  const update: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue
    update[map[key] ?? key] = value
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', user.id)
    .select('*')
    .single()

  if (error) throw createError({ statusCode: 400, statusMessage: error.message })
  return data
})
