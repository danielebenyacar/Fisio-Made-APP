import type { Cliente, NewCliente } from '../data/types'
import { isPlausiblePastDate, isValidEmail, nameKey } from './clienti'
import { isoDateFromParts, parseDateText, toIsoDate } from './dates'
import { parseDiscipline } from './discipline'
import { collapseSpaces, normalizeText, tidyName } from './text'
import { normalizePhone } from './whatsapp'

/** A spreadsheet cell as read from an .xlsx file. */
export type Cell = string | number | boolean | Date | null

type Field =
  | 'nome'
  | 'cognome'
  | 'telefono'
  | 'email'
  | 'dataNascita'
  | 'discipline'
  | 'note'
  | 'consenso'

/** Column titles recognized for each field, compared without case, accents, spaces or symbols. */
const HEADERS: Record<Field, string[]> = {
  nome: ['nome', 'name', 'firstname'],
  cognome: ['cognome', 'surname', 'lastname'],
  telefono: ['telefono', 'tel', 'cellulare', 'cell', 'numero', 'numeroditelefono', 'phone', 'mobile', 'whatsapp'],
  email: ['email', 'mail', 'posta', 'postaelettronica'],
  dataNascita: ['datadinascita', 'datanascita', 'nascita', 'natoil', 'natail', 'compleanno', 'birthday'],
  discipline: ['discipline', 'disciplina', 'attivita', 'corso', 'corsi', 'servizio', 'servizi', 'percorso'],
  note: ['note', 'nota', 'annotazioni', 'commenti', 'osservazioni'],
  consenso: ['consensoprivacy', 'consenso', 'privacy', 'gdpr', 'liberatoria'],
}

export const FIELD_LABEL: Record<Field, string> = {
  nome: 'Nome',
  cognome: 'Cognome',
  telefono: 'Telefono',
  email: 'Email',
  dataNascita: 'Data di nascita',
  discipline: 'Discipline',
  note: 'Note',
  consenso: 'Consenso privacy',
}

const YES = new Set(['si', 's', 'x', 'yes', 'y', 'ok', '1', 'true', 'vero', 'firmato', 'firmata'])

export type ImportRow = { riga: number; cliente: NewCliente; avvisi: string[] }

export type ImportAnalysis =
  | { ok: false; errore: string }
  | {
      ok: true
      daImportare: ImportRow[]
      giaPresenti: { riga: number; nome: string }[]
      scartate: { riga: number; motivo: string }[]
      colonneIgnorate: string[]
    }

const headerKey = (cell: Cell) => normalizeText(cellText(cell)).replace(/[^a-z0-9]/g, '')

function cellText(cell: Cell): string {
  if (cell === null) return ''
  if (cell instanceof Date) return toIsoDate(cell)
  return collapseSpaces(String(cell))
}

/** Excel dates are midnight UTC, so read their UTC calendar day. */
function utcIsoDate(date: Date): string | null {
  return isoDateFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

/** Date cell, Excel serial number or text like "12/04/1990". */
function parseDateCell(cell: Cell): string | null {
  if (cell instanceof Date) return utcIsoDate(cell)
  if (typeof cell === 'number' && cell > 0 && cell < 2958466) {
    return utcIsoDate(new Date(Date.UTC(1899, 11, 30) + Math.round(cell) * 86_400_000))
  }
  return typeof cell === 'string' ? parseDateText(cell) : null
}

function parseConsenso(cell: Cell): { consensoPrivacy: boolean; consensoData?: string } {
  if (typeof cell === 'boolean') return { consensoPrivacy: cell }
  if (typeof cell === 'number' && cell === 1) return { consensoPrivacy: true }
  const date = parseDateCell(cell)
  if (date) return { consensoPrivacy: true, consensoData: date }
  return { consensoPrivacy: YES.has(normalizeText(cellText(cell))) }
}

function mapColumns(header: Cell[]): Map<Field, number> {
  const keys = header.map(headerKey)
  const columns = new Map<Field, number>()
  for (const field of Object.keys(HEADERS) as Field[]) {
    const index = keys.findIndex((key, i) => key && HEADERS[field].includes(key) && ![...columns.values()].includes(i))
    if (index !== -1) columns.set(field, index)
  }
  return columns
}

/**
 * Turns spreadsheet rows (first non-empty row = column titles) into clients to
 * create. Skips people already present (same nome and cognome) and rows without
 * nome or cognome. Invalid optional values are dropped with a warning.
 */
export function analyzeImport(rows: Cell[][], existing: Cliente[], today: Date): ImportAnalysis {
  const isEmpty = (row: Cell[]) => row.every((cell) => cellText(cell) === '')
  const headerIndex = rows.findIndex((row) => !isEmpty(row))
  if (headerIndex === -1) return { ok: false, errore: 'Il file è vuoto.' }

  const header = rows[headerIndex]
  const columns = mapColumns(header)
  const missing = (['nome', 'cognome'] as const).filter((f) => !columns.has(f))
  if (missing.length > 0) {
    const found = header.map(cellText).filter(Boolean).join(', ') || 'nessuna'
    return {
      ok: false,
      errore: `Nella prima riga mancano le colonne: ${missing.map((f) => FIELD_LABEL[f]).join(', ')}. Colonne trovate: ${found}.`,
    }
  }

  const known = new Set(existing.map(nameKey))
  const result: Extract<ImportAnalysis, { ok: true }> = {
    ok: true,
    daImportare: [],
    giaPresenti: [],
    scartate: [],
    colonneIgnorate: header
      .filter((cell, i) => cellText(cell) && ![...columns.values()].includes(i))
      .map(cellText),
  }

  rows.slice(headerIndex + 1).forEach((row, i) => {
    if (isEmpty(row)) return
    const riga = headerIndex + i + 2 // 1-based, as shown in Excel
    const get = (field: Field): Cell => {
      const index = columns.get(field)
      return index === undefined ? null : (row[index] ?? null)
    }
    const text = (field: Field) => cellText(get(field))

    const nome = tidyName(text('nome'))
    const cognome = tidyName(text('cognome'))
    if (!nome || !cognome) {
      result.scartate.push({ riga, motivo: nome ? 'manca il cognome' : 'manca il nome' })
      return
    }

    const key = nameKey({ nome, cognome })
    if (known.has(key)) {
      result.giaPresenti.push({ riga, nome: `${nome} ${cognome}` })
      return
    }
    known.add(key)

    const avvisi: string[] = []
    const cliente: NewCliente = {
      nome,
      cognome,
      discipline: parseDiscipline(text('discipline')),
      ...parseConsenso(get('consenso')),
    }

    if (text('telefono')) {
      const telefono = normalizePhone(text('telefono'))
      if (telefono) cliente.telefono = telefono
      else avvisi.push(`telefono "${text('telefono')}" non valido, non importato`)
    }

    const email = text('email')
    if (email) {
      if (isValidEmail(email)) cliente.email = email
      else avvisi.push(`email "${email}" non valida, non importata`)
    }

    if (text('dataNascita')) {
      const dataNascita = parseDateCell(get('dataNascita'))
      if (dataNascita && isPlausiblePastDate(dataNascita, today)) cliente.dataNascita = dataNascita
      else avvisi.push(`data di nascita "${text('dataNascita')}" non valida, non importata`)
    }

    const rawNote = get('note')
    const note = typeof rawNote === 'string' ? rawNote.trim() : text('note') // keep line breaks
    if (note) cliente.note = note

    result.daImportare.push({ riga, cliente, avvisi })
  })

  return result
}
