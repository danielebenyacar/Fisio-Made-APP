import { createContext, use } from 'react'
import type { DataSource, Repository } from '../data'

export const DataSourceContext = createContext<DataSource | null>(null)

export function useDataSource(): DataSource {
  const source = use(DataSourceContext)
  if (!source) throw new Error('DataSourceContext mancante')
  return source
}

export function useRepository(): Repository {
  return useDataSource().repository
}
