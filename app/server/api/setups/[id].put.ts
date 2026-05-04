import { z } from 'zod'

const dto = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['active', 'review', 'paused', 'archived']).optional(),
  context: z.string().optional(),
  triggers: z.string().optional(),
  invalidations: z.string().optional(),
  confirmations: z.string().optional().nullable(),
  riskManagement: z.string().optional(),
  checklist: z.array(z.string()).optional()
})

export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing setup id' })
  const body = dto.parse(await readBody(event))

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = body.name
  if (body.status !== undefined) update.status = body.status
  if (body.context !== undefined) update.context = body.context
  if (body.triggers !== undefined) update.triggers = body.triggers
  if (body.invalidations !== undefined) update.invalidations = body.invalidations
  if (body.confirmations !== undefined) update.confirmations = body.confirmations
  if (body.riskManagement !== undefined) update.risk_management = body.riskManagement
  if (body.checklist !== undefined) update.checklist = body.checklist

  const { data, error } = await supabase
    .from('setups')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw createError({ statusCode: 400, statusMessage: error.message })
  return data
})
