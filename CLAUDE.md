# PokerNight

Blinds-timer en chipverdeling voor een pokeravond. React + TypeScript, Vite,
statisch gepubliceerd op GitHub Pages. Geen backend, geen account.

## Commando's

```bash
npm run dev       # ontwikkelserver
npm test          # vitest, alleen src/**/*.test.{ts,tsx}
npm run build     # tsc --noEmit én vite build — dit is de typecheck
npm run test:e2e  # bouwt zelf + previewserver op :4173, duurt minuten
```

Er is geen linter of formatter. `tsc --strict` (met `noUnusedLocals` en
`noUnusedParameters`) is de enige geautomatiseerde controle op stijl. Draai
`npm run build` dus ook als je niets aan de bundel verandert.

## Architectuur

`src/domain/` is pure TypeScript: geen React, geen DOM, geen `Date.now()`. Tijd
komt altijd als parameter binnen — de aanroeper in `src/screens/` of
`src/state/` haalt `Date.now()` op en geeft die door. Dit is de enige harde
regel; een fout in de blindberekening verpest een avond, dus die kant is
volledig getest.

Daarboven: `src/state/AppState.tsx` (context + reducer + localStorage),
`src/screens/` (setup, tafel, instellingen, chipsets), `src/components/`
(presentatie), `src/hooks/` (klok, wake lock, geluid, installatieprompt).

De klok telt nooit op per tick maar wordt afgeleid uit een opgeslagen
eindtijdstip, zodat een refresh of een slapende laptop hem niet verstoort.

## Taal

Commentaar, documentatie en commitberichten zijn Nederlands. Pokerjargon blijft
Engels (`smallBlind`, `bigBlind`, `colorUp`, `chipset`, `startingStack`); de rest
van de namen is Nederlands (`groeiPerLevel`, `kanColorUp`, `rondBedrag`). Geen
puntkomma's, enkele aanhalingstekens.

## Let op

- Verandert de vorm van iets dat in localStorage staat, verhoog dan
  `OPSLAG_VERSIE` in `src/state/storage.ts`. Zonder die bump crasht de app bij
  iedereen met een lopend toernooi na een deploy.
- `base` in `vite.config.ts` wordt afgeleid uit `GITHUB_REPOSITORY`. Lokaal is
  die leeg en draait de site op `/`; de e2e-test bootst de Pages-base juist na,
  dus een padfout faalt daar en niet pas na publicatie.
- `dist/` is een buildartefact en staat in `.gitignore` — nooit bewerken.
- Nieuwe rekenlogica hoort in `src/domain/` met een `.test.ts` ernaast, niet in
  een component.
