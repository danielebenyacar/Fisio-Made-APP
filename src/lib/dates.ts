import { format } from 'date-fns'
import { it } from 'date-fns/locale'

/** Calendar date as YYYY-MM-DD, in the device's local time (Europe/Rome). */
export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** E.g. "mercoledì 1 ottobre". */
export function formatDayHeading(date: Date): string {
  return format(date, 'EEEE d MMMM', { locale: it })
}
