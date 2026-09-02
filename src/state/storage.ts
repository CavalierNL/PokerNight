import { PRESETS, type Chipset } from '../domain/chipset'
import type { Settings, Tournament } from '../domain/tournament'

const SLEUTELS = {
  tournament: 'pokernight.tournament',
  chipsets: 'pokernight.chipsets',
  settings: 'pokernight.settings',
  preferences: 'pokernight.preferences',
} as const

export type Preferences = { sound: boolean; wakeLock: boolean }

const STANDAARD_VOORKEUREN: Preferences = { sound: true, wakeLock: true }

/** Leest JSON uit localStorage en valt bij elke fout terug op de standaard. */
function lees<T>(sleutel: string, standaard: T): T {
  try {
    const ruw = localStorage.getItem(sleutel)
    if (ruw === null) return standaard
    return JSON.parse(ruw) as T
  } catch {
    return standaard
  }
}

function schrijf(sleutel: string, waarde: unknown): void {
  try {
    localStorage.setItem(sleutel, JSON.stringify(waarde))
  } catch {
    // Opslag vol of geblokkeerd: de app werkt door, alleen zonder herstel.
  }
}

export function loadTournament(): Tournament | null {
  return lees<Tournament | null>(SLEUTELS.tournament, null)
}

export function saveTournament(tournament: Tournament | null): void {
  if (tournament === null) {
    try {
      localStorage.removeItem(SLEUTELS.tournament)
    } catch {
      // Niets te doen: de opslag is toch al onbruikbaar.
    }
    return
  }
  schrijf(SLEUTELS.tournament, tournament)
}

export function loadChipsets(): Chipset[] {
  const opgeslagen = lees<Chipset[]>(SLEUTELS.chipsets, PRESETS)
  return Array.isArray(opgeslagen) && opgeslagen.length > 0 ? opgeslagen : PRESETS
}

export function saveChipsets(chipsets: Chipset[]): void {
  schrijf(SLEUTELS.chipsets, chipsets)
}

export function loadSettings(): Settings | null {
  return lees<Settings | null>(SLEUTELS.settings, null)
}

export function saveSettings(settings: Settings): void {
  schrijf(SLEUTELS.settings, settings)
}

export function loadPreferences(): Preferences {
  return { ...STANDAARD_VOORKEUREN, ...lees<Partial<Preferences>>(SLEUTELS.preferences, {}) }
}

export function savePreferences(preferences: Preferences): void {
  schrijf(SLEUTELS.preferences, preferences)
}
