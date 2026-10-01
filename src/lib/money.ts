/** "60" → 60, "60,50" → 60.5, "€ 1.200" → 1200; null if not a non-negative amount. */
export function parseEuro(text: string): number | null {
  const cleaned = text.replace(/[€\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  return Number(cleaned)
}

const WHOLE = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const CENTS = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })

/** 60 → "60 €", 60.5 → "60,50 €". */
export function formatEuro(amount: number): string {
  return (Number.isInteger(amount) ? WHOLE : CENTS).format(amount)
}

/** For editable fields: 60 → "60", 60.5 → "60,50". */
export function euroToInput(amount: number | undefined): string {
  if (amount === undefined) return ''
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace('.', ',')
}
