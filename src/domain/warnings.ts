import type { Structure } from './blinds'
import type { Distribution } from './distribution'
import type { Settings } from './tournament'

export type Warning = {
  /** `error` blokkeert de start, `warning` niet. */
  level: 'error' | 'warning'
  message: string
}

export function setupWarnings(
  settings: Settings,
  structure: Structure,
  distribution: Distribution,
): Warning[] {
  const warnings: Warning[] = []

  if (settings.playerNames.length < 2) {
    warnings.push({ level: 'error', message: 'Je hebt minstens twee spelers nodig.' })
  }

  if (structure.levels.length === 0) {
    warnings.push({ level: 'error', message: 'Deze instellingen leveren geen blindstructuur op.' })
  }

  for (const tekort of distribution.shortages) {
    warnings.push({ level: 'error', message: tekort })
  }

  if (distribution.maxPlayers > 0 && distribution.maxPlayers < settings.playerNames.length) {
    warnings.push({
      level: 'error',
      message: `Deze doos is genoeg voor ${distribution.maxPlayers} spelers, niet voor ${settings.playerNames.length}.`,
    })
  }

  const laatste = structure.levels[structure.levels.length - 1]
  if (laatste) {
    const gemiddeldeStackBijDrie = (settings.playerNames.length * settings.startingStack) / 3
    if (laatste.bigBlind > gemiddeldeStackBijDrie) {
      warnings.push({
        level: 'warning',
        message:
          'De blinds lopen hard op: aan het eind is de big blind groter dan een gemiddelde stack. ' +
          'Overweeg langere levels of een berekende structuur.',
      })
    }
  }

  return warnings
}
