import {
  buildStructure,
  groeiPerLevel,
  rondBedrag,
  type Structure,
  type StructureKind,
} from './blinds'
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
 * Een startstack, geredeneerd vanuit de kleinste chip in de doos en het aantal
 * levels dat je wilt spelen.
 *
 * De blinds beginnen bij de ladder op `2 × de kleinste chipwaarde`, en het
 * toernooi is beslist zodra de big blind rond `spelers × stack / 30` komt. Met
 * een vaste groei per level volgt daaruit hoe diep je moet beginnen om een
 * gewenst aantal levels te halen:
 *
 *     stack = 60 × kleinste × groei^(levels − 1) ÷ spelers
 *
 * Langer spelen of kortere levels betekent dus een diepere stack, terwijl de
 * blinds op dezelfde chip blijven beginnen.
 *
 * Werkt voor elke reeks met een vaste groei per level: de ladder en verdubbelen.
 * `Berekend` past zijn groei juist aan het aantal levels aan en haalt dat dus
 * altijd; daar valt het voorstel terug op honderd big blinds diep.
 *
 * Alleen blokkerende tekorten tellen. "Weinig kleine chips" is een waarschuwing
 * en geen beletsel; bij een doos die zwaar op de hoge waardes leunt is die vanaf
 * een paar spelers onvermijdelijk.
 *
 * Geeft `undefined` als zelfs het kleinste bedrag niet lukt — dan is de doos te
 * klein voor dit gezelschap en is een voorstel geen hulp maar een leugen.
 */
export function suggestStartingStack(
  chipset: Chipset,
  players: number,
  opties: { levels?: number; kind?: StructureKind } = {},
): number | undefined {
  const kleinste = denominations(chipset)[0]
  if (!kleinste || players <= 0) return undefined

  const groei = opties.kind === undefined ? Math.cbrt(10) : groeiPerLevel(opties.kind)
  const levels = opties.levels
  const ideaal =
    groei !== undefined && levels !== undefined && levels >= 2
      ? (60 * kleinste * groei ** (levels - 1)) / players
      : 200 * kleinste

  // Het kleinste ronde bedrag dat het ideaal haalt; daaronder wordt het korter
  // dan gepland in plaats van langer.
  const kandidaten: number[] = []
  for (let i = 0; i < 40; i += 1) {
    kandidaten.push(kleinste * rondBedrag(i))
    if (kandidaten[kandidaten.length - 1] >= ideaal) break
  }

  const blokkeert = (soort: Shortage['kind']) =>
    soort === 'geenFiches' || soort === 'startstackNietGehaald'

  for (const stack of [...kandidaten].reverse()) {
    const tekorten = distributeChips(chipset, players, stack, kleinste, kleinste).shortages
    if (!tekorten.some((t) => blokkeert(t.kind))) return stack
  }
  return undefined
}
