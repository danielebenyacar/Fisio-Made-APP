import type { Pacchetto } from '../data/types'
import { formatDateIt, formatDateShort } from './dates'
import type { StatoPacchetto } from './packages'

export type Tono = 'ok' | 'avviso' | 'problema' | 'neutro'

export type Etichetta = { testo: string; tono: Tono }

/**
 * The one warning worth showing for a package, or null when all is fine.
 * `rinnovato`: a newer package of the same discipline exists, so nothing is urgent.
 */
export function etichettaStato(
  pacchetto: Pacchetto,
  stato: StatoPacchetto,
  rinnovato = false,
): Etichetta | null {
  const etichetta = etichettaBase(pacchetto, stato)
  if (!rinnovato || !etichetta) return etichetta
  if (etichetta.tono === 'avviso') return { testo: 'Già rinnovato', tono: 'ok' }
  return { ...etichetta, tono: 'neutro' }
}

function etichettaBase(pacchetto: Pacchetto, stato: StatoPacchetto): Etichetta | null {
  if (stato.nonIniziato) return { testo: `Inizia il ${formatDateIt(pacchetto.dataInizio)}`, tono: 'neutro' }
  if (stato.scaduto) {
    const avanzate =
      pacchetto.modalita === 'sedute' && stato.residue > 0
        ? ` con ${stato.residue === 1 ? '1 seduta non usata' : `${stato.residue} sedute non usate`}`
        : ''
    return { testo: `Scaduto il ${formatDateIt(pacchetto.scadenza!)}${avanzate}`, tono: 'problema' }
  }
  if (stato.esaurito) {
    return pacchetto.modalita === 'sedute'
      ? { testo: 'Esaurito', tono: 'problema' }
      : { testo: `Settimane finite, scade il ${formatDateIt(pacchetto.scadenza!)}`, tono: 'problema' }
  }
  if (stato.inScadenza) {
    const giorni = stato.giorniAllaScadenza!
    const quando = giorni === 0 ? 'oggi' : giorni === 1 ? 'domani' : `tra ${giorni} giorni`
    return { testo: `Scade ${quando}`, tono: 'avviso' }
  }
  if (stato.daRinnovare) return { testo: 'Da rinnovare', tono: 'avviso' }
  return null
}

/** "8 di 10 fatte · ne restano 2" or "Dal 1 ott al 31 ott · 2 fatte, 1 persa, 2 da fare". */
export function descriviAvanzamento(pacchetto: Pacchetto, stato: StatoPacchetto): string {
  if (pacchetto.modalita === 'sedute') {
    const restano = stato.residue === 1 ? 'ne resta 1' : `ne restano ${stato.residue}`
    return `${stato.fatte} di ${stato.totali} fatte · ${restano}`
  }
  const count = (s: string) => stato.settimane.filter((w) => w.stato === s).length
  const perse = count('persa')
  const parts = [`${count('fatta')} ${count('fatta') === 1 ? 'fatta' : 'fatte'}`]
  if (perse > 0) parts.push(`${perse} ${perse === 1 ? 'persa' : 'perse'}`)
  parts.push(`${count('da-fare')} da fare`)
  const periodo = `Dal ${formatDateShort(pacchetto.dataInizio)} al ${formatDateShort(pacchetto.scadenza!)}`
  return `${periodo} · ${parts.join(', ')}`
}

/** Short badge for the client list: "8/10" for sessions, "al 31 ott" for subscriptions. */
export function badgeBreve(pacchetto: Pacchetto, stato: StatoPacchetto): string {
  return pacchetto.modalita === 'sedute'
    ? `${stato.fatte}/${stato.totali}`
    : `al ${formatDateShort(pacchetto.scadenza!)}`
}
