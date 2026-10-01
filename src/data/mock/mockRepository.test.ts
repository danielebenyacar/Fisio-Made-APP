import { beforeEach, describe, expect, it } from 'vitest'
import { MockRepository, STORAGE_KEY, type StorageLike } from './mockRepository'

class MemoryStorage implements StorageLike {
  items = new Map<string, string>()
  getItem(key: string) {
    return this.items.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.items.set(key, value)
  }
}

const NOW = new Date(2026, 9, 1, 10, 0)

describe('MockRepository', () => {
  let storage: MemoryStorage
  let idSeq: number
  const make = () =>
    new MockRepository({ storage, now: () => NOW, newId: () => `new-${++idSeq}` })

  beforeEach(() => {
    storage = new MemoryStorage()
    idSeq = 0
  })

  it('seeds empty storage and persists it under fisiomade-demo', async () => {
    const repo = make()
    const clienti = await repo.listClienti()
    expect(clienti.length).toBeGreaterThan(10)
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).clienti).toHaveLength(clienti.length)
  })

  it('sorts clients by surname then name', async () => {
    const cognomi = (await make().listClienti()).map((c) => c.cognome)
    expect(cognomi).toEqual([...cognomi].sort((a, b) => a.localeCompare(b, 'it')))
  })

  it('keeps changes across instances (page reloads)', async () => {
    const created = await make().createCliente({
      nome: 'Nuova',
      cognome: 'Cliente',
      discipline: ['fisio', 'yoga'],
      consensoPrivacy: true,
    })
    expect(created).toMatchObject({ id: 'new-1', archiviato: false, createdAt: NOW.toISOString() })
    expect(await make().getCliente('new-1')).toEqual(created)
  })

  it('reseeds when stored data is corrupt or from another version', async () => {
    storage.setItem(STORAGE_KEY, '{not json')
    expect((await make().listClienti()).length).toBeGreaterThan(10)
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 999, clienti: [] }))
    expect((await make().listClienti()).length).toBeGreaterThan(10)
    // Version 1 (Module 0) had no disciplines: it must be replaced too.
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, clienti: [], pacchetti: [], lezioni: [] }))
    expect((await make().listClienti()).every((c) => Array.isArray(c.discipline))).toBe(true)
    expect((await make().listClienti()).length).toBeGreaterThan(10)
  })

  it('updates a client and rejects unknown ids', async () => {
    const repo = make()
    const [first] = await repo.listClienti()
    const updated = await repo.updateCliente(first.id, { archiviato: true })
    expect(updated.archiviato).toBe(true)
    expect((await repo.getCliente(first.id))?.archiviato).toBe(true)
    await expect(repo.updateCliente('missing', { nome: 'X' })).rejects.toThrow('Cliente non trovato')
  })

  it('returns copies, not live objects', async () => {
    const repo = make()
    const [first] = await repo.listClienti()
    first.nome = 'Modificato'
    expect((await repo.getCliente(first.id))?.nome).not.toBe('Modificato')
  })

  it('creates and updates packages, oldest first per client', async () => {
    const repo = make()
    const cliente = await repo.createCliente({ nome: 'A', cognome: 'B', discipline: [], consensoPrivacy: true })
    await expect(
      repo.createPacchetto({ clienteId: 'missing', lezioniTotali: 5, pagato: true, dataAcquisto: '2026-10-01' }),
    ).rejects.toThrow('Cliente non trovato')

    await repo.createPacchetto({ clienteId: cliente.id, lezioniTotali: 10, pagato: false, dataAcquisto: '2026-10-01' })
    const older = await repo.createPacchetto({ clienteId: cliente.id, lezioniTotali: 5, pagato: true, dataAcquisto: '2026-09-01' })

    const pacchetti = await repo.listPacchetti({ clienteId: cliente.id })
    expect(pacchetti.map((p) => p.lezioniTotali)).toEqual([5, 10])

    const paid = await repo.updatePacchetto(pacchetti[1].id, { pagato: true, dataPagamento: '2026-10-01' })
    expect(paid).toMatchObject({ pagato: true, clienteId: cliente.id })
    expect(older.id).not.toBe(paid.id)
  })

  it('creates lessons as "fatta" by default and deletes them', async () => {
    const repo = make()
    const cliente = await repo.createCliente({ nome: 'A', cognome: 'B', discipline: [], consensoPrivacy: true })
    const pacchetto = await repo.createPacchetto({ clienteId: cliente.id, lezioniTotali: 5, pagato: true, dataAcquisto: '2026-10-01' })

    const lezione = await repo.createLezione({ clienteId: cliente.id, pacchettoId: pacchetto.id, data: NOW.toISOString() })
    expect(lezione.stato).toBe('fatta')
    expect(await repo.listLezioni({ clienteId: cliente.id })).toHaveLength(1)

    await repo.deleteLezione(lezione.id)
    expect(await repo.listLezioni({ clienteId: cliente.id })).toHaveLength(0)
    await expect(repo.deleteLezione(lezione.id)).rejects.toThrow('Lezione non trovata')
  })

  it('rejects a lesson on another client’s package', async () => {
    const repo = make()
    const [pacchetto] = await repo.listPacchetti()
    const other = await repo.createCliente({ nome: 'A', cognome: 'B', discipline: [], consensoPrivacy: true })
    await expect(
      repo.createLezione({ clienteId: other.id, pacchettoId: pacchetto.id, data: NOW.toISOString() }),
    ).rejects.toThrow('altro cliente')
  })

  it('reset() discards changes and restores the demo data', async () => {
    const repo = make()
    const before = await repo.listClienti()
    await repo.createCliente({ nome: 'Temporanea', cognome: 'Zeta', discipline: ['yoga'], consensoPrivacy: false })
    await repo.updateCliente(before[0].id, { nome: 'Cambiato' })

    await repo.reset()
    expect(await repo.listClienti()).toEqual(before)
    expect(await make().listClienti()).toEqual(before)
  })
})
