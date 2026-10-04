import { differenceInCalendarDays } from 'date-fns'
import type { Pacchetto } from '../data/types'
import { oraDi } from './agenda'
import { formatDateIt, formatDayHeading } from './dates'
import type { StatoPacchetto } from './packages'
import { SOGLIA_DA_RINNOVARE } from './packages'

// All the WhatsApp texts in one place, so they are easy to change.
// {placeholders} are replaced by the functions below.
export const TEMPLATE = {
  riepilogoSedute:
    'Ciao {nome}! Lezione di oggi registrata ✅ Hai fatto {fatte} lezioni su {totali}, te ne restano {residue}.',
  riepilogoAbbonamento: 'Ciao {nome}! Lezione di oggi registrata ✅ Il tuo abbonamento {pacchetto} è valido fino al {scadenza}.',
  quasiFinito: 'Il pacchetto sta per finire, ne parliamo alla prossima lezione 😊',
  quasiScaduto: 'L’abbonamento sta per scadere, ne parliamo alla prossima lezione 😊',
  auguri: 'Tanti auguri {nome}! 🎉 Un abbraccio da Fisio Made.',
  promemoria: 'Ciao {nome}! Ti ricordo l’appuntamento da Fisio Made {quando} alle {ora}. A presto!',
} as const

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match))
}

/** Summary sent after a lesson, from the state of the package it used. */
export function messaggioRiepilogo(nome: string, pacchetto: Pacchetto, stato: StatoPacchetto): string {
  if (pacchetto.modalita === 'sedute') {
    const base = fill(TEMPLATE.riepilogoSedute, { nome, fatte: stato.fatte, totali: stato.totali, residue: stato.residue })
    return stato.residue <= SOGLIA_DA_RINNOVARE ? `${base} ${TEMPLATE.quasiFinito}` : base
  }
  const base = fill(TEMPLATE.riepilogoAbbonamento, {
    nome,
    pacchetto: pacchetto.nome,
    scadenza: formatDateIt(pacchetto.scadenza!),
  })
  return stato.inScadenza || stato.esaurito ? `${base} ${TEMPLATE.quasiScaduto}` : base
}

/** Reminder of an appointment: "domani alle 10:00", "giovedì 1 ottobre alle 10:00". */
export function messaggioPromemoria(nome: string, inizio: Date, now: Date): string {
  const days = differenceInCalendarDays(inizio, now)
  const quando = days === 0 ? 'oggi' : days === 1 ? 'domani' : formatDayHeading(inizio)
  return fill(TEMPLATE.promemoria, { nome, quando, ora: oraDi(inizio) })
}

export function messaggioAuguri(nome: string): string {
  return fill(TEMPLATE.auguri, { nome })
}
