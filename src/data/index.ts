import { MockRepository, type StorageLike } from './mock/mockRepository'
import type { Repository } from './repository'

export type { Repository } from './repository'
export type * from './types'

export type DataMode = 'mock' | 'supabase'

export type DataSource =
  | { mode: 'mock'; repository: Repository; resetDemoData: () => Promise<void> }
  | { mode: 'supabase'; repository: Repository }

export class DataModeError extends Error {}

/** Reads VITE_DATA_MODE. Never falls back to mock silently. */
export function parseDataMode(value: string | undefined): DataMode {
  if (value === 'mock' || value === 'supabase') return value
  const shown = value ? `"${value}"` : '(vuota)'
  throw new DataModeError(
    `VITE_DATA_MODE deve valere "mock" o "supabase". Valore attuale: ${shown}.`,
  )
}

/** localStorage, or an in-memory stand-in when the browser blocks it. */
function browserStorage(): StorageLike {
  try {
    const storage = window.localStorage
    storage.getItem('fisiomade-probe')
    return storage
  } catch {
    const memory = new Map<string, string>()
    return {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => void memory.set(key, value),
    }
  }
}

export function createDataSource(mode: DataMode): DataSource {
  if (mode === 'supabase') {
    throw new DataModeError('La modalità "supabase" non è ancora disponibile (arriva nel Modulo 5).')
  }
  const repository = new MockRepository({
    storage: browserStorage(),
    now: () => new Date(),
    newId: () => crypto.randomUUID(),
  })
  return { mode: 'mock', repository, resetDemoData: () => repository.reset() }
}
