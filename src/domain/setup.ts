import { buildStructure, ladderRung, type Structure } from './blinds'
import { denominations, metInstellingen, type Chipset } from './chipset'
import { distributeChips, type Distribution, type Shortage } from './distribution'
import { setupWarnings, type Warning } from './warnings'
import type { Settings } from './tournament'

export type Setup = {
  structure: Structure
  distribution: Distribution
  warnings: Warning[]
  /** Of de startknop ingedrukt mag worden. */
  canStart: boolean
}

/**
 * De hele setup-berekening in één pure functie: van instellingen naar
 * blindstructuur, chipverdeling en meldingen.
 *
 * Deze keten stond eerst in het setupscherm zelf. Daar was hij alleen via
 * renderen te bereiken, terwijl juist de samenhang tussen de vier modules de
 * plek is waar het misgaat — een color-up op level 0 die de chipverdeling
 * fiches laat reserveren die al van tafel zijn, bijvoorbeeld.
 */
export function prepareSetup(settings: Settings, ruweChipset: Chipset): Setup {
  const chipset = metInstellingen(ruweChipset, settings)
  const spelers = Math.max(settings.playerNames.length, 2)

  const structure = buildStructure(
    {
      kind: settings.structure,
      players: spelers,
      startingStack: settings.startingStack,
      durationMinutes: settings.durationMinutes,
      levelMinutes: settings.levelMinutes,
      manualBigBlinds: settings.manualBigBlinds,
      colorUp: settings.colorUp,
    },
    chipset,
  )

  const distribution = distributeChips(
    chipset,
    spelers,
    settings.startingStack,
    structure.levels[0]?.smallBlind ?? 1,
    structure.startDenomination,
  )

  const warnings = setupWarnings(settings, structure, distribution)

  return {
    structure,
    distribution,
    warnings,
    canStart: !warnings.some((w) => w.level === 'error'),
  }
}

/**
 * Een startstack die deze doos met dit aantal spelers echt kan uitdelen.
 *
 * Niet berekend uit de totale waarde in de doos: die deelt de kleine chips niet
 * mee die je in de eerste levels nodig hebt, en levert dus een getal op waar de
 * verdeling meteen over klaagt. In plaats daarvan wordt de verdeling zelf
 * gevraagd, van hoog naar laag, tot er een bedrag is waar niets meer op aan te
 * merken valt.
 *
 * De kandidaten zijn ronde bedragen op dezelfde 1-2-5 ladder als de blinds, maal
 * de kleinste chipwaarde: 25, 50, 125, 250 … voor een doos die met 25 begint.
 * Zo krijg je een stack die je ook echt kunt neerleggen.
 *
 * In twee slagen: eerst het hoogste bedrag waar de verdeling niets op aan te
 * merken heeft, en pas als dat er niet is het hoogste bedrag dat tenminste niet
 * geblokkeerd wordt. "Weinig kleine chips" is een waarschuwing en geen beletsel;
 * bij een doos die zwaar op de hoge waardes leunt is die vanaf een paar spelers
 * onvermijdelijk, en daarop afwijzen zou betekenen dat er nooit iets komt.
 *
 * Geeft `undefined` als zelfs het kleinste bedrag niet lukt — dan is de doos te
 * klein voor dit gezelschap en is een suggestie geen hulp maar een leugen.
 */
export function suggestStartingStack(chipset: Chipset, players: number): number | undefined {
  const kleinste = denominations(chipset)[0]
  if (!kleinste || players <= 0) return undefined

  const totaal = chipset.chips.reduce((som, chip) => som + chip.value * chip.count, 0)
  const bovengrens = totaal / players

  const kandidaten: number[] = []
  for (let i = 0; i < 40; i += 1) {
    const bedrag = kleinste * ladderRung(i)
    if (bedrag > bovengrens) break
    kandidaten.push(bedrag)
  }

  const blokkeert = (soort: Shortage['kind']) =>
    soort === 'geenFiches' || soort === 'startstackNietGehaald'

  const aflopend = [...kandidaten].reverse()
  const tekorten = aflopend.map(
    (stack) => [stack, distributeChips(chipset, players, stack, kleinste, kleinste).shortages] as const,
  )

  const schoon = tekorten.find(([, gebreken]) => gebreken.length === 0)
  if (schoon) return schoon[0]

  const bruikbaar = tekorten.find(([, gebreken]) => !gebreken.some((t) => blokkeert(t.kind)))
  return bruikbaar?.[0]
}
