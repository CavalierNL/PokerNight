---
name: opslag-migratie
description: Gebruik dit bij elke wijziging aan de vorm van iets dat in localStorage belandt — Tournament, Settings, Chipset of Preferences. Loodst je langs de OPSLAG_VERSIE-bump die anders vergeten wordt.
---

# Opslagvorm wijzigen

De app bewaart een lopend toernooi in `localStorage` en herstelt het bij het
openen. Verandert de vorm van wat daar staat zonder dat het versienummer
meegaat, dan leest de nieuwe code oude data als geldig in en crasht de app bij
iedereen die op dat moment aan het spelen is. Dat merk je niet in de tests: die
schrijven en lezen in dezelfde vorm.

Alles staat in `src/state/storage.ts`.

## De stappen

1. **Pas de types aan** in `src/domain/tournament.ts` of `src/domain/chipset.ts`.
   De opslag heeft geen eigen types; hij hergebruikt die van het domein.

2. **Verhoog `OPSLAG_VERSIE`** in `src/state/storage.ts` met één. De `lees`-functie
   negeert alles met een ander versienummer, dus dit is wat oude data stil laat
   verdwijnen in plaats van hem verkeerd te interpreteren.

3. **Controleer de validatie van de aanroeper.** `lees` controleert de vorm
   bewust niet — dat doen `loadTournament`, `loadSettings`, `loadChipsets` en
   `loadPreferences` zelf. Voeg je een veld toe dat niet mag ontbreken, dan hoort
   die controle daar.

4. **Werk `src/state/storage.test.ts` bij**, inclusief een geval met de vórige
   versie in de opslag, dat `undefined` moet opleveren.

5. **Kijk of `src/App.test.tsx` meemoet.** `bewaarToernooi` daar zet een toernooi
   in de opslag in dezelfde vorm als de app zelf schrijft, en gebruikt
   `OPSLAG_VERSIE` rechtstreeks.

6. **Draai `npm test` en `npm run build`.**

## Twijfelgeval

Voeg je een veld toe met een zinnige standaardwaarde, dan is een bump strikt
genomen niet nodig als de aanroeper dat veld invult wanneer het ontbreekt. Doe
het dan alsnog, tenzij je een goede reden hebt: een verloren toernooi is een
teleurstelling van één avond, een crashende app op tafel is erger.
