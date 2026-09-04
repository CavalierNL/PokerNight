# Sprites

Deze afbeeldingen komen uit de gratis asset-packs van
[Kenney](https://kenney.nl), allemaal CC0 — publiek domein, geen attributie
verplicht.

| Bestand | Herkomst |
|---|---|
| `fiche.png` | [Boardgame Pack](https://kenney.nl/assets/boardgame-pack) — `chipGreenWhite.png` |

Meer dan dit ene bestand gebruikt de app niet: het is het favicon in de
browsertab. Alles wat op het scherm staat is getekend in plaats van geladen. De
fiches (`src/components/ChipIcon.tsx`) krijgen hun kleur en waarde uit de doos
die je zelf instelt, en de twee kaarten in de kop
(`src/components/PlayingCard.tsx`) worden bij elke reload opnieuw getrokken —
allebei dingen die een vast plaatje niet kan volgen.

Wil je meer Kenney-materiaal gebruiken:

- Boardgame Pack — https://kenney.nl/assets/boardgame-pack
- Playing Cards Pack — https://kenney.nl/assets/playing-cards-pack
- UI Pack — https://kenney.nl/assets/ui-pack (knoppen en panelen)
- Interface Sounds — https://kenney.nl/assets/interface-sounds

Zet de bestanden in deze map en verwijs ernaar met een pad dat begint bij
`import.meta.env.BASE_URL` — GitHub Pages serveert de site onder het reponaam, en
een pad dat met `/` begint komt dan op de domeinroot uit. Het uiterlijk van
knoppen, panelen, fiches en kaarten ligt vast in `src/components/` — dat zijn de
enige plekken die je hoeft aan te passen.

Het geluid bij een blindverhoging wordt gegenereerd met de Web Audio API
(`src/audio/blindToon.ts`), niet met een geluidsbestand: twee korte tonen die
boven gepraat uit komen, zonder download die kan ontbreken.
