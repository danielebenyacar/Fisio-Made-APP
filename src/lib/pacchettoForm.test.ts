import { describe, expect, it } from 'vitest'
import type { TipoPacchetto } from '../data/types'
import { conDataInizio, formDaTipo, pacchettoToForm, validatePacchettoForm } from './pacchettoForm'

const TODAY = new Date(2026, 9, 1, 10, 0)

const yogaMensile: TipoPacchetto = {
  id: 't-yoga',
  nome: 'Yoga mensile',
  disciplina: 'yoga',
  modalita: 'abbonamento',
  durataMesi: 1,
  prezzo: 60,
  attivo: true,
  createdAt: '',
}

const fisio10: TipoPacchetto = {
  id: 't-fisio',
  nome: '10 sedute fisio',
  disciplina: 'fisio',
  modalita: 'sedute',
  lezioni: 10,
  prezzo: 500,
  attivo: true,
  createdAt: '',
}

describe('formDaTipo', () => {
  it('prefills a subscription starting today with its expiry', () => {
    expect(formDaTipo(yogaMensile, TODAY)).toMatchObject({
      tipoId: 't-yoga',
      nome: 'Yoga mensile',
      disciplina: 'yoga',
      modalita: 'abbonamento',
      dataAcquisto: '2026-10-01',
      dataInizio: '2026-10-01',
      scadenza: '2026-10-31',
      prezzo: '60',
      pagato: false,
    })
  })

  it('prefills a sessions package without expiry', () => {
    expect(formDaTipo(fisio10, TODAY)).toMatchObject({ lezioni: '10', scadenza: '', modalita: 'sedute' })
  })

  it('starts blank for a custom package', () => {
    expect(formDaTipo(null, TODAY)).toMatchObject({ tipoId: '', nome: '', disciplina: '', prezzo: '' })
  })
})

describe('conDataInizio', () => {
  it('moves the expiry along with the start date', () => {
    const form = conDataInizio(formDaTipo(yogaMensile, TODAY), '2026-10-15')
    expect(form).toMatchObject({ dataInizio: '2026-10-15', scadenza: '2026-11-14' })
  })

  it('keeps a hand-written expiry when the duration is unknown', () => {
    const form = { ...formDaTipo(null, TODAY), scadenza: '2027-01-01' }
    expect(conDataInizio(form, '2026-10-15').scadenza).toBe('2027-01-01')
  })
})

describe('validatePacchettoForm', () => {
  it('builds a subscription', () => {
    const result = validatePacchettoForm({ ...formDaTipo(yogaMensile, TODAY), pagato: true }, TODAY)
    expect(result).toEqual({
      ok: true,
      value: {
        tipoId: 't-yoga',
        nome: 'Yoga mensile',
        disciplina: 'yoga',
        modalita: 'abbonamento',
        lezioniTotali: undefined,
        dataInizio: '2026-10-01',
        scadenza: '2026-10-31',
        prezzo: 60,
        pagato: true,
        dataPagamento: '2026-10-01',
        dataAcquisto: '2026-10-01',
        note: undefined,
      },
    })
  })

  it('builds a sessions package, unpaid', () => {
    const result = validatePacchettoForm(formDaTipo(fisio10, TODAY), TODAY)
    expect(result.ok && result.value).toMatchObject({
      lezioniTotali: 10,
      scadenza: undefined,
      pagato: false,
      dataPagamento: undefined,
    })
  })

  it('requires a valid expiry after the start for subscriptions', () => {
    const missing = validatePacchettoForm({ ...formDaTipo(yogaMensile, TODAY), scadenza: '' }, TODAY)
    expect(!missing.ok && missing.errors.scadenza).toBe('Inserisci la scadenza')
    const before = validatePacchettoForm({ ...formDaTipo(yogaMensile, TODAY), scadenza: '2026-09-30' }, TODAY)
    expect(!before.ok && before.errors.scadenza).toBe('La scadenza è prima dell’inizio')
  })

  it('reports missing fields of a custom package', () => {
    const result = validatePacchettoForm({ ...formDaTipo(null, TODAY), prezzo: 'boh' }, TODAY)
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(['disciplina', 'lezioni', 'prezzo'])
  })

  it('names a custom package automatically', () => {
    const sedute = validatePacchettoForm({ ...formDaTipo(null, TODAY), disciplina: 'fisio', lezioni: '8' }, TODAY)
    expect(sedute.ok && sedute.value.nome).toBe('8 sedute fisio')
    const una = validatePacchettoForm({ ...formDaTipo(null, TODAY), disciplina: 'fisio', lezioni: '1' }, TODAY)
    expect(una.ok && una.value.nome).toBe('1 seduta fisio')
    const abbonamento = validatePacchettoForm(
      { ...formDaTipo(null, TODAY), disciplina: 'yoga', modalita: 'abbonamento', scadenza: '2026-12-31' },
      TODAY,
    )
    expect(abbonamento.ok && abbonamento.value).toMatchObject({ nome: 'Abbonamento yoga', prezzo: undefined })
  })

  it('round-trips an existing package', () => {
    const created = validatePacchettoForm({ ...formDaTipo(fisio10, TODAY), pagato: true, note: ' Sconto amici ' }, TODAY)
    if (!created.ok) throw new Error('invalid')
    const pacchetto = { ...created.value, id: 'p1', clienteId: 'c1', createdAt: '' }
    const again = validatePacchettoForm(pacchettoToForm(pacchetto), TODAY)
    expect(again.ok && again.value).toEqual({ ...created.value, note: 'Sconto amici' })
  })
})
