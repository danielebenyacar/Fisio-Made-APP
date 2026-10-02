import type {
  Disciplina,
  ModalitaPacchetto,
  NewPacchetto,
  Pacchetto,
  TipoPacchetto,
} from '../data/types'
import { toIsoDate } from './dates'
import { DISCIPLINA_LABEL } from './discipline'
import { parseIntIn } from './listino'
import { euroToInput, parseEuro } from './money'
import { scadenzaDopoMesi } from './packages'
import { collapseSpaces } from './text'

/** Fields of a package. Name, price and purchase date come from the price list and are not shown. */
export type PacchettoForm = {
  tipoId: string // '' for a custom package
  nome: string // '' for a custom package: named automatically
  disciplina: Disciplina | ''
  modalita: ModalitaPacchetto
  lezioni: string
  /** From the price list: when set, changing dataInizio recomputes scadenza. */
  durataMesi?: number
  dataAcquisto: string
  dataInizio: string
  scadenza: string
  prezzo: string
  pagato: boolean
  dataPagamento: string
  note: string
}

export type PacchettoFormErrors = Partial<
  Record<'disciplina' | 'lezioni' | 'dataAcquisto' | 'dataInizio' | 'scadenza' | 'prezzo' | 'dataPagamento', string>
>

export type PacchettoFormValue = Omit<NewPacchetto, 'clienteId'>

/** A new package from a price list entry (or a blank custom one), starting today. */
export function formDaTipo(tipo: TipoPacchetto | null, today: Date): PacchettoForm {
  const oggi = toIsoDate(today)
  return {
    tipoId: tipo?.id ?? '',
    nome: tipo?.nome ?? '',
    disciplina: tipo?.disciplina ?? '',
    modalita: tipo?.modalita ?? 'sedute',
    lezioni: tipo?.lezioni === undefined ? '' : String(tipo.lezioni),
    durataMesi: tipo?.durataMesi,
    dataAcquisto: oggi,
    dataInizio: oggi,
    scadenza: tipo?.durataMesi ? scadenzaDopoMesi(oggi, tipo.durataMesi) : '',
    prezzo: euroToInput(tipo?.prezzo),
    pagato: false,
    dataPagamento: '',
    note: '',
  }
}

export function pacchettoToForm(pacchetto: Pacchetto): PacchettoForm {
  return {
    tipoId: pacchetto.tipoId ?? '',
    nome: pacchetto.nome,
    disciplina: pacchetto.disciplina,
    modalita: pacchetto.modalita,
    lezioni: pacchetto.lezioniTotali === undefined ? '' : String(pacchetto.lezioniTotali),
    dataAcquisto: pacchetto.dataAcquisto,
    dataInizio: pacchetto.dataInizio,
    scadenza: pacchetto.scadenza ?? '',
    prezzo: euroToInput(pacchetto.prezzo),
    pagato: pacchetto.pagato,
    dataPagamento: pacchetto.dataPagamento ?? '',
    note: pacchetto.note ?? '',
  }
}

/** New start date: moves the expiry along when the duration is known. */
export function conDataInizio(form: PacchettoForm, dataInizio: string): PacchettoForm {
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(dataInizio)
  return {
    ...form,
    dataInizio,
    scadenza: form.durataMesi && valid ? scadenzaDopoMesi(dataInizio, form.durataMesi) : form.scadenza,
  }
}

/** Name of a package not in the price list: "8 sedute fisio", "Abbonamento yoga". */
export function nomeAutomatico(
  disciplina: Disciplina,
  modalita: ModalitaPacchetto,
  lezioni: number | undefined,
): string {
  const label = DISCIPLINA_LABEL[disciplina].toLowerCase()
  if (modalita === 'abbonamento') return `Abbonamento ${label}`
  return `${lezioni} ${lezioni === 1 ? 'seduta' : 'sedute'} ${label}`
}

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '1900-01-01'

export function validatePacchettoForm(
  form: PacchettoForm,
  today: Date,
): { ok: true; value: PacchettoFormValue } | { ok: false; errors: PacchettoFormErrors } {
  const errors: PacchettoFormErrors = {}
  if (!form.disciplina) errors.disciplina = 'Scegli la disciplina'

  let lezioniTotali: number | undefined
  if (form.modalita === 'sedute') {
    lezioniTotali = parseIntIn(form.lezioni, 1, 200) ?? undefined
    if (lezioniTotali === undefined) errors.lezioni = 'Scrivi un numero di sedute (da 1 a 200)'
  }

  if (!isIsoDate(form.dataAcquisto)) errors.dataAcquisto = 'Data non valida'
  if (!isIsoDate(form.dataInizio)) errors.dataInizio = 'Data non valida'

  const scadenza = form.scadenza || undefined
  if (form.modalita === 'abbonamento' && !scadenza) errors.scadenza = 'Inserisci la scadenza'
  else if (scadenza && !isIsoDate(scadenza)) errors.scadenza = 'Data non valida'
  else if (scadenza && scadenza < form.dataInizio) errors.scadenza = 'La scadenza è prima dell’inizio'

  let prezzo: number | undefined
  if (form.prezzo.trim()) {
    prezzo = parseEuro(form.prezzo) ?? undefined
    if (prezzo === undefined) errors.prezzo = 'Prezzo non valido'
  }

  let dataPagamento: string | undefined
  if (form.pagato) {
    dataPagamento = form.dataPagamento || toIsoDate(today)
    if (!isIsoDate(dataPagamento)) errors.dataPagamento = 'Data non valida'
  }

  if (Object.keys(errors).length > 0 || !form.disciplina) return { ok: false, errors }
  return {
    ok: true,
    value: {
      tipoId: form.tipoId || undefined,
      nome: collapseSpaces(form.nome) || nomeAutomatico(form.disciplina, form.modalita, lezioniTotali),
      disciplina: form.disciplina,
      modalita: form.modalita,
      lezioniTotali,
      dataInizio: form.dataInizio,
      scadenza,
      prezzo,
      pagato: form.pagato,
      dataPagamento,
      dataAcquisto: form.dataAcquisto,
      note: form.note.trim() || undefined,
    },
  }
}
