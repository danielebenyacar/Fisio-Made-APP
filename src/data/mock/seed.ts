import { addDays, getISODay, setHours, startOfDay, subDays } from 'date-fns'
import { dataOra, inizioSettimana } from '../../lib/agenda'
import { disciplineInUso, sortDiscipline } from '../../lib/discipline'
import { toIsoDate } from '../../lib/dates'
import { scadenzaDopoMesi } from '../../lib/packages'
import type {
  Appuntamento,
  Cliente,
  Corso,
  Disciplina,
  Lezione,
  Pacchetto,
  StatoAppuntamento,
  TipoPacchetto,
} from '../types'

export type DemoData = {
  clienti: Cliente[]
  tipiPacchetto: TipoPacchetto[]
  pacchetti: Pacchetto[]
  lezioni: Lezione[]
  corsi: Corso[]
  appuntamenti: Appuntamento[]
}

type CorsoSeed = Omit<Corso, 'id' | 'createdAt' | 'durataMinuti' | 'attivo' | 'iscritti'> & { attivo?: false }

// Weekly group classes: one yoga and one posturale every weekday, plus a suspended one.
const CORSI: CorsoSeed[] = [
  { nome: 'Posturale mattina', disciplina: 'posturale', giorno: 1, ora: '10:00' },
  { nome: 'Yoga sera', disciplina: 'yoga', giorno: 1, ora: '18:30' },
  { nome: 'Yoga mattina', disciplina: 'yoga', giorno: 2, ora: '09:30' },
  { nome: 'Posturale sera', disciplina: 'posturale', giorno: 2, ora: '18:00' },
  { nome: 'Posturale mattina', disciplina: 'posturale', giorno: 3, ora: '10:00' },
  { nome: 'Yoga sera', disciplina: 'yoga', giorno: 3, ora: '18:30' },
  { nome: 'Yoga mattina', disciplina: 'yoga', giorno: 4, ora: '09:30' },
  { nome: 'Posturale sera', disciplina: 'posturale', giorno: 4, ora: '18:00' },
  { nome: 'Posturale mattina', disciplina: 'posturale', giorno: 5, ora: '10:00' },
  { nome: 'Yoga sera', disciplina: 'yoga', giorno: 5, ora: '18:30' },
  { nome: 'Yoga del sabato', disciplina: 'yoga', giorno: 6, ora: '10:00', attivo: false },
]

type AppuntamentoSeed = {
  cliente: string // nome
  /** Days from today (negative = past) and time. Sundays move to Monday. */
  giorno: number
  ora: string
  valutazione?: true
  stato?: StatoAppuntamento
}

// Upcoming (and a couple of past) fisio appointments, besides those of past lessons.
const APPUNTAMENTI: AppuntamentoSeed[] = [
  { cliente: 'Davide', giorno: -1, ora: '16:00' }, // past, never marked: "da segnare"
  { cliente: 'Andrea', giorno: 0, ora: '17:00' },
  { cliente: 'Marco', giorno: 1, ora: '10:00' },
  { cliente: 'Paolo', giorno: 1, ora: '09:00', valutazione: true }, // no package yet
  { cliente: 'Valentina', giorno: 2, ora: '11:00' },
  { cliente: 'Francesca', giorno: 2, ora: '09:00', stato: 'annullato' },
  { cliente: 'Matteo', giorno: 3, ora: '15:00' },
  { cliente: 'Giulia', giorno: 4, ora: '12:00' }, // her package is finished
]

type TipoSeed = Omit<TipoPacchetto, 'id' | 'createdAt' | 'attivo'> & { attivo?: false }

// Example price list: names, durations and prices are placeholders the owner edits.
const LISTINO = {
  valutazione: { nome: 'Valutazione posturale (prima seduta)', disciplina: 'fisio', modalita: 'sedute', lezioni: 1, prezzo: 40 },
  fisio1: { nome: 'Seduta fisio singola', disciplina: 'fisio', modalita: 'sedute', lezioni: 1, prezzo: 60 },
  fisio5: { nome: '5 sedute fisio', disciplina: 'fisio', modalita: 'sedute', lezioni: 5, prezzo: 275 },
  fisio10: { nome: '10 sedute fisio', disciplina: 'fisio', modalita: 'sedute', lezioni: 10, prezzo: 500 },
  posturaleMese: { nome: 'Posturale mensile', disciplina: 'posturale', modalita: 'abbonamento', durataMesi: 1, prezzo: 60 },
  posturaleTrimestre: { nome: 'Posturale trimestrale', disciplina: 'posturale', modalita: 'abbonamento', durataMesi: 3, prezzo: 165 },
  yogaMese: { nome: 'Yoga mensile', disciplina: 'yoga', modalita: 'abbonamento', durataMesi: 1, prezzo: 60 },
  yogaTrimestre: { nome: 'Yoga trimestrale', disciplina: 'yoga', modalita: 'abbonamento', durataMesi: 3, prezzo: 165 },
  yogaProva: { nome: 'Yoga lezione di prova', disciplina: 'yoga', modalita: 'sedute', lezioni: 1, prezzo: 10, attivo: false },
} satisfies Record<string, TipoSeed>

type TipoKey = keyof typeof LISTINO

type PacchettoSeed = {
  tipo: TipoKey
  /** dataInizio = dataAcquisto = today - n days. */
  iniziatoGiorniFa: number
  nonPagato?: true
  /** Days ago of each lesson with stato 'fatta'. */
  fatte?: number[]
  /** Days ago of each lesson with stato 'assente'. */
  assenze?: number[]
  /** Days ago inside skipped weeks the owner kept valid (subscriptions). */
  recuperi?: number[]
}

type ClienteSeed = {
  nome: string
  cognome: string
  discipline: Disciplina[]
  telefono?: string
  email?: string
  /** [days from today, age]. Ages are multiples of 4 so Feb 29 stays valid. */
  compleanno?: [number, number]
  note?: string
  archiviato?: boolean
  pacchetti: PacchettoSeed[]
}

/** `count` lessons `step` days apart, the last one `lastDaysAgo` days ago. */
function every(step: number, count: number, lastDaysAgo: number): number[] {
  return Array.from({ length: count }, (_, i) => lastDaysAgo + step * (count - 1 - i))
}

const pad = (n: number, width: number) => String(n).padStart(width, '0')

// Names are invented. Phone numbers use the unassigned +39 300 prefix and
// emails use example.com, so nothing points to a real person.
// Subscription lessons are 7 days apart: never two in the same week.
const CLIENTI: ClienteSeed[] = [
  {
    // Esaurito: 10/10 sessions used, no newer package.
    nome: 'Giulia',
    cognome: 'Bianchi',
    discipline: ['fisio'],
    telefono: '+393000000101',
    compleanno: [120, 36],
    pacchetti: [{ tipo: 'fisio10', iniziatoGiorniFa: 32, fatte: every(3, 10, 2) }],
  },
  {
    // Da rinnovare: 1 session left.
    nome: 'Marco',
    cognome: 'Esposito',
    discipline: ['fisio'],
    telefono: '+393000000102',
    compleanno: [200, 44],
    pacchetti: [{ tipo: 'fisio10', iniziatoGiorniFa: 36, fatte: every(4, 9, 1) }],
  },
  {
    // Da rinnovare: 2 sessions left. Also an active yoga subscription.
    nome: 'Francesca',
    cognome: 'Romano',
    discipline: ['fisio', 'yoga'],
    telefono: '+393000000103',
    compleanno: [75, 32],
    pacchetti: [
      { tipo: 'fisio5', iniziatoGiorniFa: 15, fatte: every(5, 3, 3) },
      { tipo: 'yogaMese', iniziatoGiorniFa: 10, fatte: every(7, 2, 1) },
    ],
  },
  {
    // Non pagato: current posturale subscription still to be paid.
    nome: 'Luca',
    cognome: 'Colombo',
    discipline: ['fisio', 'posturale'],
    telefono: '+393000000104',
    compleanno: [260, 28],
    pacchetti: [{ tipo: 'posturaleMese', iniziatoGiorniFa: 10, nonPagato: true, fatte: every(7, 2, 1) }],
  },
  {
    // Assente: valid subscription, last lesson 20 days ago, weeks being lost.
    nome: 'Chiara',
    cognome: 'Ricci',
    discipline: ['yoga'],
    telefono: '+393000000105',
    compleanno: [300, 48],
    pacchetti: [{ tipo: 'yogaTrimestre', iniziatoGiorniFa: 45, fatte: every(7, 4, 20) }],
  },
  {
    // Compleanno oggi. Monthly subscription ending in 1–4 days, this week still
    // to use: in scadenza.
    nome: 'Alessandro',
    cognome: 'Marino',
    discipline: ['posturale'],
    telefono: '+393000000106',
    compleanno: [0, 40],
    pacchetti: [{ tipo: 'posturaleMese', iniziatoGiorniFa: 26, fatte: every(7, 3, 9) }],
  },
  {
    // Compleanno tra 2 giorni. Skipped a week two weeks ago, kept valid: one lesson to recover.
    nome: 'Sara',
    cognome: 'Greco',
    discipline: ['yoga'],
    telefono: '+393000000107',
    compleanno: [2, 28],
    pacchetti: [{ tipo: 'yogaTrimestre', iniziatoGiorniFa: 25, fatte: [22, 8, 1], recuperi: [15] }],
  },
  {
    // Compleanno tra 3 giorni.
    nome: 'Davide',
    cognome: 'Bruno',
    discipline: ['fisio'],
    telefono: '+393000000108',
    compleanno: [3, 52],
    pacchetti: [{ tipo: 'fisio5', iniziatoGiorniFa: 12, fatte: [9, 4] }],
  },
  {
    // Compleanno tra 5 giorni: outside the 3-day alert window. Two subscriptions.
    nome: 'Elena',
    cognome: 'Gallo',
    discipline: ['posturale', 'yoga'],
    telefono: '+393000000109',
    compleanno: [5, 32],
    pacchetti: [
      { tipo: 'posturaleMese', iniziatoGiorniFa: 5, fatte: [3] },
      { tipo: 'yogaMese', iniziatoGiorniFa: 5, fatte: [1] },
    ],
  },
  {
    // New package bought while the old one still has 2 sessions left.
    nome: 'Matteo',
    cognome: 'Conti',
    discipline: ['fisio'],
    telefono: '+393000000110',
    compleanno: [150, 36],
    pacchetti: [
      { tipo: 'fisio10', iniziatoGiorniFa: 42, fatte: every(5, 8, 5) },
      { tipo: 'fisio10', iniziatoGiorniFa: 1 },
    ],
  },
  {
    // One recorded absence: must not reduce the sessions left (3 done + 1 absence → 7 left).
    nome: 'Valentina',
    cognome: 'De Luca',
    discipline: ['fisio'],
    telefono: '+393000000111',
    compleanno: [100, 44],
    pacchetti: [{ tipo: 'fisio10', iniziatoGiorniFa: 22, fatte: [19, 12, 5], assenze: [8] }],
  },
  {
    // No phone: WhatsApp button must be disabled. Subscription expired, not renewed.
    nome: 'Simone',
    cognome: 'Mancini',
    discipline: ['posturale'],
    email: 'simone.mancini@example.com',
    compleanno: [220, 40],
    note: 'Preferisce essere contattato via email.',
    pacchetti: [{ tipo: 'posturaleMese', iniziatoGiorniFa: 40, fatte: every(7, 4, 14) }],
  },
  {
    // Archived: expired subscription and a birthday tomorrow, but no alerts.
    nome: 'Martina',
    cognome: 'Costa',
    discipline: ['yoga'],
    telefono: '+393000000113',
    compleanno: [1, 36],
    archiviato: true,
    pacchetti: [{ tipo: 'yogaMese', iniziatoGiorniFa: 120, fatte: every(7, 4, 95) }],
  },
  {
    // Normal: did the posture assessment, then bought 10 sessions.
    nome: 'Andrea',
    cognome: 'Giordano',
    discipline: ['fisio'],
    telefono: '+393000000114',
    email: 'andrea.giordano@example.com',
    compleanno: [45, 28],
    pacchetti: [
      { tipo: 'valutazione', iniziatoGiorniFa: 20, fatte: [20] },
      { tipo: 'fisio10', iniziatoGiorniFa: 14, fatte: every(5, 3, 1) },
    ],
  },
  {
    // Normal, with an older package fully used before the current one.
    nome: 'Federica',
    cognome: 'Rizzo',
    discipline: ['fisio', 'posturale', 'yoga'],
    telefono: '+393000000115',
    compleanno: [180, 52],
    note: 'Preferisce il pomeriggio, avvisare se si sposta.',
    pacchetti: [
      { tipo: 'fisio10', iniziatoGiorniFa: 62, fatte: every(4, 10, 24) },
      { tipo: 'fisio10', iniziatoGiorniFa: 21, fatte: every(3, 6, 3) },
      { tipo: 'yogaTrimestre', iniziatoGiorniFa: 30, fatte: every(7, 4, 2) },
    ],
  },
  {
    // No package yet: only the booked assessment.
    nome: 'Paolo',
    cognome: 'Lombardi',
    discipline: [],
    telefono: '+393000000116',
    pacchetti: [],
  },
]

/** Fake demo data, relative to `now` so every scenario stays current. */
export function createSeed(now: Date): DemoData {
  const today = startOfDay(now)
  const daysAgo = (n: number) => subDays(today, n)
  const listinoCreated = setHours(daysAgo(200), 9).toISOString()
  const data: DemoData = { clienti: [], tipiPacchetto: [], pacchetti: [], lezioni: [], corsi: [], appuntamenti: [] }
  let pacchettoSeq = 0
  let lezioneSeq = 0
  let appuntamentoSeq = 0

  CORSI.forEach((corso, i) => {
    data.corsi.push({
      durataMinuti: 60,
      attivo: true,
      iscritti: [],
      ...corso,
      id: `demo-corso-${pad(i + 1, 2)}`,
      createdAt: listinoCreated,
    })
  })
  const corsoDi = (disciplina: Disciplina, giorno: number) =>
    data.corsi.find((c) => c.attivo && c.disciplina === disciplina && c.giorno === giorno)

  const addAppuntamento = (a: Omit<Appuntamento, 'id' | 'createdAt' | 'durataMinuti'>) => {
    appuntamentoSeq += 1
    const appuntamento: Appuntamento = {
      ...a,
      durataMinuti: 60,
      id: `demo-appuntamento-${pad(appuntamentoSeq, 3)}`,
      createdAt: setHours(subDays(new Date(a.inizio), 7), 12).toISOString(),
    }
    data.appuntamenti.push(appuntamento)
    return appuntamento
  }

  const tipoId = (key: TipoKey) => `demo-tipo-${key}`
  for (const [key, tipo] of Object.entries(LISTINO) as [TipoKey, TipoSeed][]) {
    data.tipiPacchetto.push({ attivo: true, ...tipo, id: tipoId(key), createdAt: listinoCreated })
  }

  CLIENTI.forEach((seed, index) => {
    const firstPurchase = Math.max(5, ...seed.pacchetti.map((p) => p.iniziatoGiorniFa))
    const createdAt = setHours(daysAgo(firstPurchase + 3), 18)

    const cliente: Cliente = {
      id: `demo-cliente-${pad(index + 1, 2)}`,
      nome: seed.nome,
      cognome: seed.cognome,
      discipline: seed.discipline,
      archiviato: seed.archiviato ?? false,
      createdAt: createdAt.toISOString(),
    }
    if (seed.telefono) cliente.telefono = seed.telefono
    if (seed.email) cliente.email = seed.email
    if (seed.note) cliente.note = seed.note
    if (seed.compleanno) {
      const [daysFromToday, age] = seed.compleanno
      const day = addDays(today, daysFromToday)
      cliente.dataNascita = `${day.getFullYear() - age}${toIsoDate(day).slice(4)}`
    }
    data.clienti.push(cliente)

    for (const p of seed.pacchetti) {
      pacchettoSeq += 1
      const tipo: TipoSeed = LISTINO[p.tipo]
      const acquisto = setHours(daysAgo(p.iniziatoGiorniFa), 8)
      const dataInizio = toIsoDate(acquisto)
      const pacchetto: Pacchetto = {
        id: `demo-pacchetto-${pad(pacchettoSeq, 2)}`,
        clienteId: cliente.id,
        tipoId: tipoId(p.tipo),
        nome: tipo.nome,
        disciplina: tipo.disciplina,
        modalita: tipo.modalita,
        dataInizio,
        prezzo: tipo.prezzo,
        pagato: !p.nonPagato,
        dataAcquisto: dataInizio,
        createdAt: acquisto.toISOString(),
      }
      if (tipo.modalita === 'sedute') pacchetto.lezioniTotali = tipo.lezioni
      if (tipo.durataMesi) pacchetto.scadenza = scadenzaDopoMesi(dataInizio, tipo.durataMesi)
      if (pacchetto.pagato) pacchetto.dataPagamento = dataInizio
      if (p.recuperi) pacchetto.recuperi = p.recuperi.map((d) => toIsoDate(inizioSettimana(daysAgo(d))))
      data.pacchetti.push(pacchetto)

      const lezioni = [
        ...(p.fatte ?? []).map((d) => ({ d, stato: 'fatta' as const })),
        ...(p.assenze ?? []).map((d) => ({ d, stato: 'assente' as const })),
      ].sort((a, b) => b.d - a.d)

      for (const { d, stato } of lezioni) {
        lezioneSeq += 1
        // Weekend lessons move back to Friday (same week), if the package had started.
        let day = daysAgo(d)
        const weekday = getISODay(day)
        if (weekday >= 6 && toIsoDate(subDays(day, weekday - 5)) >= dataInizio) day = subDays(day, weekday - 5)
        const corso = pacchetto.modalita === 'abbonamento' ? corsoDi(pacchetto.disciplina, getISODay(day)) : undefined
        const when = (corso ? dataOra(toIsoDate(day), corso.ora) : setHours(day, 9 + (lezioneSeq % 9))).toISOString()
        const lezione: Lezione = {
          id: `demo-lezione-${pad(lezioneSeq, 3)}`,
          pacchettoId: pacchetto.id,
          clienteId: cliente.id,
          disciplina: pacchetto.disciplina,
          data: when,
          stato,
          createdAt: when,
        }
        if (corso) lezione.corsoId = corso.id
        if (stato === 'assente') lezione.note = 'Ha avvisato.'
        if (pacchetto.disciplina === 'fisio') {
          const appuntamento = addAppuntamento({
            clienteId: cliente.id,
            disciplina: 'fisio',
            inizio: when,
            valutazione: p.tipo === 'valutazione',
            stato: stato === 'fatta' ? 'fatto' : 'assente',
            lezioneId: lezione.id,
          })
          lezione.appuntamentoId = appuntamento.id
        }
        data.lezioni.push(lezione)
      }
    }
  })

  // Fixed groups: everyone with a subscription belongs to the group of their
  // latest lesson. Federica belongs to another yoga group: her lessons there
  // show a change of group (allowed, not penalised).
  for (const cliente of data.clienti.filter((c) => !c.archiviato)) {
    for (const disciplina of ['posturale', 'yoga'] as const) {
      const last = data.lezioni.filter((l) => l.clienteId === cliente.id && l.disciplina === disciplina && l.corsoId).at(-1)
      if (!last) continue
      let corso = data.corsi.find((c) => c.id === last.corsoId)!
      if (cliente.nome === 'Federica') {
        const same = data.corsi.filter((c) => c.attivo && c.disciplina === disciplina)
        corso = same[(same.indexOf(corso) + 1) % same.length]
      }
      corso.iscritti.push(cliente.id)
    }
  }

  for (const a of APPUNTAMENTI) {
    const cliente = data.clienti.find((c) => c.nome === a.cliente)!
    let day = addDays(today, a.giorno)
    if (getISODay(day) === 7) day = addDays(day, 1)
    addAppuntamento({
      clienteId: cliente.id,
      disciplina: 'fisio',
      inizio: dataOra(toIsoDate(day), a.ora).toISOString(),
      valutazione: a.valutazione ?? false,
      stato: a.stato ?? 'programmato',
    })
  }

  // Disciplines follow what each client does (groups, sessions, packages),
  // on top of those written by hand as if imported from Excel.
  for (const cliente of data.clienti) {
    cliente.discipline = sortDiscipline([...cliente.discipline, ...disciplineInUso(cliente.id, data)])
  }

  return data
}
