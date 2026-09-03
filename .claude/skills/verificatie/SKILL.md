---
name: verificatie
description: Draait de volledige controle die CI ook draait — unit tests, typecheck plus build, en de rooktest in een echte browser. Gebruik dit voordat je zegt dat iets af is, of voor een commit naar main.
disable-model-invocation: true
---

# Verificatie

Drie commando's, in deze volgorde. Stop bij de eerste die faalt en los dat op
voordat je verder gaat — de latere stappen zeggen niets zinnigs meer als een
eerdere stuk is.

## 1. Unit tests

```bash
npm test
```

Vitest over `src/**/*.test.{ts,tsx}`. Dit is de rekenkern in `src/domain/` plus
de rendertest in `src/App.test.tsx`. Snel; draai dit tussendoor zo vaak je wilt.

## 2. Typecheck en build

```bash
npm run build
```

Dit is `tsc --noEmit && vite build`. Er is geen aparte lintstap in dit project,
dus dit is de enige controle op ongebruikte variabelen, ontbrekende types en een
bundel die daadwerkelijk bouwt. Overslaan mag niet, ook niet bij een wijziging
die "alleen tekst" is.

## 3. Rooktest in de browser

```bash
npm run test:e2e
```

Let op: dit duurt minuten. Playwright bouwt zelf en start een previewserver op
poort 4173 onder dezelfde base als GitHub Pages (`/PokerNight/`), juist om een
padfout te vinden die lokaal op `/` onzichtbaar blijft. Hij hergebruikt bewust
geen draaiende server, dus zorg dat poort 4173 vrij is.

Zonder `PAGE_URL` test hij die lokale previewbuild. In CI vult de
deploy-workflow `PAGE_URL` met de echte Pages-URL en draait dezelfde test tegen
de gepubliceerde site.

## Rapporteren

Zeg pas dat het werkt als alle drie geslaagd zijn, en zeg welke je gedraaid
hebt. Sloeg je de rooktest over omdat de wijziging hem niet kan raken, zeg dan
dat je hem hebt overgeslagen — niet dat alles groen is.
