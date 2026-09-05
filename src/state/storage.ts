import { PRESETS, type Chipset } from '../domain/chipset'
import type { Avond } from '../domain/klassement'
import type { Settings, Tournament } from '../domain/tournament'

/**
 * Onder welke naam deze build zijn spullen opslaat. `localStorage` hoort bij een
 * origin en niet bij een pad, dus een PR-preview op
 * /PokerNight/pr-preview/pr-12/ deelt de opslag met de echte site op
 * /PokerNight/. Zonder eigen naam doet een preview een van twee dingen met het
 * lopende toernooi van de echte site, en geen van beide is zichtbaar:
 *
 *  - schrijft de preview een andere OPSLAG_VERSIE, dan leest de echte site zijn
 *    eigen toernooi daarna niet meer terug (`lees` geeft undefined bij een
 *    andere versie) en staat de gebruiker zonder melding weer op het setupscherm;
 *  - schrijft de preview dezelfde versie in een veranderde vorm — een PR die de
 *    bump vergat — dan komt hij door `isTournament` heen en is het wél de crash
 *    die de versie moest afvangen.
 *
 * Het pad komt als parameter binnen zodat dit te testen is zonder een build met
 * een andere base. De gewone site houdt `pokernight`, zodat bestaande opslag
 * gewoon blijft staan.
 *
 * De afsluitende slash is optioneel omdat Vite `import.meta.env.BASE_URL` niet
 * normaliseert: een `PAGES_BASE` zonder slash komt er ongewijzigd uit, en dan
 * zou een preview stilletjes op de productienaam terugvallen. vite.config.ts
 * weigert zo'n base ook, maar de terugval hier hoort niet de gevaarlijke kant op
 * te wijzen.
 */
export function naamruimte(basisPad: string): string {
  const pr = /\/pr-preview\/(pr-\d+)(?:\/|$)/.exec(basisPad)?.[1]
  return pr ? `pokernight.${pr}` : 'pokernight'
}

const NAAM = naamruimte(import.meta.env.BASE_URL)

const SLEUTELS = {
  tournament: `${NAAM}.tournament`,
  chipsets: `${NAAM}.chipsets`,
  settings: `${NAAM}.settings`,
  preferences: `${NAAM}.preferences`,
  spelers: `${NAAM}.spelers`,
  avonden: `${NAAM}.avonden`,
} as const

/**
 * Verhoog dit zodra de vorm van wat er opgeslagen wordt verandert. Alles met een
 * ander versienummer wordt genegeerd in plaats van als geldig aangenomen — anders
 * krijgt iedereen met een lopend toernooi na een deploy een gecrashte app.
 */
export const OPSLAG_VERSIE = 6

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

/**
 * De vaste spelers van de groep. Bestaat zodat het klassement dezelfde persoon
 * over meerdere avonden herkent: namen worden aangetikt in plaats van getypt, en
 * dan levert 'bram' geen tweede Bram op naast 'Bram'.
 */
export function loadSpelers(): string[] {
  const waarde = lees(SLEUTELS.spelers)
  if (!Array.isArray(waarde)) return []
  return waarde.filter((naam): naam is string => typeof naam === 'string' && naam.trim() !== '')
}

export function saveSpelers(spelers: string[]): OpslagStatus {
  return schrijf(SLEUTELS.spelers, spelers)
}

/**
 * Controleert of een ingelezen avond bruikbaar is. Net als bij een toernooi:
 * zonder deze controle crasht het klassementscherm op de eerste render en blijft
 * het kapotte record staan, waardoor het scherm onbereikbaar wordt.
 */
function isAvond(waarde: unknown): waarde is Avond {
  if (!isObject(waarde)) return false
  if (typeof waarde.id !== 'number' || typeof waarde.datum !== 'number') return false
  return (
    Array.isArray(waarde.uitslag) && waarde.uitslag.every((naam) => typeof naam === 'string')
  )
}

export function loadAvonden(): Avond[] {
  const waarde = lees(SLEUTELS.avonden)
  if (!Array.isArray(waarde)) return []
  // Per avond filteren en niet alles weggooien bij één kapot record: een
  // klassement van twee jaar hoort niet te verdwijnen door een enkele avond.
  return waarde.filter(isAvond)
}

export function saveAvonden(avonden: Avond[]): OpslagStatus {
  return schrijf(SLEUTELS.avonden, avonden)
}
