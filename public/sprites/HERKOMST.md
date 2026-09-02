# Sprites

Deze afbeeldingen komen uit de gratis asset-packs van Kenney (kenney.nl), allemaal
CC0 — publiek domein, geen attributie verplicht.

| Bestand | Herkomst |
|---|---|
| `kaartrug.png` | Playing Cards Pack — `card_back.png` |
| `fiche.png` | Boardgame Pack — `chipGreenWhite.png` |

De fiches in de setup en de instellingen worden **niet** met deze sprites getekend
maar als SVG (`src/components/ChipIcon.tsx`). Reden: hun kleur komt uit de chipset
die je zelf instelt, en een vaste afbeelding kan die niet volgen. De sprites
hierboven zijn decoratief.

Wil je meer Kenney-materiaal gebruiken:

- Boardgame Pack — https://kenney.nl/assets/boardgame-pack
- Playing Cards Pack — https://kenney.nl/assets/playing-cards-pack
- UI Pack — https://kenney.nl/assets/ui-pack (knoppen en panelen)
- Interface Sounds — https://kenney.nl/assets/interface-sounds

Zet de bestanden in deze map en verwijs ernaar via `sprite('naam.png')` uit
`src/sprites.ts`. Het uiterlijk van knoppen, panelen en fiches ligt vast in
`src/components/Button.tsx`, `Panel.tsx` en `ChipIcon.tsx` — dat zijn de enige
plekken die je hoeft aan te passen.

Het geluid bij een blindverhoging wordt gegenereerd met de Web Audio API
(`src/hooks/useLevelSound.ts`), niet met een geluidsbestand: dat is twee korte
tonen die boven gepraat uit komen, zonder download die kan ontbreken.
