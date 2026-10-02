import { addMinutes, isSameDay } from 'date-fns'
import type { Appuntamento, Corso, Disciplina } from '../data/types'
import { dataOra, occorrenzeCorsi } from './agenda'
import { parseIsoDate } from './packages'

/** Opening hours of the studio: free times are proposed only inside them. */
export const ORARIO_STUDIO = { apertura: '08:00', chiusura: '21:00' } as const

export type OrarioStudio = { apertura: string; chiusura: string }

/** Something already in the calendar: a group class or an appointment. */
export type Impegno = {
  id: string
  tipo: 'corso' | 'appuntamento'
  /** Class name or client name. */
  titolo: string
  disciplina: Disciplina
  inizio: Date
  fine: Date
}

/** Commitments of one day: active classes and appointments not cancelled, by start time. */
export function impegniDelGiorno(
  giorno: string,
  corsi: Corso[],
  appuntamenti: Appuntamento[],
  nomeCliente: (clienteId: string) => string,
  ignoraAppuntamentoId?: string,
): Impegno[] {
  const day = parseIsoDate(giorno)
  const classi: Impegno[] = occorrenzeCorsi(corsi, [day]).map((o) => ({
    id: `${o.corso.id}-${o.giorno}`,
    tipo: 'corso',
    titolo: o.corso.nome,
    disciplina: o.corso.disciplina,
    inizio: o.inizio,
    fine: o.fine,
  }))
  const sedute: Impegno[] = appuntamenti
    .filter((a) => a.stato !== 'annullato' && a.id !== ignoraAppuntamentoId && isSameDay(new Date(a.inizio), day))
    .map((a) => {
      const inizio = new Date(a.inizio)
      return {
        id: a.id,
        tipo: 'appuntamento',
        titolo: nomeCliente(a.clienteId),
        disciplina: a.disciplina,
        inizio,
        fine: addMinutes(inizio, a.durataMinuti),
      }
    })
  return [...classi, ...sedute].sort((a, b) => a.inizio.getTime() - b.inizio.getTime())
}

/** Commitments overlapping [inizio, inizio + durata). Touching ones (one ends when the other starts) don't. */
export function impegniSovrapposti(impegni: Impegno[], inizio: Date, durataMinuti: number): Impegno[] {
  const fine = addMinutes(inizio, durataMinuti)
  return impegni.filter((i) => i.inizio < fine && inizio < i.fine)
}

export type Fascia = { tipo: 'liberi'; orari: Date[] } | { tipo: 'impegno'; impegno: Impegno }

/**
 * The day as a list, in time order: commitments, and between them the start times where an
 * appointment of `durataMinuti` fits — every full hour within opening hours, plus right after a
 * commitment ends and right before one starts. Past times and finished commitments are left out.
 */
export function fasceDelGiorno(
  giorno: string,
  impegni: Impegno[],
  durataMinuti: number,
  now: Date,
  orario: OrarioStudio = ORARIO_STUDIO,
): Fascia[] {
  const apertura = dataOra(giorno, orario.apertura)
  const chiusura = dataOra(giorno, orario.chiusura)
  const candidati = new Map<number, Date>()
  const add = (d: Date) => candidati.set(d.getTime(), d)
  for (let t = apertura; addMinutes(t, durataMinuti) <= chiusura; t = addMinutes(t, 60)) add(t)
  for (const i of impegni) {
    add(i.fine)
    add(addMinutes(i.inizio, -durataMinuti))
  }

  const liberi = [...candidati.values()].filter(
    (t) =>
      t >= apertura &&
      addMinutes(t, durataMinuti) <= chiusura &&
      t >= now &&
      impegniSovrapposti(impegni, t, durataMinuti).length === 0,
  )
  const voci = [
    ...impegni.filter((i) => i.fine > now).map((impegno) => ({ quando: impegno.inizio, impegno })),
    ...liberi.map((t) => ({ quando: t, impegno: null })),
  ].sort((a, b) => a.quando.getTime() - b.quando.getTime())

  const fasce: Fascia[] = []
  for (const voce of voci) {
    const last = fasce.at(-1)
    if (voce.impegno) fasce.push({ tipo: 'impegno', impegno: voce.impegno })
    else if (last?.tipo === 'liberi') last.orari.push(voce.quando)
    else fasce.push({ tipo: 'liberi', orari: [voce.quando] })
  }
  return fasce
}
