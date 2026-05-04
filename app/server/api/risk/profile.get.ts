export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)

  const [{ data: profile, error: profileError }, { data: rules, error: rulesError }] = await Promise.all([
    supabase.from('risk_profiles').select('*').is('deleted_at', null).limit(1).maybeSingle(),
    supabase.from('risk_rules').select('*').is('deleted_at', null).order('code')
  ])

  if (profileError) throw createError({ statusCode: 500, statusMessage: profileError.message })
  if (rulesError) throw createError({ statusCode: 500, statusMessage: rulesError.message })

  return { profile, rules: rules ?? [] }
})
