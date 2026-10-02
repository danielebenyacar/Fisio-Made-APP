import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachWeekOfInterval,
  startOfWeek,
  subDays,
} from 'date-fns'
import type { Disciplina, Lezione, Pacchetto } from '../data/types'
import { toIsoDate } from './dates'

/** An active subscription is "in scadenza" this many days before it ends. */
export const GIORNI_PREAVVISO_SCADENZA = 7
/** A sessions package is "da rinnovare" with this many sessions left or fewer. */
export const SOGLIA_DA_RINNOVARE = 2

const WEEK = { weekStartsOn: 1 } as const // weeks run Monday–Sunday

export function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Last valid day of a period of `mesi` months: 1 Oct → 31 Oct, 15 Oct → 14 Nov. */
export function scadenzaDopoMesi(dataInizio: string, mesi: number): string {
  return toIsoDate(subDays(addMonths(parseIsoDate(dataInizio), mesi), 1))
}

const lezioniFatte = (pacchetto: Pacchetto, lezioni: Lezione[]) =>
  lezioni.filter((l) => l.pacchettoId === pacchetto.id && l.stato === 'fatta')

export type StatoSettimana = 'fatta' | 'persa' | 'da-fare'
export type Settimana = { inizio: string; stato: StatoSettimana }

/**
 * The weeks (Monday–Sunday) covered by a subscription. Each gives the right to
 * one lesson: 'fatta' if a lesson was done, 'persa' if it went by without one,
 * 'da-fare' if it can still be used.
 */
export function settimaneAbbonamento(
  pacchetto: Pacchetto,
  lezioni: Lezione[],
  today: Date,
): Settimana[] {
  if (pacchetto.modalita !== 'abbonamento' || !pacchetto.scadenza) return []
  const start = parseIsoDate(pacchetto.dataInizio)
  const end = parseIsoDate(pacchetto.scadenza)
  if (end < start) return []

  const done = lezioniFatte(pacchetto, lezioni).map((l) => new Date(l.data))
  const currentWeek = startOfWeek(today, WEEK)
  const expired = toIsoDate(today) > pacchetto.scadenza

  return eachWeekOfInterval({ start, end }, WEEK).map((weekStart) => {
    const weekEnd = addDays(weekStart, 7)
    const stato: StatoSettimana = done.some((d) => d >= weekStart && d < weekEnd)
      ? 'fatta'
      : expired || weekStart < currentWeek
        ? 'persa'
        : 'da-fare'
    return { inizio: toIsoDate(weekStart), stato }
  })
}

/**
 * Lessons still available. The ONLY place where this rule lives:
 * - 'sedute': sessions bought minus lessons done (absences never count);
 * - 'abbonamento': weeks that can still be used.
 */
export function residue(pacchetto: Pacchetto, lezioni: Lezione[], today: Date): number {
  if (pacchetto.modalita === 'abbonamento') {
    return settimaneAbbonamento(pacchetto, lezioni, today).filter((s) => s.stato === 'da-fare').length
  }
  return Math.max(0, (pacchetto.lezioniTotali ?? 0) - lezioniFatte(pacchetto, lezioni).length)
}

export type StatoPacchetto = {
  fatte: number
  /** 'sedute': sessions bought; 'abbonamento': weeks covered. */
  totali: number
  residue: number
  settimane: Settimana[] // empty for 'sedute'
  nonIniziato: boolean
  scaduto: boolean
  /** Calendar days until the last valid day (0 = expires today). */
  giorniAllaScadenza?: number
  /** Nothing left to use: sessions finished, or subscription over. */
  esaurito: boolean
  attivo: boolean
  inScadenza: boolean
  daRinnovare: boolean
}

export function statoPacchetto(pacchetto: Pacchetto, lezioni: Lezione[], today: Date): StatoPacchetto {
  const todayIso = toIsoDate(today)
  const settimane = settimaneAbbonamento(pacchetto, lezioni, today)
  const fatte = lezioniFatte(pacchetto, lezioni).length
  const left = residue(pacchetto, lezioni, today)
  const scaduto = pacchetto.scadenza !== undefined && todayIso > pacchetto.scadenza
  const giorniAllaScadenza = pacchetto.scadenza
    ? differenceInCalendarDays(parseIsoDate(pacchetto.scadenza), parseIsoDate(todayIso))
    : undefined
  const esaurito = scaduto || left === 0
  const attivo = !esaurito
  const inScadenza =
    attivo && giorniAllaScadenza !== undefined && giorniAllaScadenza <= GIORNI_PREAVVISO_SCADENZA

  return {
    fatte,
    totali: pacchetto.modalita === 'abbonamento' ? settimane.length : (pacchetto.lezioniTotali ?? 0),
    residue: left,
    settimane,
    nonIniziato: todayIso < pacchetto.dataInizio,
    scaduto,
    giorniAllaScadenza,
    esaurito,
    attivo,
    inScadenza,
    daRinnovare:
      inScadenza || (attivo && pacchetto.modalita === 'sedute' && left <= SOGLIA_DA_RINNOVARE),
  }
}

/** Oldest first: the order in which packages get used (FIFO). */
export function ordinaPacchetti(pacchetti: Pacchetto[]): Pacchetto[] {
  return [...pacchetti].sort(
    (a, b) =>
      a.dataInizio.localeCompare(b.dataInizio) ||
      a.dataAcquisto.localeCompare(b.dataAcquisto) ||
      a.createdAt.localeCompare(b.createdAt),
  )
}

/** True when the client bought another package of the same discipline after this one. */
export function haSuccessivo(pacchetto: Pacchetto, pacchetti: Pacchetto[]): boolean {
  const sameKind = ordinaPacchetti(
    pacchetti.filter((p) => p.clienteId === pacchetto.clienteId && p.disciplina === pacchetto.disciplina),
  )
  const index = sameKind.findIndex((p) => p.id === pacchetto.id)
  return index !== -1 && index < sameKind.length - 1
}

export type PacchettoInEvidenza = { pacchetto: Pacchetto; stato: StatoPacchetto; rinnovato: boolean }

/**
 * For each discipline, the package that matters right now: the oldest still
 * usable one, otherwise the most recent (finished or expired) one.
 */
export function pacchettiInEvidenza(
  pacchetti: Pacchetto[],
  lezioni: Lezione[],
  today: Date,
): Map<Disciplina, PacchettoInEvidenza> {
  const result = new Map<Disciplina, PacchettoInEvidenza>()
  const byDisciplina = new Map<Disciplina, Pacchetto[]>()
  for (const p of ordinaPacchetti(pacchetti)) {
    byDisciplina.set(p.disciplina, [...(byDisciplina.get(p.disciplina) ?? []), p])
  }
  for (const [disciplina, list] of byDisciplina) {
    const withStato = list.map((pacchetto, i) => ({
      pacchetto,
      stato: statoPacchetto(pacchetto, lezioni, today),
      rinnovato: i < list.length - 1,
    }))
    result.set(disciplina, withStato.find((x) => x.stato.attivo) ?? withStato[withStato.length - 1])
  }
  return result
}

export type SceltaPacchetto =
  | { tipo: 'ok'; pacchetto: Pacchetto }
  /** Only subscriptions whose week is already used: can be recorded anyway, it uses no extra right. */
  | { tipo: 'settimana-gia-usata'; pacchetto: Pacchetto }
  | { tipo: 'nessuno' }

/**
 * Which package a lesson of `disciplina` on `quando` uses (FIFO): the oldest
 * package valid that day with something left — sessions left, or a
 * subscription whose week is still unused.
 */
export function pacchettoPerLezione(
  pacchetti: Pacchetto[],
  lezioni: Lezione[],
  disciplina: Disciplina,
  quando: Date,
): SceltaPacchetto {
  const day = toIsoDate(quando)
  const weekStart = startOfWeek(quando, WEEK)
  const weekEnd = addDays(weekStart, 7)
  let weekUsed: Pacchetto | undefined

  const candidates = ordinaPacchetti(
    pacchetti.filter(
      (p) => p.disciplina === disciplina && p.dataInizio <= day && (!p.scadenza || day <= p.scadenza),
    ),
  )
  for (const p of candidates) {
    const done = lezioniFatte(p, lezioni)
    if (p.modalita === 'sedute') {
      if (done.length < (p.lezioniTotali ?? 0)) return { tipo: 'ok', pacchetto: p }
    } else if (done.some((l) => new Date(l.data) >= weekStart && new Date(l.data) < weekEnd)) {
      weekUsed ??= p
    } else {
      return { tipo: 'ok', pacchetto: p }
    }
  }
  return weekUsed ? { tipo: 'settimana-gia-usata', pacchetto: weekUsed } : { tipo: 'nessuno' }
}
