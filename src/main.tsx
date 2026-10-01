import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { ConfigError } from './app/ConfigError'
import { createDataSource, parseDataMode, type DataSource } from './data'
import './index.css'

function init(): { source: DataSource } | { error: string } {
  try {
    return { source: createDataSource(parseDataMode(import.meta.env.VITE_DATA_MODE)) }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

const result = init()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {'source' in result ? <App source={result.source} /> : <ConfigError message={result.error} />}
  </StrictMode>,
)
