export const DISCIPLINE = ['fisio', 'posturale', 'yoga'] as const
export type Disciplina = (typeof DISCIPLINE)[number]

export type Cliente = {
  id: string
  nome: string
  cognome: string
  discipline: Disciplina[] // zero, one or more, in DISCIPLINE order
  telefono?: string // E.164, e.g. +393331234567
  email?: string
  dataNascita?: string // YYYY-MM-DD
  note?: string
  archiviato: boolean
  createdAt: string
}

/**
 * - 'sedute': N sessions bought in advance (fisio). Optional expiry.
 * - 'abbonamento': valid from dataInizio to scadenza, with the right to one
 *   lesson per week (Monday–Sunday). A week without a lesson is lost.
 */
export type ModalitaPacchetto = 'sedute' | 'abbonamento'

/** An entry of the price list ("listino"), editable by the owner. */
export type TipoPacchetto = {
  id: string
  nome: string
  disciplina: Disciplina
  modalita: ModalitaPacchetto
  lezioni?: number // 'sedute' only
  durataMesi?: number // 'abbonamento': length (required); 'sedute': optional validity
  prezzo?: number // euro
  attivo: boolean // inactive types are hidden when selling, history is kept
  createdAt: string
}

/** A package or subscription bought by a client. Copies its type's data at purchase time. */
export type Pacchetto = {
  id: string
  clienteId: string
  tipoId?: string
  nome: string
  disciplina: Disciplina
  modalita: ModalitaPacchetto
  lezioniTotali?: number // 'sedute' only
  dataInizio: string // YYYY-MM-DD
  scadenza?: string // YYYY-MM-DD, last valid day. Required for 'abbonamento'
  prezzo?: number // euro
  pagato: boolean
  dataPagamento?: string // YYYY-MM-DD
  dataAcquisto: string // YYYY-MM-DD
  /**
   * Subscriptions only: Mondays (YYYY-MM-DD) of skipped weeks the owner kept valid.
   * Their lesson can still be done later, as a second lesson in another week.
   */
  recuperi?: string[]
  note?: string
  createdAt: string
}

/**
 * A weekly group class (yoga, posturale) at a fixed day and time. Clients
 * usually come to their own group (`iscritti`) but may switch any week.
 */
export type Corso = {
  id: string
  nome: string // e.g. "Yoga sera"
  disciplina: Disciplina
  giorno: number // 1 = Monday … 7 = Sunday
  ora: string // HH:mm
  durataMinuti: number
  attivo: boolean
  iscritti: string[] // clienteId of the clients who usually come
  createdAt: string
}

export type StatoAppuntamento = 'programmato' | 'fatto' | 'assente' | 'annullato'

/** An individual session (fisio): one client, one time slot. */
export type Appuntamento = {
  id: string
  clienteId: string
  disciplina: Disciplina
  inizio: string // ISO datetime
  durataMinuti: number
  valutazione: boolean // the first fisio session: posture assessment
  stato: StatoAppuntamento
  lezioneId?: string // the lesson recorded when marked 'fatto' or 'assente'
  note?: string
  createdAt: string
}

export type LezioneStato = 'fatta' | 'assente'

export type Lezione = {
  id: string
  pacchettoId: string
  clienteId: string
  disciplina: Disciplina
  data: string // ISO datetime
  stato: LezioneStato
  corsoId?: string // attended a group class
  appuntamentoId?: string // from an individual appointment
  note?: string
  createdAt: string
}

export type NewCliente = Omit<Cliente, 'id' | 'createdAt' | 'archiviato'> & {
  archiviato?: boolean
}
export type ClientePatch = Partial<Omit<Cliente, 'id' | 'createdAt'>>

export type NewTipoPacchetto = Omit<TipoPacchetto, 'id' | 'createdAt'>
export type TipoPacchettoPatch = Partial<NewTipoPacchetto>

export type NewPacchetto = Omit<Pacchetto, 'id' | 'createdAt'>
export type PacchettoPatch = Partial<Omit<Pacchetto, 'id' | 'createdAt' | 'clienteId'>>

export type NewCorso = Omit<Corso, 'id' | 'createdAt'>
export type CorsoPatch = Partial<NewCorso>

export type NewAppuntamento = Omit<Appuntamento, 'id' | 'createdAt' | 'stato'> & {
  stato?: StatoAppuntamento // defaults to 'programmato'
}
export type AppuntamentoPatch = Partial<Omit<Appuntamento, 'id' | 'createdAt' | 'clienteId'>>

export type NewLezione = Omit<Lezione, 'id' | 'createdAt' | 'stato'> & {
  stato?: LezioneStato // defaults to 'fatta'
}
