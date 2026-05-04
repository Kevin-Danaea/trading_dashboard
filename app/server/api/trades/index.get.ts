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
  if (query.result) request = request.eq('result', String(query.result))
  if (query.setupId) request = request.eq('setup_id', String(query.setupId))

  const { data, error } = await request
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return (data as TradeRow[] | null ?? []).map(tradeRowToDomain)
})
