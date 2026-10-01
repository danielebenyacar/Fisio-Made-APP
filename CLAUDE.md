# CLAUDE.md — Fisio Made App

Questo file è la specifica del progetto. Leggilo per intero all'inizio di ogni sessione e rispetta le decisioni qui sotto. Se una richiesta è in conflitto con questo file, chiedi prima di procedere.

## 1. Contesto

- App gestionale per lo studio di fisio-posturale-yoga **Fisio Made** (sito pubblico: fisiomade.it, separato da questa app).
- **Unica utente**: la titolare. Usa l'app **dal telefono**, dimestichezza tecnologica media.
- Vende lezioni in **pacchetti prepagati**. Problema da risolvere: tenere traccia di pagamenti, lezioni fatte/rimaste, rinnovi, scadenze, assenze, compleanni.
- **Fisio**: sedute individuali da 1 ora, vendute a pacchetti di sedute. La prima seduta è la **valutazione posturale**, a prezzo ridotto.
- **Yoga e posturale**: corsi di gruppo a orari fissi, più gruppi a settimana. Si vendono **abbonamenti** (es. mensile, trimestrale) che danno diritto a **1 lezione a settimana**; il cliente sceglie ogni settimana a quale gruppo venire.
- I clienti NON usano l'app. Ricevono il riepilogo via WhatsApp (link `wa.me` precompilato).
- Tutta l'interfaccia è **in italiano**. Codice, nomi di file e variabili in inglese.

## 2. Stack

- React + Vite + TypeScript + Tailwind CSS
- PWA installabile (`vite-plugin-pwa`), mobile-first
- Routing: `react-router-dom`
- Date: `date-fns` con locale `it`, timezone di riferimento Europe/Rome
- Backend: Supabase (Postgres + Auth), regione UE
- Hosting: Netlify, collegato al repo GitHub
- Test: Vitest (unit test obbligatori sulla logica in `src/lib/`)

## 3. Workflow (IMPORTANTE)

Lo sviluppatore lavora **solo da iPad**: nessun ambiente locale. Tutto passa da Claude Code in cloud + deploy preview Netlify.

- **Mai push diretto su `main`.** Ogni modulo = un branch `modulo-N-nome` = una PR.
- Prima di ogni push devono passare: `npm run lint && npm run test && npm run build`.
- Ogni PR ha una descrizione in italiano con la sezione **"Come testare sul preview"**: checklist di azioni concrete da fare dal telefono (es. "Apri Clienti → tocca Maria Rossi → verifica badge 8/10").
- Il merge su `main` lo fa solo lo sviluppatore, dopo aver testato il preview. Ogni deploy in produzione consuma crediti Netlify: niente commit "di prova" su `main`.
- Se lo sviluppatore incolla un log di build Netlify, correggi sulla stessa PR.

## 4. Modalità dati: mock vs supabase

L'app ha un livello dati astratto con due implementazioni, scelte da `VITE_DATA_MODE`:

- `mock`: dati finti in memoria, persistiti in `localStorage` (chiave `fisiomade-demo`). Nessuna chiamata di rete. Banner fisso in alto **"DEMO — dati di prova"**. In "Altro" c'è il pulsante **"Reimposta dati demo"**.
- `supabase`: dati reali, login obbligatorio.

Regole:
- I componenti UI non importano mai Supabase direttamente: usano solo l'interfaccia `Repository` da `src/data/`.
- Se `VITE_DATA_MODE` non è valorizzata o è sconosciuta, l'app mostra un errore esplicito (nessun fallback silenzioso a mock in produzione).
- **Mai usare dati reali di clienti** in seed, test, screenshot o PR. Sono dati sanitari (GDPR).
- Fino al Modulo 5 anche la produzione gira in `mock` (così c'è un link stabile da mostrare). Il Modulo 5 cambia la produzione in `supabase`.

`netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[context.production.environment]
  VITE_DATA_MODE = "mock"   # diventa "supabase" nel Modulo 5

[context.deploy-preview.environment]
  VITE_DATA_MODE = "mock"

[context.branch-deploy.environment]
  VITE_DATA_MODE = "mock"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` si impostano dalla UI di Netlify solo per il contesto production (non nel repo).

### Dati seed (mock)

Circa 15 clienti finti con nomi italiani plausibili. Devono coprire tutti gli scenari, calcolati **relativi alla data odierna** (non date fisse):

- pacchetto con 0 lezioni residue (esaurito)
- pacchetto con 1 e con 2 residue (da rinnovare)
- pacchetto non pagato
- abbonamento in scadenza (entro 7 giorni), abbonamento scaduto senza rinnovo, abbonamento con settimane perse
- valutazione posturale seguita da un pacchetto di sedute; cliente senza alcun pacchetto
- listino con almeno un tipo per disciplina e un tipo non in vendita
- cliente senza lezioni da più di 14 giorni (assente)
- compleanno oggi, tra 2 giorni, tra 3 giorni (alert) e tra 5 giorni (NON in alert)
- cliente con pacchetto nuovo acquistato mentre il vecchio ha ancora residue
- cliente con un'assenza registrata (verifica che non scali le residue)
- cliente senza telefono (il pulsante WhatsApp deve essere disabilitato)
- cliente archiviato
- cliente senza consenso privacy
- clienti con una, due, tre discipline e senza disciplina
- clienti "normali" senza alert

## 5. Modello dati

```ts
type Disciplina = 'fisio' | 'posturale' | 'yoga'

type Cliente = {
  id: string
  nome: string
  cognome: string
  discipline: Disciplina[]   // zero, una o più (es. fisio + yoga)
  telefono?: string          // salvato in formato E.164, es. +393331234567
  email?: string
  dataNascita?: string       // YYYY-MM-DD
  note?: string
  consensoPrivacy: boolean
  consensoData?: string      // YYYY-MM-DD
  archiviato: boolean
  createdAt: string
}

type ModalitaPacchetto = 'sedute' | 'abbonamento'

type TipoPacchetto = {       // voce del listino, modificabile dalla titolare
  id: string
  nome: string               // es. "10 sedute fisio", "Yoga mensile"
  disciplina: Disciplina
  modalita: ModalitaPacchetto
  lezioni?: number           // solo 'sedute'
  durataMesi?: number        // 'abbonamento': durata (obbligatoria); 'sedute': validità facoltativa
  prezzo?: number            // euro
  attivo: boolean            // false = non in vendita (resta nello storico)
  createdAt: string
}

type Pacchetto = {           // pacchetto o abbonamento venduto a un cliente
  id: string
  clienteId: string
  tipoId?: string            // voce del listino da cui è nato (i dati vengono copiati)
  nome: string
  disciplina: Disciplina
  modalita: ModalitaPacchetto
  lezioniTotali?: number     // solo 'sedute': tagli liberi (es. 1, 5, 10)
  dataInizio: string         // YYYY-MM-DD
  scadenza?: string          // YYYY-MM-DD, ultimo giorno valido; obbligatoria per 'abbonamento'
  prezzo?: number            // euro
  pagato: boolean
  dataPagamento?: string
  dataAcquisto: string
  note?: string
  createdAt: string
}

type Lezione = {
  id: string
  pacchettoId: string
  clienteId: string
  disciplina: Disciplina     // uguale a quella del pacchetto
  data: string               // ISO datetime
  stato: 'fatta' | 'assente' // default 'fatta'
  note?: string
  createdAt: string
}
```

Regole derivate (funzioni pure in `src/lib/`, con unit test):
- **Sedute**: `residue = lezioniTotali - numero lezioni con stato 'fatta' del pacchetto`. Se c'è una scadenza, dopo quella data il pacchetto è scaduto.
- **Abbonamento**: copre le settimane (lunedì–domenica) tra `dataInizio` e `scadenza`; ogni settimana dà diritto a 1 lezione. Settimana con una lezione fatta = "fatta"; settimana passata senza lezione = **"persa"** (si recupera solo nella stessa settimana); le altre = "da fare". `residue` = settimane da fare. Scadenza di default: inizio + N mesi − 1 giorno (1/10 → 31/10).
- Una nuova lezione scala dal **pacchetto più vecchio con residue > 0 della stessa disciplina** (FIFO, ordine `dataInizio`).
- Se il cliente non ha pacchetti con residue per quella disciplina, "Segna lezione" chiede di creare prima un pacchetto (non si va in negativo).
- **Le assenze NON scalano le sedute.** Si registrano solo per storico (stato `'assente'`), non toccano le residue né il badge `x/y`. Negli abbonamenti un'assenza non recuperata in settimana fa perdere la settimana.
- Il calcolo delle residue sta in un'unica funzione (`residue()` in `src/lib/packages.ts`).
- Vendere un pacchetto di una disciplina che il cliente non ha aggiunge quella disciplina al cliente.
- Un pacchetto con lezioni registrate non si può eliminare.

Fuori scope per ora: incassi, fatture, report economici. Non costruirli e non aggiungere tabelle per questi.

## 6. Regole degli alert (schermata "Oggi")

Funzioni pure in `src/lib/alerts.ts`, testate con date fittizie iniettate (mai `new Date()` dentro la logica).

| Alert | Condizione | Priorità |
|---|---|---|
| Pacchetto esaurito / scaduto | pacchetto più recente della disciplina con residue = 0 o scaduto, e nessun pacchetto successivo | 1 |
| Non pagato | qualsiasi pacchetto con `pagato = false` | 2 |
| Da rinnovare / in scadenza | pacchetto più recente con residue 1 o 2 (sedute) o che scade entro **7 giorni**, e nessun pacchetto successivo | 3 |
| Assente | cliente con residue > 0 e nessuna lezione negli ultimi 14 giorni | 4 |
| Compleanno | compleanno tra oggi e i prossimi **3 giorni** inclusi | 5 |

- I clienti archiviati non generano alert.
- Compleanno del 29 febbraio: negli anni non bisestili si festeggia il 28 febbraio.
- Ogni alert ha un pulsante d'azione: "Nuovo pacchetto", "Segna pagato", "Scrivi" (WhatsApp), "Auguri" (WhatsApp).

## 7. WhatsApp

Link: `https://wa.me/<numero senza +>?text=<testo url-encoded>`. Funzioni in `src/lib/whatsapp.ts`, con unit test.

- Normalizzazione numero: rimuovi spazi e simboli; se manca il prefisso, aggiungi `+39`.
- Template riepilogo lezione:
  `Ciao {nome}! Lezione di oggi registrata ✅ Hai fatto {fatte} lezioni su {totali}, te ne restano {residue}.`
  Se residue ≤ 2 aggiungi: `Il pacchetto sta per finire, ne parliamo alla prossima lezione 😊`
- Template auguri: `Tanti auguri {nome}! 🎉 Un abbraccio da Fisio Made.`
- I template stanno in un unico file di costanti, così sono facili da modificare.

## 8. UX e design

- Mobile-first, layout pensato per 375px di larghezza. Testo base minimo 16px, target touch minimo 48px.
- Navigazione in basso fissa: **Oggi · Clienti · [+] · Altro**. Il "+" centrale è "Segna lezione".
- Azioni frequenti in massimo 2 tap. "Segna lezione": scegli cliente (con ricerca) → conferma.
- Dopo "Segna lezione": toast con **"Annulla"** per 5 secondi, poi proposta di inviare il WhatsApp di riepilogo.
- Azioni distruttive (elimina, archivia) sempre con conferma.
- Lista clienti: ricerca per nome/cognome, tab colorate per disciplina (Tutti · Fisio · Posturale · Yoga; un cliente con più discipline compare in ogni tab), un badge per disciplina con lo stato del pacchetto in uso (`Fisio 8/10` = fatte/totali, `Yoga al 31 ott` = scadenza), giallo se da rinnovare/in scadenza, rosso se esaurito/scaduto, più "Da pagare".
- Scheda cliente: sezione Pacchetti con i pacchetti in uso (avanzamento, pallini delle settimane per gli abbonamenti, "Segna pagato"), storico richiudibile, "Nuovo" che parte dal listino.
- Discipline: ogni disciplina ha un colore (token `fisio-*`, `posturale-*`, `yoga-*` in `tailwind.config`). Si attivano con pulsanti colorati nel form e nel dettaglio cliente.
- Linguaggio semplice, niente termini tecnici. Date in formato italiano (`3 ott`, `03/10/2026`).
- Palette: riprendere i colori di fisiomade.it. TODO: inserire i codici hex in `tailwind.config` come token `brand-*`. Fino ad allora usa token placeholder neutri, non colori inventati sparsi nel codice.
- Supporto dark mode non richiesto.

## 9. Struttura del progetto

```
src/
  app/            # routing, layout, bottom nav
  features/
    oggi/
    clienti/
    pacchetti/    # listino, pacchetti del cliente
    lezioni/
    agenda/       # corsi e appuntamenti (M3)
    altro/        # import, listino, dati demo
  components/     # UI riutilizzabile (Button, Card, Badge, Toast, Sheet)
  data/
    types.ts
    repository.ts         # interfaccia Repository
    mock/                 # seed.ts, mockRepository.ts
    supabase/             # supabaseRepository.ts, client.ts
    index.ts              # sceglie l'implementazione da VITE_DATA_MODE
  lib/            # alerts.ts, packages.ts, whatsapp.ts, dates.ts (+ test)
supabase/
  migrations/     # SQL da eseguire nel SQL editor di Supabase
netlify.toml
```

## 10. Moduli (un modulo = una PR)

Si costruisce a moduli per poter mostrare alla titolare l'avanzamento passo per passo. Fai solo il modulo richiesto.

- **M0 — Setup**: progetto Vite/React/TS/Tailwind, lint, Vitest, `netlify.toml`, layout con bottom nav (schermate vuote), livello dati con interfaccia + mock repository + seed, banner DEMO, "Reimposta dati demo".
- **M1 — Clienti**: lista con ricerca e tab per disciplina, dettaglio cliente, crea/modifica/archivia, campo consenso privacy, discipline colorate, import clienti da Excel (vedi §12).
- **M2 — Pacchetti e abbonamenti**: listino modificabile (Altro → Listino), nuovo pacchetto dal dettaglio cliente partendo dal listino, segna pagato, calcolo residue e settimane, scadenze con avvisi nella scheda, badge nella lista, storico pacchetti.
- **M3 — Agenda e presenze**: corsi di gruppo settimanali (yoga, posturale) e sedute fisio individuali da 1 ora (la prima è la valutazione); vista agenda; segna presenza/assenza dall'agenda e dal "+"; regola FIFO per disciplina e regola settimanale; toast Annulla; WhatsApp di riepilogo; storico lezioni nel dettaglio cliente.
- **M4 — Oggi**: alert con priorità e pulsanti d'azione, appuntamenti del giorno, auguri WhatsApp.
- **M5 — Supabase**: migration SQL (tabelle, vincoli, indici), Row Level Security che consente accesso solo all'utente autenticato, login email+password, supabase repository, cambio di `VITE_DATA_MODE` in produzione. Il SQL va in `supabase/migrations/` e lo sviluppatore lo esegue a mano nel SQL editor.
- **M6 — Google Calendar**: sincronizzazione **bidirezionale** con un calendario dedicato "Fisio Made" nel Google della titolare (appuntamenti e corsi dall'app → Google; spostamenti e cancellazioni fatti su Google → app). Gli altri impegni del suo Google si leggono solo come "occupato" per evitare sovrapposizioni. Richiede Supabase (Edge Functions per OAuth e sync) e un progetto Google Cloud con OAuth.
- **M7 — Valutazione posturale**: scheda di valutazione nel dettaglio cliente fisio (anamnesi, osservazione posturale fronte/lato/retro, test, obiettivi, piano, foto facoltative) con export PDF in stile Fisio Made (servono logo e colori del sito).
- **M8 — Rifinitura**: installazione PWA (icona, nome "Fisio Made"), stati vuoti, GitHub Actions per keep-alive di Supabase (ping ogni 3 giorni) e backup settimanale.

Fase 2 (non ora): messaggi di auguri semi-automatici.

## 11. Sicurezza e privacy

- Nessuna chiave o dato reale nel repo. Solo la anon key di Supabase in variabili Netlify.
- RLS attiva su tutte le tabelle, nessuna tabella accessibile senza login. Registrazioni pubbliche disabilitate.
- Nessun analytics o tracker di terze parti.
- Nessun log in console di dati dei clienti.

## 12. Import clienti da Excel

- Dentro l'app: Altro → "Importa da Excel" (anche dal fondo della lista Clienti). Il file reale resta sul telefono: non passa mai dal repo né da Claude.
- Formato `.xlsx`, primo foglio. La prima riga contiene i titoli delle colonne; obbligatorie **Nome** e **Cognome**, facoltative Telefono, Email, Data di nascita, Discipline, Note, Consenso privacy (sono riconosciuti anche sinonimi, es. Cellulare, Attività, Nato il).
- Prima di salvare c'è sempre un'anteprima: clienti da importare (con avvisi sui valori scartati), già presenti (stesso nome e cognome, saltati), righe non importabili.
- Logica in `src/lib/importClienti.ts` (funzione pura, con test). File di esempio con dati finti: `public/esempio-clienti.xlsx`, scaricabile dalla schermata di import.
