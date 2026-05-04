import { z } from 'zod'

const dto = z.object({
  name: z.string().min(1),
  status: z.enum(['active', 'review', 'paused', 'archived']).default('active'),
  context: z.string().default(''),
  triggers: z.string().default(''),
  invalidations: z.string().default(''),
  confirmations: z.string().optional().nullable(),
  riskManagement: z.string().default(''),
  checklist: z.array(z.string()).default([])
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const body = dto.parse(await readBody(event))

  const { data, error } = await supabase
    .from('setups')
    .insert({
      user_id: user.id,
      name: body.name,
      status: body.status,
      context: body.context,
      triggers: body.triggers,
      invalidations: body.invalidations,
      confirmations: body.confirmations ?? null,
      risk_management: body.riskManagement,
      checklist: body.checklist
    })
    .select('*')
    .single()

  if (error) throw createError({ statusCode: 400, statusMessage: error.message })
  return data
})
