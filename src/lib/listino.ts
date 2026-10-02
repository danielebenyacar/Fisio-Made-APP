import type { Disciplina, ModalitaPacchetto, NewTipoPacchetto, TipoPacchetto } from '../data/types'
import { euroToInput, parseEuro } from './money'
import { collapseSpaces } from './text'

export const MODALITA_LABEL: Record<ModalitaPacchetto, string> = {
  sedute: 'Sedute',
  abbonamento: 'Abbonamento',
}

const mesi = (n: number) => (n === 1 ? '1 mese' : `${n} mesi`)

/** "10 sedute", "5 sedute, valide 6 mesi", "1 mese, 1 lezione a settimana". Prices are shown only in Altro → Prezzi. */
export function descriviTipo(tipo: Pick<TipoPacchetto, 'modalita' | 'lezioni' | 'durataMesi'>): string {
  if (tipo.modalita === 'abbonamento') return `${mesi(tipo.durataMesi ?? 0)}, 1 lezione a settimana`
  const n = tipo.lezioni ?? 0
  const sedute = n === 1 ? '1 seduta' : `${n} sedute`
  return tipo.durataMesi ? `${sedute}, valide ${mesi(tipo.durataMesi)}` : sedute
}

export type TipoForm = {
  nome: string
  disciplina: Disciplina | ''
  modalita: ModalitaPacchetto
  lezioni: string
  durataMesi: string
  prezzo: string
  attivo: boolean
}

export type TipoFormErrors = Partial<Record<'nome' | 'disciplina' | 'lezioni' | 'durataMesi' | 'prezzo', string>>

export const EMPTY_TIPO_FORM: TipoForm = {
  nome: '',
  disciplina: '',
  modalita: 'sedute',
  lezioni: '',
  durataMesi: '',
  prezzo: '',
  attivo: true,
}

export function tipoToForm(tipo: TipoPacchetto): TipoForm {
  return {
    nome: tipo.nome,
    disciplina: tipo.disciplina,
    modalita: tipo.modalita,
    lezioni: tipo.lezioni === undefined ? '' : String(tipo.lezioni),
    durataMesi: tipo.durataMesi === undefined ? '' : String(tipo.durataMesi),
    prezzo: euroToInput(tipo.prezzo),
    attivo: tipo.attivo,
  }
}

/** Whole number between min and max, or null. */
export function parseIntIn(text: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(text.trim())) return null
  const n = Number(text)
  return n >= min && n <= max ? n : null
}

export function validateTipoForm(
  form: TipoForm,
): { ok: true; value: NewTipoPacchetto } | { ok: false; errors: TipoFormErrors } {
  const errors: TipoFormErrors = {}
  const nome = collapseSpaces(form.nome)
  if (!nome) errors.nome = 'Inserisci il nome'
  if (!form.disciplina) errors.disciplina = 'Scegli la disciplina'

  let lezioni: number | undefined
  let durataMesi: number | undefined
  if (form.modalita === 'sedute') {
    lezioni = parseIntIn(form.lezioni, 1, 200) ?? undefined
    if (lezioni === undefined) errors.lezioni = 'Scrivi un numero di sedute (da 1 a 200)'
    if (form.durataMesi.trim()) {
      durataMesi = parseIntIn(form.durataMesi, 1, 36) ?? undefined
      if (durataMesi === undefined) errors.durataMesi = 'Scrivi un numero di mesi (da 1 a 36) o lascia vuoto'
    }
  } else {
    durataMesi = parseIntIn(form.durataMesi, 1, 36) ?? undefined
    if (durataMesi === undefined) errors.durataMesi = 'Scrivi la durata in mesi (da 1 a 36)'
  }

  let prezzo: number | undefined
  if (form.prezzo.trim()) {
    prezzo = parseEuro(form.prezzo) ?? undefined
    if (prezzo === undefined) errors.prezzo = 'Prezzo non valido'
  }

  if (Object.keys(errors).length > 0 || !form.disciplina) return { ok: false, errors }
  return {
    ok: true,
    value: { nome, disciplina: form.disciplina, modalita: form.modalita, lezioni, durataMesi, prezzo, attivo: form.attivo },
  }
}
