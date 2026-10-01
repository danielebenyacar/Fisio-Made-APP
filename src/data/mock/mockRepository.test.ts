import { beforeEach, describe, expect, it } from 'vitest'
import type { NewPacchetto } from '../types'
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
    // Older versions (Modules 0–1) had another shape: they must be replaced too.
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, clienti: [], tipiPacchetto: [], pacchetti: [], lezioni: [] }))
    expect((await make().listTipiPacchetto()).length).toBeGreaterThan(0)
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

  const sedute = (clienteId: string, overrides: Partial<NewPacchetto> = {}): NewPacchetto => ({
    clienteId,
    nome: '5 sedute fisio',
    disciplina: 'fisio',
    modalita: 'sedute',
    lezioniTotali: 5,
    dataInizio: '2026-10-01',
    dataAcquisto: '2026-10-01',
    pagato: true,
    ...overrides,
  })
  const newCliente = (repo: MockRepository) =>
    repo.createCliente({ nome: 'A', cognome: 'B', discipline: [], consensoPrivacy: true })

  it('creates and updates packages, oldest first (FIFO order)', async () => {
    const repo = make()
    const cliente = await newCliente(repo)
    await expect(repo.createPacchetto(sedute('missing'))).rejects.toThrow('Cliente non trovato')

    await repo.createPacchetto(sedute(cliente.id, { lezioniTotali: 10, pagato: false }))
    const older = await repo.createPacchetto(sedute(cliente.id, { dataInizio: '2026-09-01', dataAcquisto: '2026-09-01' }))

    const pacchetti = await repo.listPacchetti({ clienteId: cliente.id })
    expect(pacchetti.map((p) => p.lezioniTotali)).toEqual([5, 10])
    expect(await repo.getPacchetto(older.id)).toEqual(older)

    const paid = await repo.updatePacchetto(pacchetti[1].id, { pagato: true, dataPagamento: '2026-10-01' })
    expect(paid).toMatchObject({ pagato: true, clienteId: cliente.id })
  })

  it('deletes a package only while it has no lessons', async () => {
    const repo = make()
    const cliente = await newCliente(repo)
    const empty = await repo.createPacchetto(sedute(cliente.id))
    await repo.deletePacchetto(empty.id)
    expect(await repo.getPacchetto(empty.id)).toBeNull()

    const used = await repo.createPacchetto(sedute(cliente.id))
    await repo.createLezione({ clienteId: cliente.id, pacchettoId: used.id, disciplina: 'fisio', data: NOW.toISOString() })
    await expect(repo.deletePacchetto(used.id)).rejects.toThrow('lezioni registrate')
    await expect(repo.deletePacchetto('missing')).rejects.toThrow('Pacchetto non trovato')
  })

  it('creates lessons as "fatta" by default and deletes them', async () => {
    const repo = make()
    const cliente = await newCliente(repo)
    const pacchetto = await repo.createPacchetto(sedute(cliente.id))

    const lezione = await repo.createLezione({ clienteId: cliente.id, pacchettoId: pacchetto.id, disciplina: 'fisio', data: NOW.toISOString() })
    expect(lezione.stato).toBe('fatta')
    expect(await repo.listLezioni({ clienteId: cliente.id })).toHaveLength(1)

    await repo.deleteLezione(lezione.id)
    expect(await repo.listLezioni({ clienteId: cliente.id })).toHaveLength(0)
    await expect(repo.deleteLezione(lezione.id)).rejects.toThrow('Lezione non trovata')
  })

  it('rejects a lesson on another client’s package or of another discipline', async () => {
    const repo = make()
    const [pacchetto] = await repo.listPacchetti()
    const other = await newCliente(repo)
    await expect(
      repo.createLezione({ clienteId: other.id, pacchettoId: pacchetto.id, disciplina: pacchetto.disciplina, data: NOW.toISOString() }),
    ).rejects.toThrow('altro cliente')
    const mine = await repo.createPacchetto(sedute(other.id))
    await expect(
      repo.createLezione({ clienteId: other.id, pacchettoId: mine.id, disciplina: 'yoga', data: NOW.toISOString() }),
    ).rejects.toThrow('disciplina diversa')
  })

  it('manages the price list sorted by discipline then name', async () => {
    const repo = make()
    const tipi = await repo.listTipiPacchetto()
    const order = tipi.map((t) => t.disciplina)
    expect(order).toEqual([...order].sort((a, b) => ['fisio', 'posturale', 'yoga'].indexOf(a) - ['fisio', 'posturale', 'yoga'].indexOf(b)))

    const created = await repo.createTipoPacchetto({
      nome: 'Yoga bimestrale',
      disciplina: 'yoga',
      modalita: 'abbonamento',
      durataMesi: 2,
      prezzo: 110,
      attivo: true,
    })
    expect(created).toMatchObject({ id: 'new-1', createdAt: NOW.toISOString() })
    const updated = await repo.updateTipoPacchetto(created.id, { attivo: false, prezzo: 115 })
    expect(await repo.getTipoPacchetto(created.id)).toEqual(updated)
    expect(updated).toMatchObject({ attivo: false, prezzo: 115, nome: 'Yoga bimestrale' })
    await expect(repo.updateTipoPacchetto('missing', {})).rejects.toThrow('non trovato')
  })

  it('manages weekly classes sorted by day and time', async () => {
    const repo = make()
    const corsi = await repo.listCorsi()
    const keys = corsi.map((c) => `${c.giorno} ${c.ora}`)
    expect(keys).toEqual([...keys].sort())
    const created = await repo.createCorso({ nome: 'Yoga domenica', disciplina: 'yoga', giorno: 7, ora: '10:00', durataMinuti: 75, attivo: true })
    expect((await repo.listCorsi()).at(-1)).toEqual(created)
    expect(await repo.updateCorso(created.id, { attivo: false })).toMatchObject({ attivo: false, durataMinuti: 75 })
    await expect(repo.updateCorso('missing', {})).rejects.toThrow('Corso non trovato')
  })

  it('manages appointments, filtered by client and time range', async () => {
    const repo = make()
    const cliente = await newCliente(repo)
    await expect(
      repo.createAppuntamento({ clienteId: 'missing', disciplina: 'fisio', inizio: NOW.toISOString(), durataMinuti: 60, valutazione: false }),
    ).rejects.toThrow('Cliente non trovato')
    const later = await repo.createAppuntamento({ clienteId: cliente.id, disciplina: 'fisio', inizio: '2026-10-05T08:00:00.000Z', durataMinuti: 60, valutazione: false })
    const first = await repo.createAppuntamento({ clienteId: cliente.id, disciplina: 'fisio', inizio: '2026-10-02T08:00:00.000Z', durataMinuti: 60, valutazione: true })
    expect(first.stato).toBe('programmato')
    expect((await repo.listAppuntamenti({ clienteId: cliente.id })).map((a) => a.id)).toEqual([first.id, later.id])
    expect(
      (await repo.listAppuntamenti({ clienteId: cliente.id, da: '2026-10-03T00:00:00.000Z', a: '2026-10-10T00:00:00.000Z' })).map((a) => a.id),
    ).toEqual([later.id])
    const done = await repo.updateAppuntamento(first.id, { stato: 'fatto', lezioneId: 'l1' })
    expect(await repo.getAppuntamento(first.id)).toEqual(done)
    await expect(repo.updateAppuntamento('missing', {})).rejects.toThrow('non trovato')
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
