import { z } from 'zod'

const createSymbolDto = z.object({
  symbol: z.string().min(3),
  baseAsset: z.string().min(1),
  quoteAsset: z.string().min(1),
  marketType: z.enum(['crypto_spot', 'crypto_futures', 'futures', 'forex', 'stocks', 'commodities', 'cfd'])
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const dto = createSymbolDto.parse(await readBody(event))

  const { data, error } = await supabase
    .from('symbols')
    .insert({
      user_id: user.id,
      symbol: dto.symbol,
      base_asset: dto.baseAsset,
      quote_asset: dto.quoteAsset,
      market_type: dto.marketType,
      is_active: true,
      is_default: false,
      sort_order: 100
    })
    .select('*')
    .single()

  if (error) throw createError({ statusCode: 400, statusMessage: error.message })
  return data
})
