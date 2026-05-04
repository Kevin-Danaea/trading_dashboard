export const formatCurrency = (value: number, digits = 2) => {
  const sign = value < 0 ? '-' : ''
  return `${sign}$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })}`
}

export const formatSignedCurrency = (value: number, digits = 2) => {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })}`
}

export const formatPercent = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`

export const formatR = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}R`

export const formatHoldTime = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`
