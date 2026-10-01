import type {
  Cliente,
  ClientePatch,
  Lezione,
  NewCliente,
  NewLezione,
  NewPacchetto,
  Pacchetto,
  PacchettoPatch,
} from './types'

export type ByCliente = { clienteId?: string }

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

  /** Sorted oldest first (dataAcquisto, then createdAt). */
  listPacchetti(filter?: ByCliente): Promise<Pacchetto[]>
  createPacchetto(input: NewPacchetto): Promise<Pacchetto>
  updatePacchetto(id: string, patch: PacchettoPatch): Promise<Pacchetto>

  /** Sorted oldest first by data. */
  listLezioni(filter?: ByCliente): Promise<Lezione[]>
  createLezione(input: NewLezione): Promise<Lezione>
  deleteLezione(id: string): Promise<void>
}
