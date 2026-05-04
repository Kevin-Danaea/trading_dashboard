import { z } from 'zod'

const dto = z.object({
  enabled: z.boolean().optional(),
  severity: z.enum(['info', 'warn', 'block']).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  name: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing rule id' })
  const body = dto.parse(await readBody(event))

  const { data, error } = await supabase
    .from('risk_rules')
    .update(body)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw createError({ statusCode: 400, statusMessage: error.message })
  return data
})
