# PokerNight

Tooling voor een pokeravond met vrienden: blinds timer, blindstructuur, fiches
verdelen en de prijzenpot verdelen. Eén scherm midden op tafel, verder niets
nodig — geen backend, geen account, werkt offline.

## Wat het doet

- **Blindstructuur** — verdubbelend of vloeiend berekend, afgerond op bedragen
  die je met jouw fiches kunt leggen. De big blind is altijd exact het dubbele
  van de kleine blind.
- **Twee manieren om levels op te schuiven** — op de klok, als er iemand uit gaat,
  of allebei. Die laatste is de huisregel.
- **Chipsets** — vrij in te stellen: kleur, waarde, aantal in de doos. Meerdere
  kleuren mogen dezelfde waarde hebben, dus het systeem "één kleur is 5, de rest
  is 1" werkt gewoon. De app rekent uit wat iedereen bij aanvang krijgt en
  waarschuwt als de doos te klein is.
- **Color-up** — meldt op welk level de kleinste kleur uit het spel mag.
- **Prijzenpot** — verdeling naar groepsgrootte, in hele euro's, altijd exact de
  pot.
- **Aan tafel** — pauzeknop, ongedaan maken, gemiddelde stack in big blinds,
  hoe laat je naar verwachting klaar bent, geluid bij een blindverhoging, en het
  scherm blijft aan.
- **Robuust** — de klok overleeft een refresh of een slapende laptop, een lopend
  toernooi wordt hersteld bij het openen, en als de opslag van je browser vol of
  geblokkeerd is zegt de app dat in plaats van het stil te laten mislukken.

## Ontwikkelen

```bash
npm install
npm run dev      # ontwikkelserver
npm test         # unit tests op de rekenkern
npm run build    # statische build in dist/
```

## Opzet

`src/domain/` bevat alle rekenlogica als pure TypeScript: geen React, geen DOM,
geen klok. Tijd komt altijd als parameter binnen. Dat is de enige harde
architectuurregel — een fout in de blindberekening verpest een avond, dus die
kant is volledig getest.

Daarboven ligt een dunne React-schil: een reducer met `localStorage`-opslag en
drie schermen (setup, tafel, instellingen). De klok telt nooit op per tick maar
wordt afgeleid uit een opgeslagen eindtijdstip, zodat een refresh of een slapende
laptop hem niet verstoort.

## Ontwerp

- Ontwerp: `docs/superpowers/specs/2026-09-02-poker-night-design.md`
- Implementatieplan: `docs/superpowers/plans/2026-09-02-poker-night.md`
- Herkomst van de afbeeldingen: `public/sprites/HERKOMST.md` (Kenney, CC0)
