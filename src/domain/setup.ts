import { buildStructure, type Structure } from './blinds'
import type { Chipset } from './chipset'
import { distributeChips, type Distribution } from './distribution'
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
export function prepareSetup(settings: Settings, chipset: Chipset): Setup {
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
