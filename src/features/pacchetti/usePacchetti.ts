import { useEffect, useState } from 'react'
import { useRepository } from '../../app/dataSource'
import type { Lezione, Pacchetto, TipoPacchetto } from '../../data'

/** The whole price list. `tipi` is undefined while loading. */
export function useListino(): { tipi?: TipoPacchetto[]; error: boolean } {
  const repository = useRepository()
  const [state, setState] = useState<{ tipi?: TipoPacchetto[]; error: boolean }>({ error: false })

  useEffect(() => {
    let cancelled = false
    repository.listTipiPacchetto().then(
      (tipi) => !cancelled && setState({ tipi, error: false }),
      () => !cancelled && setState({ error: true }),
    )
    return () => {
      cancelled = true
    }
  }, [repository])

  return state
}

/** One price list entry: undefined while loading, null if missing. */
export function useTipoPacchetto(id: string | undefined) {
  const repository = useRepository()
  const [state, setState] = useState<{ id?: string; tipo?: TipoPacchetto | null; error?: boolean }>({})

  useEffect(() => {
    if (!id) return
    let cancelled = false
    repository.getTipoPacchetto(id).then(
      (tipo) => !cancelled && setState({ id, tipo }),
      () => !cancelled && setState({ id, error: true }),
    )
    return () => {
      cancelled = true
    }
  }, [repository, id])

  const current = state.id === id ? state : {}
  return { tipo: current.tipo, error: current.error ?? false }
}

type PacchettiState = { pacchetti?: Pacchetto[]; lezioni?: Lezione[]; error: boolean }

/**
 * Packages and lessons of one client, or of everyone when `clienteId` is
 * undefined and `tutti` is true. `reload()` fetches them again after a change.
 */
export function usePacchetti(filter: { clienteId?: string; tutti?: boolean }) {
  const repository = useRepository()
  const { clienteId, tutti } = filter
  const [state, setState] = useState<PacchettiState & { key?: string }>({ error: false })
  const [version, setVersion] = useState(0)
  const key = tutti ? '*' : clienteId

  useEffect(() => {
    if (!key) return
    let cancelled = false
    const by = key === '*' ? undefined : { clienteId: key }
    Promise.all([repository.listPacchetti(by), repository.listLezioni(by)]).then(
      ([pacchetti, lezioni]) => !cancelled && setState({ key, pacchetti, lezioni, error: false }),
      () => !cancelled && setState({ key, error: true }),
    )
    return () => {
      cancelled = true
    }
  }, [repository, key, version])

  const current: PacchettiState = state.key === key ? state : { error: false }
  return { ...current, reload: () => setVersion((v) => v + 1) }
}
