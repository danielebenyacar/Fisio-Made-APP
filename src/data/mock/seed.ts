import { addDays, setHours, startOfDay, subDays } from 'date-fns'
import { toIsoDate } from '../../lib/dates'
import type { Cliente, Disciplina, Lezione, Pacchetto } from '../types'

export type DemoData = {
  clienti: Cliente[]
  pacchetti: Pacchetto[]
  lezioni: Lezione[]
}

type PacchettoSeed = {
  lezioniTotali: number
  prezzo: number
  pagato: boolean
  acquistatoGiorniFa: number
  /** Days ago of each lesson with stato 'fatta'. */
  fatte: number[]
  /** Days ago of each lesson with stato 'assente'. */
  assenze?: number[]
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
  senzaConsenso?: true
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
const CLIENTI: ClienteSeed[] = [
  {
    // Esaurito: latest package 10/10 used.
    nome: 'Giulia',
    cognome: 'Bianchi',
    discipline: ['fisio'],
    telefono: '+393000000101',
    compleanno: [120, 36],
    pacchetti: [{ lezioniTotali: 10, prezzo: 250, pagato: true, acquistatoGiorniFa: 32, fatte: every(3, 10, 2) }],
  },
  {
    // Da rinnovare: 1 lesson left.
    nome: 'Marco',
    cognome: 'Esposito',
    discipline: ['posturale'],
    telefono: '+393000000102',
    compleanno: [200, 44],
    pacchetti: [{ lezioniTotali: 10, prezzo: 250, pagato: true, acquistatoGiorniFa: 36, fatte: every(4, 9, 1) }],
  },
  {
    // Da rinnovare: 2 lessons left.
    nome: 'Francesca',
    cognome: 'Romano',
    discipline: ['yoga'],
    telefono: '+393000000103',
    compleanno: [75, 32],
    pacchetti: [{ lezioniTotali: 5, prezzo: 140, pagato: true, acquistatoGiorniFa: 15, fatte: every(5, 3, 3) }],
  },
  {
    // Non pagato.
    nome: 'Luca',
    cognome: 'Colombo',
    discipline: ['fisio', 'posturale'],
    telefono: '+393000000104',
    compleanno: [260, 28],
    pacchetti: [{ lezioniTotali: 10, prezzo: 250, pagato: false, acquistatoGiorniFa: 10, fatte: [8, 2] }],
  },
  {
    // Assente: lessons left, last lesson 20 days ago.
    nome: 'Chiara',
    cognome: 'Ricci',
    discipline: ['yoga'],
    telefono: '+393000000105',
    compleanno: [300, 48],
    pacchetti: [{ lezioniTotali: 10, prezzo: 250, pagato: true, acquistatoGiorniFa: 40, fatte: every(6, 4, 20) }],
  },
  {
    // Compleanno oggi.
    nome: 'Alessandro',
    cognome: 'Marino',
    discipline: ['posturale'],
    telefono: '+393000000106',
    compleanno: [0, 40],
    pacchetti: [{ lezioniTotali: 10, prezzo: 250, pagato: true, acquistatoGiorniFa: 20, fatte: every(5, 4, 2) }],
  },
  {
    // Compleanno tra 2 giorni.
    nome: 'Sara',
    cognome: 'Greco',
    discipline: ['yoga'],
    telefono: '+393000000107',
    compleanno: [2, 28],
    pacchetti: [{ lezioniTotali: 20, prezzo: 460, pagato: true, acquistatoGiorniFa: 25, fatte: every(3, 8, 1) }],
  },
  {
    // Compleanno tra 3 giorni.
    nome: 'Davide',
    cognome: 'Bruno',
    discipline: ['fisio'],
    telefono: '+393000000108',
    compleanno: [3, 52],
    pacchetti: [{ lezioniTotali: 5, prezzo: 140, pagato: true, acquistatoGiorniFa: 12, fatte: [9, 4] }],
  },
  {
    // Compleanno tra 5 giorni: outside the 3-day alert window.
    nome: 'Elena',
    cognome: 'Gallo',
    discipline: ['posturale', 'yoga'],
    telefono: '+393000000109',
    compleanno: [5, 32],
    pacchetti: [{ lezioniTotali: 10, prezzo: 250, pagato: true, acquistatoGiorniFa: 18, fatte: every(5, 3, 4) }],
  },
  {
    // New package bought while the old one still has 2 lessons left.
    nome: 'Matteo',
    cognome: 'Conti',
    discipline: ['fisio'],
    telefono: '+393000000110',
    compleanno: [150, 36],
    pacchetti: [
      { lezioniTotali: 10, prezzo: 250, pagato: true, acquistatoGiorniFa: 42, fatte: every(5, 8, 5) },
      { lezioniTotali: 10, prezzo: 250, pagato: true, acquistatoGiorniFa: 1, fatte: [] },
    ],
  },
  {
    // One recorded absence: must not reduce the lessons left.
    nome: 'Valentina',
    cognome: 'De Luca',
    discipline: ['yoga'],
    telefono: '+393000000111',
    compleanno: [100, 44],
    pacchetti: [
      { lezioniTotali: 10, prezzo: 250, pagato: true, acquistatoGiorniFa: 22, fatte: [19, 12, 5], assenze: [8] },
    ],
  },
  {
    // No phone: WhatsApp button must be disabled.
    nome: 'Simone',
    cognome: 'Mancini',
    discipline: ['posturale'],
    email: 'simone.mancini@example.com',
    compleanno: [220, 40],
    note: 'Preferisce essere contattato via email.',
    pacchetti: [{ lezioniTotali: 10, prezzo: 250, pagato: true, acquistatoGiorniFa: 15, fatte: every(5, 3, 2) }],
  },
  {
    // Archived: would trigger "esaurito" and a birthday tomorrow, but must not.
    nome: 'Martina',
    cognome: 'Costa',
    discipline: ['yoga'],
    telefono: '+393000000113',
    compleanno: [1, 36],
    archiviato: true,
    pacchetti: [{ lezioniTotali: 5, prezzo: 140, pagato: true, acquistatoGiorniFa: 120, fatte: every(5, 5, 90) }],
  },
  {
    // Normal.
    nome: 'Andrea',
    cognome: 'Giordano',
    discipline: ['fisio'],
    telefono: '+393000000114',
    email: 'andrea.giordano@example.com',
    compleanno: [45, 28],
    pacchetti: [{ lezioniTotali: 10, prezzo: 250, pagato: true, acquistatoGiorniFa: 14, fatte: every(5, 3, 1) }],
  },
  {
    // Normal, with an older package fully used before the current one.
    nome: 'Federica',
    cognome: 'Rizzo',
    discipline: ['fisio', 'posturale', 'yoga'],
    telefono: '+393000000115',
    compleanno: [180, 52],
    note: 'Lombalgia cronica, evitare carichi.',
    pacchetti: [
      { lezioniTotali: 10, prezzo: 250, pagato: true, acquistatoGiorniFa: 62, fatte: every(4, 10, 24) },
      { lezioniTotali: 20, prezzo: 460, pagato: true, acquistatoGiorniFa: 21, fatte: every(3, 6, 3) },
    ],
  },
  {
    // Normal, no birth date, no discipline yet, privacy consent still to sign.
    nome: 'Paolo',
    cognome: 'Lombardi',
    discipline: [],
    senzaConsenso: true,
    telefono: '+393000000116',
    pacchetti: [{ lezioniTotali: 5, prezzo: 140, pagato: true, acquistatoGiorniFa: 7, fatte: [6] }],
  },
]

/** Fake demo data, relative to `now` so every scenario stays current. */
export function createSeed(now: Date): DemoData {
  const today = startOfDay(now)
  const daysAgo = (n: number) => subDays(today, n)
  const data: DemoData = { clienti: [], pacchetti: [], lezioni: [] }
  let pacchettoSeq = 0
  let lezioneSeq = 0

  CLIENTI.forEach((seed, index) => {
    const firstPurchase = Math.max(...seed.pacchetti.map((p) => p.acquistatoGiorniFa))
    const createdAt = setHours(daysAgo(firstPurchase + 3), 18)

    const cliente: Cliente = {
      id: `demo-cliente-${pad(index + 1, 2)}`,
      nome: seed.nome,
      cognome: seed.cognome,
      discipline: seed.discipline,
      consensoPrivacy: !seed.senzaConsenso,
      archiviato: seed.archiviato ?? false,
      createdAt: createdAt.toISOString(),
    }
    if (!seed.senzaConsenso) cliente.consensoData = toIsoDate(createdAt)
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
      const acquisto = setHours(daysAgo(p.acquistatoGiorniFa), 18)
      const pacchetto: Pacchetto = {
        id: `demo-pacchetto-${pad(pacchettoSeq, 2)}`,
        clienteId: cliente.id,
        lezioniTotali: p.lezioniTotali,
        prezzo: p.prezzo,
        pagato: p.pagato,
        dataAcquisto: toIsoDate(acquisto),
        createdAt: acquisto.toISOString(),
      }
      if (p.pagato) pacchetto.dataPagamento = pacchetto.dataAcquisto
      data.pacchetti.push(pacchetto)

      const lezioni = [
        ...p.fatte.map((d) => ({ d, stato: 'fatta' as const })),
        ...(p.assenze ?? []).map((d) => ({ d, stato: 'assente' as const })),
      ].sort((a, b) => b.d - a.d)

      for (const { d, stato } of lezioni) {
        lezioneSeq += 1
        const when = setHours(daysAgo(d), 9 + (lezioneSeq % 9)).toISOString()
        const lezione: Lezione = {
          id: `demo-lezione-${pad(lezioneSeq, 3)}`,
          pacchettoId: pacchetto.id,
          clienteId: cliente.id,
          data: when,
          stato,
          createdAt: when,
        }
        if (stato === 'assente') lezione.note = 'Ha avvisato: influenza.'
        data.lezioni.push(lezione)
      }
    }
  })

  return data
}
