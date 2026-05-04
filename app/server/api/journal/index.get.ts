export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .is('deleted_at', null)
    .order('journal_date', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data ?? []
})
