import { chipsWithValue, denominations, totalCountForValue, type Chipset } from './chipset'

export type Allocation = {
  name: string
  color: string
  value: number
  /** Aantal fiches van deze kleur per speler. */
  count: number
}

/**
 * Wat er aan de verdeling schort, als gegevens in plaats van als zin. De zin
 * hoort in de UI-laag thuis; hier telt alleen het onderscheid tussen "de doos is
 * te klein voor deze startstack" (blokkerend) en "minder kleine fiches dan de
 * richtlijn" (hinderlijk, maar speelbaar).
 */
export type Shortage =
  | { kind: 'geenFiches' }
  | { kind: 'startstackNietGehaald'; bereikt: number; gewenst: number }
  | { kind: 'weinigKleineFiches'; value: number; perSpeler: number; gewenst: number }

export type Distribution = {
  perPlayer: Allocation[]
  /** Waarde van de startstack die deze verdeling oplevert. */
  stackValue: number
  shortages: Shortage[]
  /**
   * Het grootste aantal spelers waarvoor de doos de gevraagde startstack nog
   * haalt. Gelijk aan het gevraagde aantal als dat gewoon lukt; 0 als het zelfs
   * voor één speler niet lukt.
   */
  maxPlayers: number
}

/** Zoveel keer de start-kleine-blind wil je aan kleine fiches hebben. */
const KLEINE_FICHES_IN_BLINDS = 20

/** Onder deze fractie van de gewenste startstack is de doos echt te klein. */
const STACK_ONDERGRENS = 0.9

/** Verdeelt een aantal fiches van één denominatie over de beschikbare kleuren. */
function spreadOverColors(
  chipset: Chipset,
  value: number,
  perPlayer: number,
  players: number,
): Allocation[] {
  const kleuren = chipsWithValue(chipset, value).sort((a, b) => b.count - a.count)
  const allocaties: Allocation[] = []
  let teVerdelen = perPlayer

  for (const chip of kleuren) {
    if (teVerdelen <= 0) break
    const beschikbaarPerSpeler = Math.floor(chip.count / players)
    const aantal = Math.min(teVerdelen, beschikbaarPerSpeler)
    if (aantal > 0) {
      allocaties.push({ name: chip.name, color: chip.color, value, count: aantal })
      teVerdelen -= aantal
    }
  }
  return allocaties
}

function tel(allocaties: Allocation[], value: number): number {
  return allocaties.filter((a) => a.value === value).reduce((som, a) => som + a.count, 0)
}

/**
 * Eén poging tot verdeling voor een gegeven aantal spelers. Eerst genoeg kleine
 * fiches om de eerste levels te kunnen betalen, daarna de rest van de stack
 * opvullen met de grootste denominaties die passen — dat houdt de tafel
 * overzichtelijk.
 */
function attempt(
  chipset: Chipset,
  players: number,
  targetStack: number,
  startSmallBlind: number,
  startDenomination: number,
): Omit<Distribution, 'maxPlayers'> {
  // Denominaties die op level 0 al door een color-up uit het spel zijn, deel je
  // niet uit. Zonder deze filter reserveert de app fiches die dezelfde avond nog
  // van tafel gaan, en meldt hij een tekort dat er niet toe doet.
  const denoms = denominations(chipset).filter((d) => d >= startDenomination)
  const shortages: Shortage[] = []
  const allocaties: Allocation[] = []

  const kleinste = denoms[0]
  const gewenstKlein = Math.ceil((KLEINE_FICHES_IN_BLINDS * startSmallBlind) / kleinste)
  const beschikbaarKlein = Math.floor(totalCountForValue(chipset, kleinste) / players)
  allocaties.push(
    ...spreadOverColors(chipset, kleinste, Math.min(gewenstKlein, beschikbaarKlein), players),
  )

  // Vul de rest van de stack met de grootste denominaties die passen.
  let rest = targetStack - tel(allocaties, kleinste) * kleinste
  for (const waarde of [...denoms].reverse()) {
    if (waarde === kleinste || rest < waarde) continue
    const beschikbaar = Math.floor(totalCountForValue(chipset, waarde) / players)
    const aantal = Math.min(Math.floor(rest / waarde), beschikbaar)
    if (aantal > 0) {
      const bij = spreadOverColors(chipset, waarde, aantal, players)
      allocaties.push(...bij)
      rest -= tel(bij, waarde) * waarde
    }
  }

  // Vul het laatste restje aan met kleine fiches. De hele lijst wordt daarvoor
  // opnieuw opgebouwd, met de kleinste denominatie vooraan — dat is ook de
  // volgorde waarin het setupscherm de fiches toont.
  const alKlein = tel(allocaties, kleinste)
  const extra = Math.min(Math.floor(rest / kleinste), beschikbaarKlein - alKlein)
  if (extra > 0) {
    const overige = allocaties.filter((a) => a.value !== kleinste)
    allocaties.length = 0
    allocaties.push(...spreadOverColors(chipset, kleinste, alKlein + extra, players), ...overige)
  }

  // Pas hier tellen wat er werkelijk is uitgedeeld: het spreiden over kleuren
  // rondt per kleur naar beneden af, dus de som kan lager uitvallen dan gevraagd.
  const werkelijkKlein = tel(allocaties, kleinste)
  if (werkelijkKlein < gewenstKlein) {
    shortages.push({
      kind: 'weinigKleineFiches',
      value: kleinste,
      perSpeler: werkelijkKlein,
      gewenst: gewenstKlein,
    })
  }

  const stackValue = allocaties.reduce((som, a) => som + a.value * a.count, 0)
  if (stackValue < targetStack * STACK_ONDERGRENS) {
    shortages.push({ kind: 'startstackNietGehaald', bereikt: stackValue, gewenst: targetStack })
  }

  return { perPlayer: allocaties, stackValue, shortages }
}

const haaltStack = (shortages: Shortage[]) =>
  !shortages.some((s) => s.kind === 'startstackNietGehaald' || s.kind === 'geenFiches')

/**
 * Bepaalt wat elke speler bij aanvang krijgt, plus wat er eventueel aan schort.
 * `startDenomination` is de kleinste fichewaarde die op level 0 nog meedoet —
 * `buildStructure` levert die.
 */
export function distributeChips(
  chipset: Chipset,
  players: number,
  targetStack: number,
  startSmallBlind: number,
  startDenomination = 0,
): Distribution {
  if (denominations(chipset).length === 0 || players <= 0 || targetStack <= 0) {
    return { perPlayer: [], stackValue: 0, shortages: [{ kind: 'geenFiches' }], maxPlayers: 0 }
  }

  const poging = attempt(chipset, players, targetStack, startSmallBlind, startDenomination)
  if (haaltStack(poging.shortages)) return { ...poging, maxPlayers: players }

  // De doos haalt de startstack niet. Voor hoeveel spelers lukt het dan wél? Dat
  // is de enige bruikbare hint die de setup kan geven.
  let maxPlayers = 0
  for (let n = players - 1; n >= 1; n--) {
    if (haaltStack(attempt(chipset, n, targetStack, startSmallBlind, startDenomination).shortages)) {
      maxPlayers = n
      break
    }
  }
  return { ...poging, maxPlayers }
}
