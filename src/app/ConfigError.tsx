export function ConfigError({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-md px-4 pt-[calc(2rem+env(safe-area-inset-top))]">
      <h1 className="text-2xl font-bold text-danger-700">Errore di configurazione</h1>
      <p className="mt-3">{message}</p>
      <p className="mt-3 text-brand-600">
        Controlla le variabili d’ambiente su Netlify e rifai il deploy.
      </p>
    </main>
  )
}
