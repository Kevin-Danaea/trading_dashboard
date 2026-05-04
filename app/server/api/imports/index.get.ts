export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const { data, error } = await supabase
    .from('imported_files')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data ?? []
})
