import { z } from 'zod'

const dto = z.object({
  name: z.string().min(1).optional(),
  baseCurrency: z.string().min(1).optional(),
  startingBalance: z.number().min(0).optional(),
  marketTypes: z.array(z.string()).optional()
})

const map: Record<string, string> = {
  baseCurrency: 'base_currency',
  startingBalance: 'starting_balance',
  marketTypes: 'market_types'
}

export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing account id' })
  const body = dto.parse(await readBody(event))

  const update: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue
    update[map[key] ?? key] = value
  }

  const { data, error } = await supabase
    .from('accounts')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw createError({ statusCode: 400, statusMessage: error.message })
  return data
})
