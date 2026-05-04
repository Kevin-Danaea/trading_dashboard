export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing setup id' })

  const { error } = await supabase
    .from('setups')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw createError({ statusCode: 400, statusMessage: error.message })
  return { ok: true }
})
