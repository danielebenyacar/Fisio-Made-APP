import { addDays, addMinutes, getISODay, startOfDay, startOfWeek } from 'date-fns'
import type { Appuntamento, Corso, Disciplina, Lezione } from '../data/types'
import { toIsoDate } from './dates'
import { parseIsoDate } from './packages'

export const GIORNI = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'] as const

/** "18:30" on a YYYY-MM-DD day, in local time. */
export function dataOra(isoDate: string, ora: string): Date {
  const [h, m] = ora.split(':').map(Number)
  const day = parseIsoDate(isoDate)
  day.setHours(h, m, 0, 0)
  return day
}

/** "HH:mm" of a date, in local time. */
export function oraDi(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** Monday of the week containing `date`, at midnight. */
export function inizioSettimana(date: Date): Date {
  return startOfWeek(startOfDay(date), { weekStartsOn: 1 })
}

/** The 7 days (Monday–Sunday) of the week containing `date`. */
export function giorniSettimana(date: Date): Date[] {
  const monday = inizioSettimana(date)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

export type Occorrenza = { corso: Corso; giorno: string; inizio: Date; fine: Date }

/** Sessions of the active classes on the given days, by start time. */
export function occorrenzeCorsi(corsi: Corso[], giorni: Date[]): Occorrenza[] {
  return giorni
    .flatMap((day) =>
      corsi
        .filter((c) => c.attivo && c.giorno === getISODay(day))
        .map((corso) => {
          const giorno = toIsoDate(day)
          const inizio = dataOra(giorno, corso.ora)
          return { corso, giorno, inizio, fine: addMinutes(inizio, corso.durataMinuti) }
        }),
    )
    .sort((a, b) => a.inizio.getTime() - b.inizio.getTime() || a.corso.nome.localeCompare(b.corso.nome, 'it'))
}

/** Lessons recorded for one session of a class (same class, same local day). */
export function presentiOccorrenza(lezioni: Lezione[], corsoId: string, giorno: string): Lezione[] {
  return lezioni.filter((l) => l.corsoId === corsoId && toIsoDate(new Date(l.data)) === giorno)
}

/** The class of today closest to `now` for a discipline, to attach a quick "Segna lezione". */
export function corsoPiuVicino(corsi: Corso[], disciplina: Corso['disciplina'], now: Date): Occorrenza | null {
  const today = occorrenzeCorsi(
    corsi.filter((c) => c.disciplina === disciplina),
    [now],
  )
  let best: Occorrenza | null = null
  for (const o of today) {
    if (!best || Math.abs(o.inizio.getTime() - now.getTime()) < Math.abs(best.inizio.getTime() - now.getTime())) {
      best = o
    }
  }
  return best
}

/** A scheduled appointment whose time has passed without being marked. */
export function daSegnare(appuntamento: Appuntamento, now: Date): boolean {
  return appuntamento.stato === 'programmato' && new Date(appuntamento.inizio) < now
}

/** The lesson (done or absence) of a client in one session of a class, if recorded. */
export function presenzaInOccorrenza(
  lezioni: Lezione[],
  clienteId: string,
  corsoId: string,
  giorno: string,
): Lezione | undefined {
  return presentiOccorrenza(lezioni, corsoId, giorno).find((l) => l.clienteId === clienteId)
}

/**
 * A lesson already done the same week (Monday–Sunday) in another session,
 * e.g. the client switched group this week.
 */
export function lezioneAltraOccorrenza(
  lezioni: Lezione[],
  clienteId: string,
  disciplina: Disciplina,
  quando: Date,
  corsoId: string,
): Lezione | undefined {
  const start = inizioSettimana(quando)
  const end = addDays(start, 7)
  const giorno = toIsoDate(quando)
  return lezioni.find((l) => {
    const data = new Date(l.data)
    return (
      l.clienteId === clienteId &&
      l.disciplina === disciplina &&
      l.stato === 'fatta' &&
      data >= start &&
      data < end &&
      !(l.corsoId === corsoId && toIsoDate(data) === giorno)
    )
  })
}

/** The fixed groups of a client. */
export function gruppiDelCliente(corsi: Corso[], clienteId: string): Corso[] {
  return corsi.filter((c) => c.iscritti.includes(clienteId))
}
