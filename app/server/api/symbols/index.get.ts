export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const { data, error } = await supabase
    .from('symbols')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data ?? []
})
