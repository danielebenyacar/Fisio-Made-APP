import type {
  Appuntamento,
  AppuntamentoPatch,
  Cliente,
  ClientePatch,
  Corso,
  CorsoPatch,
  Lezione,
  NewAppuntamento,
  NewCliente,
  NewCorso,
  NewLezione,
  NewPacchetto,
  NewTipoPacchetto,
  Pacchetto,
  PacchettoPatch,
  TipoPacchetto,
  TipoPacchettoPatch,
} from './types'

export type ByCliente = { clienteId?: string }

/** Appointments of one client and/or starting in [da, a) (ISO datetimes). */
export type AppuntamentiFilter = { clienteId?: string; da?: string; a?: string }

/**
 * The only data access point for the UI. Implementations: mock (localStorage)
 * and supabase. Returned objects are copies: mutating them changes nothing.
 */
export interface Repository {
  /** All clients, archived included, sorted by cognome then nome. */
  listClienti(): Promise<Cliente[]>
  getCliente(id: string): Promise<Cliente | null>
  createCliente(input: NewCliente): Promise<Cliente>
  updateCliente(id: string, patch: ClientePatch): Promise<Cliente>

  /** Price list, sorted by disciplina then nome. Inactive types included. */
  listTipiPacchetto(): Promise<TipoPacchetto[]>
  getTipoPacchetto(id: string): Promise<TipoPacchetto | null>
  createTipoPacchetto(input: NewTipoPacchetto): Promise<TipoPacchetto>
  updateTipoPacchetto(id: string, patch: TipoPacchettoPatch): Promise<TipoPacchetto>

  /** Sorted oldest first (dataInizio, dataAcquisto, createdAt): the FIFO order. */
  listPacchetti(filter?: ByCliente): Promise<Pacchetto[]>
  getPacchetto(id: string): Promise<Pacchetto | null>
  createPacchetto(input: NewPacchetto): Promise<Pacchetto>
  updatePacchetto(id: string, patch: PacchettoPatch): Promise<Pacchetto>
  /** Only packages without lessons can be deleted (e.g. created by mistake). */
  deletePacchetto(id: string): Promise<void>

  /** Sorted oldest first by data. */
  listLezioni(filter?: ByCliente): Promise<Lezione[]>
  createLezione(input: NewLezione): Promise<Lezione>
  deleteLezione(id: string): Promise<void>

  /** Weekly group classes, sorted by day then time. Inactive ones included. */
  listCorsi(): Promise<Corso[]>
  createCorso(input: NewCorso): Promise<Corso>
  updateCorso(id: string, patch: CorsoPatch): Promise<Corso>

  /** Individual appointments, sorted by start time. */
  listAppuntamenti(filter?: AppuntamentiFilter): Promise<Appuntamento[]>
  getAppuntamento(id: string): Promise<Appuntamento | null>
  createAppuntamento(input: NewAppuntamento): Promise<Appuntamento>
  updateAppuntamento(id: string, patch: AppuntamentoPatch): Promise<Appuntamento>
}
