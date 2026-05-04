export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)

  const [profile, accounts, symbols, setups] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('accounts').select('*').is('deleted_at', null).order('is_default', { ascending: false }),
    supabase.from('symbols').select('*').is('deleted_at', null).order('sort_order'),
    supabase.from('setups').select('*').is('deleted_at', null).order('name')
  ])

  for (const result of [profile, accounts, symbols, setups]) {
    if (result.error) throw createError({ statusCode: 500, statusMessage: result.error.message })
  }

  let profileData = profile.data
  if (!profileData) {
    const { data: created } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        display_name: user.email?.split('@')[0] ?? 'Trader',
        timezone: 'America/Mexico_City',
        base_currency: 'USD'
      })
      .select('*')
      .single()
    profileData = created
  }

  return {
    profile: profileData,
    accounts: accounts.data ?? [],
    symbols: symbols.data ?? [],
    setups: setups.data ?? [],
    user: { id: user.id, email: user.email }
  }
})
