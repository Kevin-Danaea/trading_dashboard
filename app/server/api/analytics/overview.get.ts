import { calculatePerformance } from '../../../../shared/domain/metrics'
import { tradeRowToDomain, type TradeRow } from '../../../../shared/domain/db'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const query = getQuery(event)

  let request = supabase
    .from('trades')
    .select('*, symbols(symbol), setups(name)')
    .is('deleted_at', null)
    .order('opened_at', { ascending: false })

  if (query.symbolId) request = request.eq('symbol_id', String(query.symbolId))
  if (query.setupId) request = request.eq('setup_id', String(query.setupId))
  if (query.session) request = request.eq('session', String(query.session))
  if (query.marketType) request = request.eq('market_type', String(query.marketType))
  if (query.from) request = request.gte('opened_at', String(query.from))
  if (query.to) request = request.lte('opened_at', String(query.to))

  const [{ data: rows, error }, { data: setupRows }, { data: insightRows }] = await Promise.all([
    request,
    supabase.from('setups').select('*').is('deleted_at', null).order('name'),
    supabase.from('insights').select('*').is('deleted_at', null).order('generated_at', { ascending: false }).limit(8)
  ])

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const trades = (rows as TradeRow[] | null ?? []).map(tradeRowToDomain)
  const metrics = calculatePerformance(trades, 0)
  const setups = setupRows ?? []

  return {
    filters: query,
    metrics,
    trades,
    setupBreakdown: setups.map((setup) => ({
      setup,
      metrics: calculatePerformance(trades.filter((trade) => trade.setupId === setup.id), 0)
    })),
    insights: insightRows ?? []
  }
})
