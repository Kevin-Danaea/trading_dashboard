export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)

  const [profile, accounts, symbols, setups] = await Promise.all([
    supabase.from('profiles').select('*').single(),
    supabase.from('accounts').select('*').is('deleted_at', null).order('is_default', { ascending: false }),
    supabase.from('symbols').select('*').is('deleted_at', null).order('sort_order'),
    supabase.from('setups').select('*').is('deleted_at', null).order('name')
  ])

  for (const result of [profile, accounts, symbols, setups]) {
    if (result.error) throw createError({ statusCode: 500, statusMessage: result.error.message })
  }

  return {
    profile: profile.data,
    accounts: accounts.data ?? [],
    symbols: symbols.data ?? [],
    setups: setups.data ?? []
  }
})
