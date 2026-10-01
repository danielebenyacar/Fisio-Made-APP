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
  consensoPrivacy: boolean
  consensoData?: string // YYYY-MM-DD
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

export type NewLezione = Omit<Lezione, 'id' | 'createdAt' | 'stato'> & {
  stato?: LezioneStato // defaults to 'fatta'
}
