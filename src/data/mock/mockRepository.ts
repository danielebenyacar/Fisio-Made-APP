import type { ByCliente, Repository } from '../repository'
import type {
  Cliente,
  ClientePatch,
  Lezione,
  NewCliente,
  NewLezione,
  NewPacchetto,
  NewTipoPacchetto,
  Pacchetto,
  PacchettoPatch,
  TipoPacchetto,
  TipoPacchettoPatch,
} from '../types'
import { DISCIPLINE } from '../types'
import { ordinaPacchetti } from '../../lib/packages'
import { createSeed, type DemoData } from './seed'

export const STORAGE_KEY = 'fisiomade-demo'
const STORAGE_VERSION = 3 // bump when the data shape changes: old demo data is reseeded

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export type MockRepositoryOptions = {
  storage: StorageLike
  now: () => Date
  newId: () => string
}

type StoredData = DemoData & { version: number }

const copy = <T>(value: T): T => structuredClone(value)

function byCliente<T extends { clienteId: string }>(items: T[], filter?: ByCliente): T[] {
  return filter?.clienteId
    ? items.filter((item) => item.clienteId === filter.clienteId)
    : [...items]
}

/** In-memory repository persisted to localStorage. Seeds itself on first use. */
export class MockRepository implements Repository {
  private data: DemoData
  private readonly options: MockRepositoryOptions

  constructor(options: MockRepositoryOptions) {
    this.options = options
    this.data = this.load() ?? createSeed(options.now())
    this.save()
  }

  /** Throws away every change and goes back to fresh demo data. */
  async reset(): Promise<void> {
    this.data = createSeed(this.options.now())
    this.save()
  }

  async listClienti(): Promise<Cliente[]> {
    const sorted = [...this.data.clienti].sort(
      (a, b) =>
        a.cognome.localeCompare(b.cognome, 'it') || a.nome.localeCompare(b.nome, 'it'),
    )
    return copy(sorted)
  }

  async getCliente(id: string): Promise<Cliente | null> {
    const cliente = this.data.clienti.find((c) => c.id === id)
    return cliente ? copy(cliente) : null
  }

  async createCliente(input: NewCliente): Promise<Cliente> {
    const cliente: Cliente = {
      ...input,
      archiviato: input.archiviato ?? false,
      id: this.options.newId(),
      createdAt: this.options.now().toISOString(),
    }
    this.data.clienti.push(cliente)
    this.save()
    return copy(cliente)
  }

  async updateCliente(id: string, patch: ClientePatch): Promise<Cliente> {
    const cliente = this.findCliente(id)
    Object.assign(cliente, patch)
    this.save()
    return copy(cliente)
  }

  async listTipiPacchetto(): Promise<TipoPacchetto[]> {
    const order = (t: TipoPacchetto) => DISCIPLINE.indexOf(t.disciplina)
    const sorted = [...this.data.tipiPacchetto].sort(
      (a, b) => order(a) - order(b) || a.nome.localeCompare(b.nome, 'it'),
    )
    return copy(sorted)
  }

  async getTipoPacchetto(id: string): Promise<TipoPacchetto | null> {
    const tipo = this.data.tipiPacchetto.find((t) => t.id === id)
    return tipo ? copy(tipo) : null
  }

  async createTipoPacchetto(input: NewTipoPacchetto): Promise<TipoPacchetto> {
    const tipo: TipoPacchetto = {
      ...input,
      id: this.options.newId(),
      createdAt: this.options.now().toISOString(),
    }
    this.data.tipiPacchetto.push(tipo)
    this.save()
    return copy(tipo)
  }

  async updateTipoPacchetto(id: string, patch: TipoPacchettoPatch): Promise<TipoPacchetto> {
    const tipo = this.data.tipiPacchetto.find((t) => t.id === id)
    if (!tipo) throw new Error('Tipo di pacchetto non trovato')
    Object.assign(tipo, patch)
    this.save()
    return copy(tipo)
  }

  async listPacchetti(filter?: ByCliente): Promise<Pacchetto[]> {
    return copy(ordinaPacchetti(byCliente(this.data.pacchetti, filter)))
  }

  async getPacchetto(id: string): Promise<Pacchetto | null> {
    const pacchetto = this.data.pacchetti.find((p) => p.id === id)
    return pacchetto ? copy(pacchetto) : null
  }

  async createPacchetto(input: NewPacchetto): Promise<Pacchetto> {
    this.findCliente(input.clienteId)
    const pacchetto: Pacchetto = {
      ...input,
      id: this.options.newId(),
      createdAt: this.options.now().toISOString(),
    }
    this.data.pacchetti.push(pacchetto)
    this.save()
    return copy(pacchetto)
  }

  async updatePacchetto(id: string, patch: PacchettoPatch): Promise<Pacchetto> {
    const pacchetto = this.findPacchetto(id)
    Object.assign(pacchetto, patch)
    this.save()
    return copy(pacchetto)
  }

  async deletePacchetto(id: string): Promise<void> {
    this.findPacchetto(id)
    if (this.data.lezioni.some((l) => l.pacchettoId === id)) {
      throw new Error('Il pacchetto ha delle lezioni registrate')
    }
    this.data.pacchetti = this.data.pacchetti.filter((p) => p.id !== id)
    this.save()
  }

  async listLezioni(filter?: ByCliente): Promise<Lezione[]> {
    const sorted = byCliente(this.data.lezioni, filter).sort((a, b) =>
      a.data.localeCompare(b.data),
    )
    return copy(sorted)
  }

  async createLezione(input: NewLezione): Promise<Lezione> {
    const pacchetto = this.findPacchetto(input.pacchettoId)
    if (pacchetto.clienteId !== input.clienteId) {
      throw new Error('Il pacchetto appartiene a un altro cliente')
    }
    if (pacchetto.disciplina !== input.disciplina) {
      throw new Error('La lezione è di una disciplina diversa dal pacchetto')
    }
    const lezione: Lezione = {
      ...input,
      stato: input.stato ?? 'fatta',
      id: this.options.newId(),
      createdAt: this.options.now().toISOString(),
    }
    this.data.lezioni.push(lezione)
    this.save()
    return copy(lezione)
  }

  async deleteLezione(id: string): Promise<void> {
    const index = this.data.lezioni.findIndex((l) => l.id === id)
    if (index === -1) throw new Error('Lezione non trovata')
    this.data.lezioni.splice(index, 1)
    this.save()
  }

  private findCliente(id: string): Cliente {
    const cliente = this.data.clienti.find((c) => c.id === id)
    if (!cliente) throw new Error('Cliente non trovato')
    return cliente
  }

  private findPacchetto(id: string): Pacchetto {
    const pacchetto = this.data.pacchetti.find((p) => p.id === id)
    if (!pacchetto) throw new Error('Pacchetto non trovato')
    return pacchetto
  }

  private load(): DemoData | null {
    try {
      const raw = this.options.storage.getItem(STORAGE_KEY)
      if (!raw) return null
      const stored = JSON.parse(raw) as Partial<StoredData>
      if (
        stored.version !== STORAGE_VERSION ||
        !Array.isArray(stored.clienti) ||
        !Array.isArray(stored.tipiPacchetto) ||
        !Array.isArray(stored.pacchetti) ||
        !Array.isArray(stored.lezioni)
      ) {
        return null
      }
      return {
        clienti: stored.clienti,
        tipiPacchetto: stored.tipiPacchetto,
        pacchetti: stored.pacchetti,
        lezioni: stored.lezioni,
      }
    } catch {
      return null
    }
  }

  private save(): void {
    const stored: StoredData = { version: STORAGE_VERSION, ...this.data }
    try {
      this.options.storage.setItem(STORAGE_KEY, JSON.stringify(stored))
    } catch {
      // Storage full or blocked: keep working in memory for this session.
    }
  }
}
