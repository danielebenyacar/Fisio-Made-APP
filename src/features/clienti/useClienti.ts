import { useEffect, useState } from 'react'
import { useRepository } from '../../app/dataSource'
import type { Cliente } from '../../data'

/** All clients (archived included). `clienti` is undefined while loading. */
export function useClienti(): { clienti?: Cliente[]; error: boolean } {
  const repository = useRepository()
  const [state, setState] = useState<{ clienti?: Cliente[]; error: boolean }>({ error: false })

  useEffect(() => {
    let cancelled = false
    repository.listClienti().then(
      (clienti) => !cancelled && setState({ clienti, error: false }),
      () => !cancelled && setState({ error: true }),
    )
    return () => {
      cancelled = true
    }
  }, [repository])

  return state
}

/** One client: undefined while loading, null if it does not exist. */
export function useCliente(id: string | undefined) {
  const repository = useRepository()
  const [state, setState] = useState<{ id?: string; cliente?: Cliente | null; error?: boolean }>({})

  useEffect(() => {
    if (!id) return
    let cancelled = false
    repository.getCliente(id).then(
      (cliente) => !cancelled && setState({ id, cliente }),
      () => !cancelled && setState({ id, error: true }),
    )
    return () => {
      cancelled = true
    }
  }, [repository, id])

  const current = state.id === id ? state : {}
  return {
    cliente: current.cliente,
    error: current.error ?? false,
    setCliente: (cliente: Cliente) => setState({ id: cliente.id, cliente }),
  }
}
