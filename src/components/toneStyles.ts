import type { Tono } from '../lib/pacchettoLabel'

/** Colors of a status message, by how urgent it is. */
export const TONE_STYLE: Record<Tono, string> = {
  ok: 'border-posturale-200 bg-posturale-50 text-posturale-800',
  avviso: 'border-warning-300 bg-warning-50 text-warning-900',
  problema: 'border-danger-200 bg-danger-50 text-danger-800',
  neutro: 'border-brand-200 bg-brand-100 text-brand-800',
}
