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
 * Een startstack, geredeneerd vanuit de kleinste chip in de doos.
 *
 * Het ankerpunt is honderd big blinds diep bij blinds van d/2d, oftewel
 * `200 × de kleinste chipwaarde`. Precies daar begint `buildStructure` de reeks
 * op de kleinste chip: die is dan vanaf level 1 in gebruik en er valt aan tafel
 * iets te wisselen. Dieper mag technisch, maar duwt de kleine chips meteen uit
 * het spel — de blinds beginnen dan hoger dan waar ze voor bedoeld zijn.
 *
 * Haalt de doos dat bedrag niet voor dit gezelschap, dan zakt het voorstel langs
 * dezelfde 1-2-5 ladder als de blinds naar het eerstvolgende bedrag dat wel
 * uitgedeeld kan worden. Zo blijft het altijd een bedrag dat je met deze chips
 * kunt neerleggen.
 *
 * Alleen blokkerende tekorten tellen. "Weinig kleine chips" is een waarschuwing
 * en geen beletsel; bij een doos die zwaar op de hoge waardes leunt is die vanaf
 * een paar spelers onvermijdelijk, en daarop afwijzen zou betekenen dat er nooit
 * een voorstel komt.
 *
 * Geeft `undefined` als zelfs het kleinste bedrag niet lukt — dan is de doos te
 * klein voor dit gezelschap en is een voorstel geen hulp maar een leugen.
 */
export function suggestStartingStack(chipset: Chipset, players: number): number | undefined {
  const kleinste = denominations(chipset)[0]
  if (!kleinste || players <= 0) return undefined

  const ideaal = 200 * kleinste

  const kandidaten: number[] = []
  for (let i = 0; i < 40; i += 1) {
    const bedrag = kleinste * ladderRung(i)
    if (bedrag > ideaal) break
    kandidaten.push(bedrag)
  }

  const blokkeert = (soort: Shortage['kind']) =>
    soort === 'geenFiches' || soort === 'startstackNietGehaald'

  for (const stack of [...kandidaten].reverse()) {
    const tekorten = distributeChips(chipset, players, stack, kleinste, kleinste).shortages
    if (!tekorten.some((t) => blokkeert(t.kind))) return stack
  }
  return undefined
}
