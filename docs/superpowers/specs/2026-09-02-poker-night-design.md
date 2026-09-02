# PokerNight — ontwerp

**Datum:** 2026-09-02
**Repo:** `github.com/CavalierNL/poker-night`
**Locatie:** `D:\Development\PokerNight`

## Doel

Een webapp die een pokeravond met vrienden bestuurt: blinds timer, blindstructuur
berekenen, fiches verdelen en de prijzenpot verdelen. Eén scherm midden op tafel,
bediend door de organisator.

## Uitgangspunten

- **Eén apparaat.** Laptop of tablet op tafel. Geen backend, geen accounts, geen
  synchronisatie. De app is volledig statisch en werkt zonder internet.
- **Leesbaar vanaf de overkant van de tafel.** Grote cijfers, hoog contrast.
- **Geen invoer tijdens het spelen** behalve "iemand ligt eruit". Alles wat de app
  toont moet uit vaste gegevens af te leiden zijn.
- **Geen rebuys of add-ons.** Ze zitten niet in de app. De pot en het totaal aan
  fiches liggen daardoor vast zodra het toernooi begint. Bij de prijzenpot staat
  één regel die uitlegt wat een rebuy is en waarom de app er niet mee rekent.
  Overig pokerjargon — big blind, color-up — blijft onverklaard.

## Scope v1

In scope: blinds timer, blindstructuur-calculator, chipsetbeheer, chipverdeling,
color-up-signalering, prijzenpotverdeling, live spelersbeheer (in/uit), gemiddelde
stack, pauzeknop, wake lock, volgende-blind-preview, geluidssignaal bij verhoging.

Niet in scope: individuele chipstacks per speler, rebuys/add-ons als actieve
functie, meerdere apparaten, opslag buiten het apparaat, historie over meerdere
avonden.

## Techniek

Vite + React + TypeScript. Statische build, geen server. State in `localStorage`.
Vitest voor de rekenkern.

```
PokerNight/
├─ public/assets/            # Kenney-sprites (CC0), uitgedund
├─ src/
│  ├─ domain/                # pure TypeScript, geen React, volledig getest
│  │   ├─ chipset.ts
│  │   ├─ blinds.ts
│  │   ├─ progression.ts
│  │   ├─ payout.ts
│  │   ├─ distribution.ts
│  │   └─ tournament.ts      # reducer over de live toernooistate
│  ├─ state/                 # React-context + localStorage-persistentie
│  ├─ components/
│  ├─ screens/               # Setup · Toernooi · Instellingen
│  └─ styles/
└─ .github/workflows/deploy.yml
```

Alles in `domain/` is puur: geen DOM, geen klok, geen React. Invoer erin,
resultaat eruit. Dat is de kant waar een rekenfout de avond verpest, dus die is
volledig met unit tests afgedekt. `tournament.ts` is een reducer; de live state
verandert uitsluitend via benoemde acties (`tick`, `playerOut`, `nextLevel`,
`undo`, `pause`), zodat "de timer liep af" en "iemand ging eruit" hetzelfde
pad naar een levelverhoging delen.

## Chipset

Een chipset is een vrije lijst van fiches: `{ kleur, waarde, aantal }`. Meerdere
kleuren mogen dezelfde waarde hebben. Chipsets worden met naam opgeslagen; je kunt
er meerdere bewaren.

Twee presets:

- **Huisregel** — één kleur is 5 waard (veel exemplaren), alle overige kleuren
  zijn 1 waard. Dit is de standaardmanier van spelen.
- **Standaard set** — klassieke 500-set met oplopende denominaties
  (1 / 5 / 25 / 100 / 500), waarbij de waardes op de fiches worden gebruikt.

Een **denominatie** is een unieke waarde, ongeacht hoeveel kleuren die waarde
hebben. De huisregel-set heeft dus twee denominaties: 1 en 5.

## Betaalbare bedragen

Blinds mogen alleen bedragen zijn die zonder wisselen te leggen zijn en die er aan
tafel netjes uitzien.

Laat `d` de kleinste **actieve** denominatie zijn (actief = nog niet uit het spel
gehaald door een color-up). De kandidaatbedragen zijn `d` vermenigvuldigd met de
1-2-5-ladder: `d × {1, 2, 5, 10, 20, 50, 100, 200, 500, …}`.

Afronden gebeurt naar de dichtstbijzijnde kandidaat, met de harde eis dat elk
level strikt hoger is dan het vorige. Levert afronden een gelijk of lager bedrag
op, dan wordt de eerstvolgende kandidaat genomen.

De kleine blind is het grootste kandidaatbedrag kleiner dan of gelijk aan de helft
van de big blind, met een minimum van `d`.

## Blindstructuur: structuur × trigger

Twee onafhankelijke keuzes. Samen dekken ze elke speelwijze zonder aparte
codepaden.

### Structuur — hoe de blinds groeien

**Berekend.** Vloeiende groei met een vast eindpunt.

- `levels = floor(duur / levellengte)`
- `startBB = startstack / 100` (honderd big blinds diep beginnen)
- `eindBB = (spelers × startstack / 3) / 10` (bij drie spelers over is de
  gemiddelde stack ongeveer 10 BB)
- `factor = (eindBB / startBB) ^ (1 / (levels − 1))` — in de praktijk 1,2–1,4
- `BB(i) = startBB × factor^i`, daarna afgerond op een betaalbaar bedrag

**Verdubbelend.** `BB(i) = startBB × 2^i`, afgerond op een betaalbaar bedrag.

**Handmatig.** Eigen rij bedragen.

### Trigger — wanneer het volgende level ingaat

- **Tijd** — na de levellengte (10, 15 of 20 minuten).
- **Eliminatie** — zodra een speler eruit ligt.
- **Beide** — wat het eerst komt. Een eliminatie zet de leveltimer terug op vol.

De gebruikelijke speelwijze is *verdubbelend + beide*.

### Pauzeren

Pauzeren is een knop op het tafelscherm, geen ingepland moment. Eén druk bevriest
de leveltimer; de blinds staan stil en het scherm toont dat het toernooi
gepauzeerd is. Nog een druk laat de klok verder lopen waar hij gebleven was.

Tijdens een pauze verhoogt ook een eliminatie de blinds niet — je pauzeert nu
eenmaal omdat er niet gespeeld wordt.

De geschatte eindtijd die de setup toont is daarmee een schatting bij ononderbroken
spel; elke pauze schuift die op. Het tafelscherm rekent de verwachte eindtijd
tijdens het spelen mee met de tijd die je gepauzeerd hebt.

Bij verdubbelend met de trigger *beide* loopt de big blind hard op. De setup toont
daarom vóór de start altijd de volledige structuur met geschatte tijdlijn, plus
een waarschuwing zodra de eind-BB de gemiddelde stack overtreft.

## Color-up

De kleinste actieve denominatie `d` is overbodig zodra de kleine blind minstens
tien keer `d` bedraagt. Op dat level meldt de app welke kleur uit het spel mag en
naar welke kleur er gewisseld wordt. Daarna schuift `d` op naar de volgende
denominatie, wat meteen de afronding van latere blinds beïnvloedt.

## Chipverdeling

Invoer: chipset met aantallen, aantal spelers, gewenste startstack in waarde.

De verdeling loopt van klein naar groot en garandeert dat elke speler genoeg
kleine fiches heeft om de eerste levels te spelen — richtlijn: minstens twintig
keer de start-kleine-blind aan fiches van de kleinste denominatie. De rest van de
startstack wordt met hogere denominaties opgevuld.

Is de voorraad van een kleur ontoereikend voor het aantal spelers, dan meldt de
app dat in de setup, met het maximale aantal spelers dat wél past.

## Prijzenpot

`pot = inleg × spelers`. Verdeling naar groepsgrootte:

| Spelers | Verdeling |
|---------|-----------|
| 2–4     | 100%      |
| 5–7     | 65 / 35   |
| 8–11    | 50 / 30 / 20 |
| 12+     | 40 / 25 / 20 / 15 |

Bedragen worden naar beneden afgerond op hele euro's; het restant gaat naar de
winnaar. De som van de uitbetalingen is altijd exact de pot.

## Spelers en gemiddelde stack

Per speler wordt alleen bijgehouden of hij nog in het toernooi zit. Individuele
stacks worden **niet** bijgehouden — die kun je niet weten zonder de hele avond te
tellen.

Het totaal aan fiches in spel ligt vast: `spelers × startstack`, en verandert niet
omdat er geen rebuys zijn. Daaruit volgt zonder enige invoer:

- `gemiddelde stack = totaal / aantal spelers dat nog in het toernooi zit`
- `gemiddelde stack in BB = gemiddelde stack / huidige big blind`

## Schermen

Drie schermen, niet meer.

**Setup** — spelers, inleg, chipset, startstack, duur, levellengte, structuur en
trigger. Toont de berekende blindstructuur, de chipverdeling, de prijzenverdeling
en eventuele waarschuwingen vóór de start.

**Toernooi** — het tafelscherm. Indeling: de aftelling het grootst in het midden,
de blinds direct daaronder, daaronder in kleine letters de volgende blinds en de
gemiddelde stack in big blinds. Bovenaan een dunne balk met level, aantal spelers
en pot. Onderaan een strook met de spelers; één tik haalt iemand eruit, doorgestreept
betekent uitgeschakeld. Een pauzeknop rechtsonder, groot genoeg om zonder kijken te
raken; tijdens een pauze dimt het scherm en staat er onmiskenbaar dat er gepauzeerd
is.

**Instellingen** — chipset-editor met presets, geluid aan/uit, wake lock aan/uit.

## Visueel

Vilt en goud: donkergroen verloop als ondergrond, goud accent, serif-cijfers voor
de grote getallen. Het palet staat als CSS custom properties in één bestand, zodat
een andere skin later één bestand wisselen is.

Assets, alle CC0 en dus zonder attributieplicht:

- **Kenney UI Pack** — knoppen en panelen
- **Kenney Playing Cards Pack** — kaarten
- **Kenney Boardgame Pack** — fiches
- **Kenney Interface Sounds** — signaal bij een blindverhoging

De sprites gaan uitgedund in `public/assets` en worden aangesproken via dunne
componenten (`Button`, `Panel`, `ChipIcon`), zodat een sprite vervangen één plek
is. Het geluid bij een blindverhoging is essentieel: aan tafel wordt gepraat en
niemand kijkt naar het scherm.

## Robuustheid

**De timer telt niet op per tick.** De klok heeft twee toestanden: *lopend*, met
een opgeslagen eindtijdstip waaruit de resterende tijd volgt uit `Date.now()`, en
*gepauzeerd*, met de resterende tijd bevroren opgeslagen. Hervatten berekent een
nieuw eindtijdstip. Een refresh, een tabwissel of een laptop die even in slaap
valt verstoort de klok daardoor niet — ook niet als hij gepauzeerd was. De Screen Wake Lock API
houdt het scherm daarnaast aan, met terugval op niets als de browser dat niet
ondersteunt.

**Herstel na sluiten.** Het lopende toernooi staat in `localStorage`. Bij openen
vraagt de app of het toernooi hervat moet worden of dat er een nieuw begint.

**Undo in plaats van bevestigen.** Een speler eruit halen of een level opschuiven
gebeurt direct, met een undo-mogelijkheid. Bevestigingsdialogen zijn aan een
pokertafel hinderlijker dan een misklik.

**Fouten in de setup, niet tijdens het spel.** Te weinig fiches van een kleur, een
chipset zonder waardes, een structuur die niet in de opgegeven duur past of een
eind-BB boven de gemiddelde stack: allemaal meldingen vóór de start.

## Testen

Vitest op `domain/`. Gedekt: de berekende structuur (inclusief groeifactor en
monotonie), de verdubbelende structuur, afronden op betaalbare bedragen bij zowel
de huisregel-set als een standaardset, color-up-momenten, chipverdeling inclusief
tekortmeldingen, prijzenverdeling (de som is exact de pot), en de drie triggers in
de reducer. De UI wordt niet automatisch getest.

## Hosting

GitHub Pages op `CavalierNL/poker-night`, via een Actions-workflow die bij elke
push naar `main` bouwt en deployt. In de Vite-config staat `base: '/poker-night/'`
— zonder dat laden de assets niet, omdat Pages de site op een subpad serveert.
`.gitignore` bevat `node_modules`, `dist` en `.superpowers/`.
