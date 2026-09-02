import type { Structure } from './blinds'
import type { Distribution, Shortage } from './distribution'
import type { Settings } from './tournament'

export type Warning = {
  /** `error` blokkeert de start, `warning` niet. */
  level: 'error' | 'warning'
  message: string
}

/**
 * Een tekort aan kleine fiches is hinderlijk maar speelbaar — de spec noemt het
 * een richtlijn. Alleen een doos die de startstack niet haalt blokkeert echt,
 * want dan klopt de gemiddelde stack die het tafelscherm toont niet meer.
 */
function shortageToWarning(shortage: Shortage, distribution: Distribution, players: number): Warning {
  switch (shortage.kind) {
    case 'geenFiches':
      return { level: 'error', message: 'Deze chipset heeft geen bruikbare fiches.' }

    case 'startstackNietGehaald': {
      const uitweg =
        distribution.maxPlayers > 0
          ? ` Kies een lagere startstack, of speel met ${distribution.maxPlayers} spelers.`
          : ' Kies een lagere startstack.'
      return {
        level: 'error',
        message:
          `Deze doos haalt met ${players} spelers maximaal ${shortage.bereikt} fiches per speler, ` +
          `niet ${shortage.gewenst}.${uitweg}`,
      }
    }

    case 'weinigKleineFiches':
      return {
        level: 'warning',
        message:
          `Weinig fiches van ${shortage.value}: ${shortage.perSpeler} per speler in plaats van de ` +
          `aanbevolen ${shortage.gewenst}. Je moet in de eerste levels mogelijk wisselen.`,
      }
  }
}

export function setupWarnings(
  settings: Settings,
  structure: Structure,
  distribution: Distribution,
): Warning[] {
  const warnings: Warning[] = []
  const spelers = settings.playerNames.length

  if (spelers < 2) {
    warnings.push({ level: 'error', message: 'Je hebt minstens twee spelers nodig.' })
  }

  if (settings.startingStack <= 0) {
    warnings.push({ level: 'error', message: 'Vul een startstack in.' })
  }

  if (settings.buyIn < 0) {
    warnings.push({ level: 'error', message: 'De inleg kan niet negatief zijn.' })
  }

  if (settings.levelMinutes <= 0) {
    warnings.push({ level: 'error', message: 'Een level moet langer dan nul minuten duren.' })
  } else if (settings.durationMinutes < settings.levelMinutes * 2) {
    warnings.push({
      level: 'error',
      message: 'De opgegeven duur is te kort: er passen niet eens twee levels in.',
    })
  }

  if (structure.levels.length === 0) {
    warnings.push({ level: 'error', message: 'Deze instellingen leveren geen blindstructuur op.' })
  }

  for (const tekort of distribution.shortages) {
    warnings.push(shortageToWarning(tekort, distribution, spelers))
  }

  // Wanneer wordt het een shove-fest? Zodra de gemiddelde stack van de laatste
  // drie spelers onder tien big blinds zakt, is er niet veel meer te spelen.
  // Gebeurt dat in de eerste helft van de geplande levels, dan is het toernooi
  // veel eerder beslist dan de opgegeven duur suggereert.
  const gemiddeldeStackBijDrie = (spelers * settings.startingStack) / 3
  const drempel = gemiddeldeStackBijDrie / 10
  const kritiek = structure.levels.findIndex((l) => l.bigBlind > drempel)
  if (kritiek >= 0 && kritiek < structure.levels.length * 0.6) {
    const minuten = kritiek * settings.levelMinutes
    warnings.push({
      level: 'warning',
      message:
        `De blinds lopen hard op: rond level ${kritiek + 1} (na ${minuten} minuten) is de ` +
        'gemiddelde stack nog maar tien big blinds en is het toernooi feitelijk beslist. ' +
        'Overweeg langere levels, een grotere startstack of een berekende structuur.',
    })
  }

  return warnings
}
