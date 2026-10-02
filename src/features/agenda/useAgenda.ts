import { useEffect, useState } from 'react'
import { useRepository } from '../../app/dataSource'
import type { Appuntamento, Cliente, Corso, Lezione } from '../../data'

export type AgendaDati = {
  corsi: Corso[]
  appuntamenti: Appuntamento[]
  lezioni: Lezione[]
  clienti: Cliente[]
}

/** Classes, appointments in [da, a), lessons and clients. `reload()` after a change. */
export function useAgenda(da: Date, a: Date) {
  const repository = useRepository()
  const key = `${da.toISOString()}|${a.toISOString()}`
  const [state, setState] = useState<{ key?: string; dati?: AgendaDati; error?: boolean }>({})
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    const [from, to] = key.split('|')
    Promise.all([
      repository.listCorsi(),
      repository.listAppuntamenti({ da: from, a: to }),
      repository.listLezioni(),
      repository.listClienti(),
    ]).then(
      ([corsi, appuntamenti, lezioni, clienti]) =>
        !cancelled && setState({ key, dati: { corsi, appuntamenti, lezioni, clienti } }),
      () => !cancelled && setState({ key, error: true }),
    )
    return () => {
      cancelled = true
    }
  }, [repository, key, version])

  const current = state.key === key ? state : {}
  return { dati: current.dati, error: current.error ?? false, reload: () => setVersion((v) => v + 1) }
}
