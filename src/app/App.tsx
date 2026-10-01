import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import type { DataSource } from '../data'
import { AltroPage } from '../features/altro/AltroPage'
import { ImportaClientiPage } from '../features/altro/ImportaClientiPage'
import { ClienteDetailPage } from '../features/clienti/ClienteDetailPage'
import { ClienteFormPage } from '../features/clienti/ClienteFormPage'
import { ClientiPage } from '../features/clienti/ClientiPage'
import { SegnaLezionePage } from '../features/lezioni/SegnaLezionePage'
import { OggiPage } from '../features/oggi/OggiPage'
import { DataSourceContext } from './dataSource'
import { Layout } from './Layout'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <OggiPage /> },
      { path: 'clienti', element: <ClientiPage /> },
      { path: 'clienti/nuovo', element: <ClienteFormPage /> },
      { path: 'clienti/:id', element: <ClienteDetailPage /> },
      { path: 'clienti/:id/modifica', element: <ClienteFormPage /> },
      { path: 'segna-lezione', element: <SegnaLezionePage /> },
      { path: 'altro', element: <AltroPage /> },
      { path: 'altro/importa', element: <ImportaClientiPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export function App({ source }: { source: DataSource }) {
  return (
    <DataSourceContext value={source}>
      <RouterProvider router={router} />
    </DataSourceContext>
  )
}
