import { useEffect, useState } from 'react'
import { useRepository } from '../../app/dataSource'
import type { Corso } from '../../data'

/** All weekly classes. `corsi` is undefined while loading. */
export function useCorsi(): { corsi?: Corso[]; error: boolean } {
  const repository = useRepository()
  const [state, setState] = useState<{ corsi?: Corso[]; error: boolean }>({ error: false })

  useEffect(() => {
    let cancelled = false
    repository.listCorsi().then(
      (corsi) => !cancelled && setState({ corsi, error: false }),
      () => !cancelled && setState({ error: true }),
    )
    return () => {
      cancelled = true
    }
  }, [repository])

  return state
}
