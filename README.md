# Fisio Made App

Gestionale per lo studio Fisio Made: clienti, pacchetti di lezioni, pagamenti, assenze e compleanni.
La specifica completa è in [`CLAUDE.md`](./CLAUDE.md).

## Comandi

```sh
npm install
npm run dev      # sviluppo (usa .env.development → VITE_DATA_MODE=mock)
npm run lint
npm run test
npm run build
```

## Modalità dati

`VITE_DATA_MODE` sceglie da dove arrivano i dati:

- `mock`: dati finti salvati nel browser (`localStorage`, chiave `fisiomade-demo`), con il banner "DEMO — dati di prova".
- `supabase`: dati reali (dal Modulo 5).

Se la variabile manca o ha un valore diverso, l'app mostra un errore di configurazione.
