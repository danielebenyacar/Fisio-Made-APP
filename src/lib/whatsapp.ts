/**
 * Normalizes a phone number to E.164 (+393331234567), or null if it can't be one.
 * Removes spaces and symbols and adds +39 when the international prefix is missing.
 */
export function normalizePhone(raw: string): string | null {
  const text = raw.trim()
  let digits = text.replace(/\D/g, '')
  if (!text.startsWith('+')) {
    if (digits.startsWith('00')) {
      digits = digits.slice(2)
    } else if (!(digits.startsWith('39') && digits.length >= 11)) {
      // Italian numbers without prefix have at most 10 digits when they start
      // with 3 (mobiles), so 11+ digits starting with 39 already carry it.
      digits = `39${digits}`
    }
  }
  if (digits.length < 8 || digits.length > 15) return null
  return `+${digits}`
}

/** For display: "+393331234567" → "+39 333 123 4567". */
export function formatPhone(e164: string): string {
  const italianMobile = /^\+39(3\d{2})(\d{3})(\d{3,4})$/.exec(e164)
  if (italianMobile) return `+39 ${italianMobile.slice(1).join(' ')}`
  if (e164.startsWith('+39')) return `+39 ${e164.slice(3)}`
  return e164
}

/** wa.me link opening a chat with a prefilled message. */
export function linkWhatsApp(e164: string, testo: string): string {
  return `https://wa.me/${e164.replace(/\D/g, '')}?text=${encodeURIComponent(testo)}`
}
