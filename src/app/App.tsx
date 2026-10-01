import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import type { DataSource } from '../data'
import { AltroPage } from '../features/altro/AltroPage'
import { ImportaClientiPage } from '../features/altro/ImportaClientiPage'
import { ClienteDetailPage } from '../features/clienti/ClienteDetailPage'
import { ClienteFormPage } from '../features/clienti/ClienteFormPage'
import { ClientiPage } from '../features/clienti/ClientiPage'
import { SegnaLezionePage } from '../features/lezioni/SegnaLezionePage'
import { OggiPage } from '../features/oggi/OggiPage'
import { ListinoPage } from '../features/pacchetti/ListinoPage'
import { PacchettoFormPage } from '../features/pacchetti/PacchettoFormPage'
import { TipoPacchettoFormPage } from '../features/pacchetti/TipoPacchettoFormPage'
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
      { path: 'clienti/:id/pacchetti/nuovo', element: <PacchettoFormPage /> },
      { path: 'clienti/:id/pacchetti/:pacchettoId', element: <PacchettoFormPage /> },
      { path: 'segna-lezione', element: <SegnaLezionePage /> },
      { path: 'altro', element: <AltroPage /> },
      { path: 'altro/importa', element: <ImportaClientiPage /> },
      { path: 'altro/listino', element: <ListinoPage /> },
      { path: 'altro/listino/nuovo', element: <TipoPacchettoFormPage /> },
      { path: 'altro/listino/:tipoId', element: <TipoPacchettoFormPage /> },
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
