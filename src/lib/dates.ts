import { differenceInYears, format } from 'date-fns'
import { it } from 'date-fns/locale'

/** Calendar date as YYYY-MM-DD, in the device's local time (Europe/Rome). */
export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** E.g. "mercoledì 1 ottobre". */
export function formatDayHeading(date: Date): string {
  return format(date, 'EEEE d MMMM', { locale: it })
}

/** "1985-10-03" → "03/10/1985". */
export function formatDateIt(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

/** "2026-10-03" → "3 ott". */
export function formatDateShort(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return format(new Date(year, month - 1, day), 'd MMM', { locale: it })
}

/** YYYY-MM-DD from numbers, or null if the day does not exist (e.g. 31/02). */
export function isoDateFromParts(year: number, month: number, day: number): string | null {
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return toIsoDate(date)
}

/**
 * Parses a date typed or stored as text: "3/10/1985", "03-10-1985", "03.10.1985"
 * or "1985-10-03". Two-digit years are rejected as ambiguous.
 */
export function parseDateText(text: string): string | null {
  const value = text.trim()
  const italian = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(value)
  if (italian) return isoDateFromParts(Number(italian[3]), Number(italian[2]), Number(italian[1]))
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (iso) return isoDateFromParts(Number(iso[1]), Number(iso[2]), Number(iso[3]))
  return null
}

/** Whole years between a YYYY-MM-DD birth date and `today`. */
export function ageOn(isoBirthDate: string, today: Date): number {
  const [year, month, day] = isoBirthDate.split('-').map(Number)
  return differenceInYears(today, new Date(year, month - 1, day))
}
