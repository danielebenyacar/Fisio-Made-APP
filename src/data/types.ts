export type Cliente = {
  id: string
  nome: string
  cognome: string
  telefono?: string // E.164, e.g. +393331234567
  email?: string
  dataNascita?: string // YYYY-MM-DD
  note?: string
  consensoPrivacy: boolean
  consensoData?: string // YYYY-MM-DD
  archiviato: boolean
  createdAt: string
}

export type Pacchetto = {
  id: string
  clienteId: string
  lezioniTotali: number
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
  data: string // ISO datetime
  stato: LezioneStato
  note?: string
  createdAt: string
}

export type NewCliente = Omit<Cliente, 'id' | 'createdAt' | 'archiviato'> & {
  archiviato?: boolean
}
export type ClientePatch = Partial<Omit<Cliente, 'id' | 'createdAt'>>

export type NewPacchetto = Omit<Pacchetto, 'id' | 'createdAt'>
export type PacchettoPatch = Partial<Omit<Pacchetto, 'id' | 'createdAt' | 'clienteId'>>

export type NewLezione = Omit<Lezione, 'id' | 'createdAt' | 'stato'> & {
  stato?: LezioneStato // defaults to 'fatta'
}
