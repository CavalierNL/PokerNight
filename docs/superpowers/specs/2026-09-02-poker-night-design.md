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
│  │   ├─ amounts.ts         # afronden op betaalbare bedragen
│  │   ├─ blinds.ts          # structuur en color-up
│  │   ├─ payout.ts
│  │   ├─ distribution.ts
│  │   ├─ warnings.ts
│  │   ├─ setup.ts           # de hele setup-berekening als één pure functie
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
gehaald door een color-up). Een bedrag is betaalbaar als het een veelvoud van `d`
is; het is bovendien *netjes* als het op een ronde stap ligt die met de grootte
van het bedrag meeschaalt.

De afrondstap is een tiende van de eigen grootteorde van het bedrag, met de
eenheid als ondergrens, en wordt daarna zelf op een veelvoud van die eenheid
gezet: `stap = max(e, rond(10^(⌊log10(bedrag)⌋ − 1) / e) × e)`. Zonder die tweede
stap is de uitkomst een veelvoud van de grootteorde maar niet van de fichewaarde —
bij fiches van 3 zou 102 op 100 uitkomen, en 100 kun je met fiches van 3 niet
leggen.

Blinds worden afgerond met eenheid `e = 2d`, zodat de big blind een even veelvoud
van de fichewaarde is en de kleine blind er exact de helft van. Afronden op `d`
zelf levert paren als 30/65 op.

Afronden gaat naar het dichtstbijzijnde veelvoud van de stap, met de harde eis dat
elk level strikt hoger is dan het vorige; komt de afronding niet boven het vorige
level uit, dan gaat er een stap bij tot dat wel zo is.

Zo wordt 124 afgerond op 120 en 2677 op 2700. Een vaste 1-2-5-ladder — een eerdere
versie van deze spec — voldoet niet: bij fiches van 1 en blinds rond de 100 laat
die alleen 100, 200 en 500 toe, waardoor een berekende structuur binnen drie
levels ontspoort.

De big blind van het eerste level is minstens `2d`, anders bestaat er geen kleine
blind die er strikt onder ligt. De kleine blind is het grootste veelvoud van `d`
dat niet boven de helft van de big blind uitkomt, met een minimum van `d` — bij
afronding op `2d` komt daar exact de helft uit.

## Blindstructuur: structuur × trigger

Twee onafhankelijke keuzes. Samen dekken ze elke speelwijze zonder aparte
codepaden.

### Structuur — hoe de blinds groeien

**Berekend.** Vloeiende groei met een vast eindpunt.

- `levels = floor(duur / levellengte)`, minimaal 2
- `startBB = max(startstack / 100, 2d)` (honderd big blinds diep beginnen)
- `eindBB = (spelers × startstack / 3) / 10` (bij drie spelers over is de
  gemiddelde stack ongeveer 10 BB)
- `factor = (eindBB / startBB) ^ (1 / (levels − 1))` — in de praktijk 1,2–1,4
- `BB(i) = startBB × factor^i`, daarna afgerond op een betaalbaar bedrag

De reeks stopt zodra de big blind het eindpunt haalt. Bij een kleine startstack
nadert de factor 1, en dan duwt de afronding elk level een volle stap omhoog;
zonder dat afkappen schiet de structuur haar eigen doel met een veelvoud voorbij —
gemeten tot een factor 60.

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
een waarschuwing als de gemiddelde stack al in de eerste helft van de geplande
levels onder tien big blinds zakt — dan is het toernooi feitelijk beslist voordat
de opgegeven duur om is. De waarschuwing baseren op "de eind-BB overtreft de
gemiddelde stack" heeft geen zin: bij verdubbelen is dat altijd zo, dus stond hij
permanent in beeld en verloor hij zijn signaalwaarde.

## Color-up

De kleinste actieve denominatie `d` is overbodig zodra de kleine blind minstens
tien keer `d` bedraagt. Op dat level meldt de app welke kleur uit het spel mag en
naar welke kleur er gewisseld wordt. Daarna schuift `d` op naar de volgende
denominatie, wat meteen de afronding van latere blinds beïnvloedt.

## Chipverdeling

Invoer: chipset met aantallen, aantal spelers, gewenste startstack in waarde.

De verdeling loopt van klein naar groot en probeert elke speler genoeg kleine
fiches te geven om de eerste levels te spelen — richtlijn: minstens twintig keer
de start-kleine-blind. De rest van de startstack wordt met hogere denominaties
opgevuld.

Twee dingen zijn hier essentieel:

- **Denominaties die op level 0 al door een color-up van tafel gaan, worden niet
  uitgedeeld.** Bij een startstack van 10.000 beginnen de blinds op 50/100 en zijn
  fiches van 1 meteen overbodig; zonder deze regel reserveert de app er duizend
  per speler en blokkeert hij de start. In de praktijk was alleen de
  standaardwaarde 100 speelbaar.
- **De richtlijn is een richtlijn.** Minder kleine fiches dan aanbevolen levert een
  waarschuwing op, geen blokkade — je moet dan hooguit een keer wisselen. Alleen
  een doos die de gevraagde startstack niet haalt blokkeert echt, want dan klopt
  de gemiddelde stack op het tafelscherm niet meer. Die melding noemt wat er wél
  haalbaar is.

Is de voorraad van een kleur ontoereikend voor het aantal spelers, dan meldt de
app dat in de setup, met het maximale aantal spelers dat wél past.

## Prijzenpot

`pot = afgerond naar beneden(inleg × spelers)`. Naar beneden, want de inleg mag in
halve euro's: bij € 7,50 × 5 zit er € 37,50 in de doos en wordt er € 37 verdeeld.
Naar boven afronden zou € 38 uitkeren uit een kas die dat niet heeft.

Verdeling naar groepsgrootte:

| Spelers | Verdeling |
|---------|-----------|
| 2–4     | 100%      |
| 5–7     | 65 / 35   |
| 8–11    | 50 / 30 / 20 |
| 12+     | 40 / 25 / 20 / 15 |

Bedragen worden naar beneden afgerond op hele euro's; het restant gaat naar de
winnaar. De som van de uitbetalingen is altijd exact de pot, en nooit meer dan er
is opgehaald.

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

Per tick schuift er hoogstens één level op. Slaapt de laptop drie levels lang, dan
gaan de blinds één level omhoog en begint dat level opnieuw — gemiste levels worden
bewust niet ingehaald, want er is in die tijd ook niet gespeeld.

**Herstel na sluiten.** Het lopende toernooi staat in `localStorage`, met een
versienummer. Bij openen vraagt de app of het toernooi hervat moet worden of dat er
een nieuw begint. Wat is opgeslagen wordt op vorm gecontroleerd voordat het als
toernooi geldt: een record uit een oudere versie van de app wordt genegeerd in
plaats van als geldig aangenomen. Zonder die controle crasht het tafelscherm op de
eerste render, en omdat het kapotte record blijft staan geeft elke volgende refresh
opnieuw een wit scherm. Een error boundary biedt daarnaast altijd de uitweg om de
opgeslagen toestand te wissen.

De undo-geschiedenis wordt niet opgeslagen; die hoeft een refresh niet te
overleven, en meeschrijven betekende twintig kopieën van dezelfde blindstructuur
bij elke wijziging.

**Mislukt opslaan wordt gemeld.** Is de opslag vol of geblokkeerd, dan toont het
scherm dat het toernooi niet bewaard wordt. Stil doorgaan betekent dat iemand het
pas merkt als hij ververst en de hele avond kwijt is.

**Undo in plaats van bevestigen — behalve bij stoppen.** Een speler eruit halen of
een level opschuiven gebeurt direct, met een undo-mogelijkheid. Bevestigingsdialogen
zijn aan een pokertafel hinderlijker dan een misklik. Het toernooi stoppen is het
enige wat niet terug te draaien is, en die knop staat naast een pauzeknop die je
zonder kijken moet kunnen raken; die vraagt dus wel om bevestiging.

Undo zet de klok terug ten opzichte van *nu*, niet ten opzichte van het moment van
de snapshot. Een bewaard eindtijdstip veroudert namelijk: zonder die correctie
zette undo van een levelovergang een klok terug die al afgelopen was, waarna de
eerstvolgende tick het level meteen weer verhoogde — en deed ongedaan maken in de
praktijk niets. Gepauzeerde tijd die echt verstreken is wordt niet teruggedraaid.

**Fouten in de setup, niet tijdens het spel.** Een doos die de startstack niet
haalt, een lege startstack of inleg, een chipset zonder bruikbare waardes, een duur
waar geen twee levels in passen: allemaal meldingen vóór de start. De hele
setup-berekening staat als één pure functie in `domain/setup.ts`, zodat die keten
te testen is zonder een scherm te renderen — juist de samenhang tussen de modules
is waar het misging.

## Testen

Vitest op `domain/` en `state/storage.ts`. Gedekt: de structuren (berekend,
verdubbelend, handmatig) inclusief monotonie en het eindpunt, afronden op
betaalbare bedragen — óók bij chipsets met vreemde waardes als 3 en 20 —,
color-up-momenten, chipverdeling inclusief tekortmeldingen en afrondverlies over
kleuren, prijzenverdeling (de som is exact de pot en nooit meer dan er opgehaald
is), de drie triggers in de reducer, undo in al zijn varianten, en de hele
setup-keten voor een reeks realistische instellingen.

De UI wordt niet op klikgedrag getest, maar wel op renderen: een handvol
smoke-tests bouwt de drie schermen daadwerkelijk op. Die vangen de fout die je aan
tafel het minst kunt gebruiken — een scherm dat crasht in plaats van laadt.

## Hosting

GitHub Pages op `CavalierNL/poker-night`, via een Actions-workflow die bij elke
push naar `main` bouwt en deployt. In de Vite-config staat `base: '/poker-night/'`
— zonder dat laden de assets niet, omdat Pages de site op een subpad serveert.
`.gitignore` bevat `node_modules`, `dist` en `.superpowers/`.
