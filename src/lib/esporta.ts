import type { Appuntamento, Cliente, Corso, Lezione, Pacchetto, TipoPacchetto } from '../data/types'
import { GIORNI, oraDi } from './agenda'
import { fullName } from './clienti'
import { formatDateIt, toIsoDate } from './dates'
import { DISCIPLINA_LABEL } from './discipline'
import { MODALITA_LABEL } from './listino'
import { statoPacchetto } from './packages'
import { formatPhone } from './whatsapp'

/** Everything the app holds, as read from the repository. */
export type TuttiIDati = {
  clienti: Cliente[]
  tipiPacchetto: TipoPacchetto[]
  pacchetti: Pacchetto[]
  lezioni: Lezione[]
  corsi: Corso[]
  appuntamenti: Appuntamento[]
}

export type ValoreCella = string | number | null
/** One sheet of the export: the first row holds the column titles. */
export type Foglio = { nome: string; righe: ValoreCella[][] }

const siNo = (value: boolean) => (value ? 'Sì' : 'No')
const data = (iso: string | undefined) => (iso ? formatDateIt(iso) : null)
const giorno = (isoDateTime: string) => formatDateIt(toIsoDate(new Date(isoDateTime)))
const ora = (isoDateTime: string) => oraDi(new Date(isoDateTime))

const STATO_APPUNTAMENTO: Record<Appuntamento['stato'], string> = {
  programmato: 'Programmato',
  fatto: 'Fatto',
  assente: 'Assente',
  annullato: 'Annullato',
}

/**
 * All the data as Excel sheets, readable by a person. The "Clienti" sheet uses the
 * same column titles as the import, so it can be imported again.
 */
export function fogliEsportazione(dati: TuttiIDati, now: Date): Foglio[] {
  const nome = (clienteId: string) => {
    const cliente = dati.clienti.find((c) => c.id === clienteId)
    return cliente ? fullName(cliente) : ''
  }
  const corsoNome = (id: string | undefined) => dati.corsi.find((c) => c.id === id)?.nome ?? null
  const pacchettoNome = (id: string) => dati.pacchetti.find((p) => p.id === id)?.nome ?? ''

  const clienti: Foglio = {
    nome: 'Clienti',
    righe: [
      ['Nome', 'Cognome', 'Telefono', 'Email', 'Data di nascita', 'Discipline', 'Note', 'Gruppo fisso', 'Archiviato'],
      ...dati.clienti.map((c) => [
        c.nome,
        c.cognome,
        c.telefono ? formatPhone(c.telefono) : null,
        c.email ?? null,
        data(c.dataNascita),
        c.discipline.map((d) => DISCIPLINA_LABEL[d]).join(', ') || null,
        c.note ?? null,
        dati.corsi
          .filter((corso) => corso.iscritti.includes(c.id))
          .map((corso) => corso.nome)
          .join(', ') || null,
        siNo(c.archiviato),
      ]),
    ],
  }

  const pacchetti: Foglio = {
    nome: 'Pacchetti',
    righe: [
      ['Cliente', 'Pacchetto', 'Disciplina', 'Tipo', 'Dal', 'Fino al', 'Sedute', 'Fatte', 'Rimaste', 'Pagato', 'Pagato il', 'Prezzo €', 'Note'],
      ...dati.pacchetti.map((p) => {
        const stato = statoPacchetto(p, dati.lezioni, now)
        return [
          nome(p.clienteId),
          p.nome,
          DISCIPLINA_LABEL[p.disciplina],
          MODALITA_LABEL[p.modalita],
          data(p.dataInizio),
          data(p.scadenza),
          p.lezioniTotali ?? null,
          stato.fatte,
          stato.residue,
          siNo(p.pagato),
          data(p.dataPagamento),
          p.prezzo ?? null,
          p.note ?? null,
        ]
      }),
    ],
  }

  const lezioni: Foglio = {
    nome: 'Lezioni',
    righe: [
      ['Data', 'Ora', 'Cliente', 'Disciplina', 'Stato', 'Corso', 'Pacchetto', 'Note'],
      ...dati.lezioni.map((l) => [
        giorno(l.data),
        ora(l.data),
        nome(l.clienteId),
        DISCIPLINA_LABEL[l.disciplina],
        l.stato === 'fatta' ? 'Fatta' : 'Assente',
        corsoNome(l.corsoId) ?? (l.appuntamentoId ? 'Seduta individuale' : null),
        pacchettoNome(l.pacchettoId),
        l.note ?? null,
      ]),
    ],
  }

  const appuntamenti: Foglio = {
    nome: 'Appuntamenti',
    righe: [
      ['Data', 'Ora', 'Durata (min)', 'Cliente', 'Disciplina', 'Valutazione', 'Stato', 'Note'],
      ...dati.appuntamenti.map((a) => [
        giorno(a.inizio),
        ora(a.inizio),
        a.durataMinuti,
        nome(a.clienteId),
        DISCIPLINA_LABEL[a.disciplina],
        siNo(a.valutazione),
        STATO_APPUNTAMENTO[a.stato],
        a.note ?? null,
      ]),
    ],
  }

  const corsi: Foglio = {
    nome: 'Corsi',
    righe: [
      ['Corso', 'Disciplina', 'Giorno', 'Ora', 'Durata (min)', 'Attivo', 'Iscritti fissi'],
      ...dati.corsi.map((c) => [
        c.nome,
        DISCIPLINA_LABEL[c.disciplina],
        GIORNI[c.giorno - 1],
        c.ora,
        c.durataMinuti,
        siNo(c.attivo),
        c.iscritti.map(nome).filter(Boolean).join(', ') || null,
      ]),
    ],
  }

  const prezzi: Foglio = {
    nome: 'Prezzi',
    righe: [
      ['Voce', 'Disciplina', 'Tipo', 'Sedute', 'Mesi', 'Prezzo €', 'In vendita'],
      ...dati.tipiPacchetto.map((t) => [
        t.nome,
        DISCIPLINA_LABEL[t.disciplina],
        MODALITA_LABEL[t.modalita],
        t.lezioni ?? null,
        t.durataMesi ?? null,
        t.prezzo ?? null,
        siNo(t.attivo),
      ]),
    ],
  }

  return [clienti, pacchetti, lezioni, appuntamenti, corsi, prezzi]
}

/** "fisiomade-dati-2026-10-04.xlsx". */
export function nomeFileEsportazione(now: Date): string {
  return `fisiomade-dati-${toIsoDate(now)}.xlsx`
}
