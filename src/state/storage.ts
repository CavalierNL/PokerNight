import { PRESETS, type Chipset } from '../domain/chipset'
import type { Settings, Tournament } from '../domain/tournament'

const SLEUTELS = {
  tournament: 'pokernight.tournament',
  chipsets: 'pokernight.chipsets',
  settings: 'pokernight.settings',
  preferences: 'pokernight.preferences',
} as const

/**
 * Verhoog dit zodra de vorm van wat er opgeslagen wordt verandert. Alles met een
 * ander versienummer wordt genegeerd in plaats van als geldig aangenomen — anders
 * krijgt iedereen met een lopend toernooi na een deploy een gecrashte app.
 */
export const OPSLAG_VERSIE = 4

export type Preferences = { sound: boolean; wakeLock: boolean }

const STANDAARD_VOORKEUREN: Preferences = { sound: true, wakeLock: true }

export type OpslagStatus = 'ok' | 'mislukt'

/**
 * Leest een opgeslagen waarde. Geeft `undefined` als de sleutel ontbreekt, de
 * JSON stuk is, of de versie niet klopt. De vorm van het resultaat wordt hier
 * níet gecontroleerd — dat doet de aanroeper, want alleen die weet wat geldig is.
 */
function lees(sleutel: string): unknown {
  try {
    const ruw = localStorage.getItem(sleutel)
    if (ruw === null) return undefined
    const envelop = JSON.parse(ruw) as { version?: number; data?: unknown }
    if (envelop?.version !== OPSLAG_VERSIE) return undefined
    return envelop.data
  } catch {
    return undefined
  }
}

function schrijf(sleutel: string, waarde: unknown): OpslagStatus {
  try {
    localStorage.setItem(sleutel, JSON.stringify({ version: OPSLAG_VERSIE, data: waarde }))
    return 'ok'
  } catch {
    // Opslag vol of geblokkeerd. De aanroeper geeft dit door aan het scherm; stil
    // doorgaan zou betekenen dat iemand pas bij een refresh merkt dat het hele
    // toernooi weg is.
    return 'mislukt'
  }
}

function isObject(waarde: unknown): waarde is Record<string, unknown> {
  return typeof waarde === 'object' && waarde !== null
}

/**
 * Controleert of een ingelezen waarde werkelijk een bruikbaar toernooi is. Zonder
 * deze controle crasht het tafelscherm op de eerste render en blijft het kapotte
 * record staan, waardoor elke volgende refresh opnieuw een wit scherm geeft.
 */
function isTournament(waarde: unknown): waarde is Tournament {
  if (!isObject(waarde)) return false
  const { levels, levelIndex, players, clock, settings } = waarde
  if (!Array.isArray(levels) || levels.length === 0) return false
  if (typeof levelIndex !== 'number' || levelIndex < 0 || levelIndex >= levels.length) return false
  if (!Array.isArray(players) || !isObject(settings)) return false
  if (!isObject(clock)) return false
  if (clock.state === 'running') return typeof clock.endsAt === 'number'
  if (clock.state === 'paused') {
    return typeof clock.remainingMs === 'number' && typeof clock.pausedAt === 'number'
  }
  return false
}

export function loadTournament(): Tournament | null {
  const waarde = lees(SLEUTELS.tournament)
  if (!isTournament(waarde)) return null
  // De geschiedenis wordt niet opgeslagen; undo hoeft een refresh niet te
  // overleven en het scheelt twintig kopieën van dezelfde blindstructuur.
  return { ...waarde, history: [] }
}

export function saveTournament(tournament: Tournament | null): OpslagStatus {
  if (tournament === null) {
    try {
      localStorage.removeItem(SLEUTELS.tournament)
      return 'ok'
    } catch {
      return 'mislukt'
    }
  }
  const { history: _geschiedenis, ...zonderGeschiedenis } = tournament
  return schrijf(SLEUTELS.tournament, zonderGeschiedenis)
}

function isChipsets(waarde: unknown): waarde is Chipset[] {
  return (
    Array.isArray(waarde) &&
    waarde.length > 0 &&
    waarde.every((c) => isObject(c) && typeof c.id === 'string' && Array.isArray(c.chips))
  )
}

export function loadChipsets(): Chipset[] {
  const waarde = lees(SLEUTELS.chipsets)
  return isChipsets(waarde) ? waarde : PRESETS
}

export function saveChipsets(chipsets: Chipset[]): OpslagStatus {
  return schrijf(SLEUTELS.chipsets, chipsets)
}

export function loadSettings(): Settings | null {
  const waarde = lees(SLEUTELS.settings)
  return isObject(waarde) && Array.isArray(waarde.playerNames) ? (waarde as Settings) : null
}

export function saveSettings(settings: Settings): OpslagStatus {
  return schrijf(SLEUTELS.settings, settings)
}

export function loadPreferences(): Preferences {
  const waarde = lees(SLEUTELS.preferences)
  if (!isObject(waarde)) return STANDAARD_VOORKEUREN
  return {
    sound: typeof waarde.sound === 'boolean' ? waarde.sound : STANDAARD_VOORKEUREN.sound,
    wakeLock: typeof waarde.wakeLock === 'boolean' ? waarde.wakeLock : STANDAARD_VOORKEUREN.wakeLock,
  }
}

export function savePreferences(preferences: Preferences): OpslagStatus {
  return schrijf(SLEUTELS.preferences, preferences)
}
