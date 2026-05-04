export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const today = new Date().toISOString().slice(0, 10)

  const [{ data: profile }, { data: trades, error }] = await Promise.all([
    supabase
      .from('risk_profiles')
      .select('*')
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('trades')
      .select('net_pnl, planned_risk_amount, result, opened_at')
      .is('deleted_at', null)
      .gte('opened_at', `${today}T00:00:00.000Z`)
  ])

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const usedRiskAmount = (trades ?? []).reduce((sum, trade) => sum + Number(trade.planned_risk_amount ?? 0), 0)
  const dailyLossLimitAmount = Number(profile?.daily_loss_limit_amount ?? 300)
  const losses = (trades ?? []).filter((trade) => trade.result === 'loss').length

  return {
    accountId: profile?.account_id,
    status: usedRiskAmount >= dailyLossLimitAmount ? 'blocked' : 'allowed',
    timezone: 'America/Mexico_City',
    today: {
      usedRiskAmount,
      dailyLossLimitAmount,
      lossStreak: losses,
      maxConsecutiveLosses: Number(profile?.max_consecutive_losses ?? 2),
      remainingRiskAmount: Math.max(0, dailyLossLimitAmount - usedRiskAmount)
    },
    activeBlocks: usedRiskAmount >= dailyLossLimitAmount ? [{ code: 'daily_loss_limit', message: 'Daily risk limit reached.' }] : [],
    warnings: losses >= Number(profile?.max_consecutive_losses ?? 2) ? [{ code: 'loss_streak_cutoff', message: 'Loss streak cutoff reached.' }] : []
  }
})
