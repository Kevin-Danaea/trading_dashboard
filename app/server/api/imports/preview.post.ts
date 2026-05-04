import { z } from 'zod'

const previewDto = z.object({
  source: z.enum(['manual', 'csv_import', 'exchange_api']),
  filename: z.string(),
  contentHash: z.string(),
  headers: z.array(z.string()),
  sampleRows: z.array(z.record(z.string(), z.string()))
})

export default defineEventHandler(async (event) => {
  const dto = previewDto.parse(await readBody(event))
  const lowerHeaders = new Set(dto.headers.map((header) => header.toLowerCase()))
  const suggestedMapping = {
    executedAt: lowerHeaders.has('time') ? 'time' : lowerHeaders.has('datetime') ? 'datetime' : null,
    symbol: lowerHeaders.has('symbol') ? 'symbol' : null,
    side: lowerHeaders.has('side') ? 'side' : null,
    quantity: lowerHeaders.has('executedqty') ? 'executedQty' : lowerHeaders.has('qty') ? 'qty' : null,
    price: lowerHeaders.has('avgfillprice') ? 'avgFillPrice' : lowerHeaders.has('price') ? 'price' : null,
    fee: lowerHeaders.has('commission') ? 'commission' : lowerHeaders.has('fee') ? 'fee' : null
  }
  return {
    importId: crypto.randomUUID(),
    filename: dto.filename,
    contentHash: dto.contentHash,
    rowCount: dto.sampleRows.length,
    suggestedMapping,
    warnings: Object.entries(suggestedMapping).filter(([, value]) => value === null).map(([key]) => `Missing suggested mapping for ${key}`)
  }
})
