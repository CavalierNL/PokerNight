import { chipsWithValue, denominations, totalCountForValue, type Chipset } from './chipset'

export type Allocation = {
  name: string
  color: string
  value: number
  /** Aantal fiches van deze kleur per speler. */
  count: number
}

export type Distribution = {
  perPlayer: Allocation[]
  /** Waarde van de startstack die deze verdeling oplevert. */
  stackValue: number
  /** Leesbare meldingen over kleuren waarvan er te weinig zijn. */
  shortages: string[]
  /** Hoeveel spelers er met deze doos wél bediend kunnen worden. */
  maxPlayers: number
}

/** Zoveel keer de start-kleine-blind wil je aan kleine fiches hebben. */
const KLEINE_FICHES_IN_BLINDS = 20

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
): Omit<Distribution, 'maxPlayers'> {
  const denoms = denominations(chipset)
  const shortages: string[] = []
  const allocaties: Allocation[] = []

  // 1. Reserveer kleine fiches voor de eerste levels.
  const kleinste = denoms[0]
  const gewenstKlein = Math.ceil((KLEINE_FICHES_IN_BLINDS * startSmallBlind) / kleinste)
  const beschikbaarKlein = Math.floor(totalCountForValue(chipset, kleinste) / players)
  const aantalKlein = Math.min(gewenstKlein, beschikbaarKlein)
  if (aantalKlein < gewenstKlein) {
    shortages.push(
      `Te weinig fiches van ${kleinste}: ${aantalKlein} per speler in plaats van ${gewenstKlein}.`,
    )
  }
  allocaties.push(...spreadOverColors(chipset, kleinste, aantalKlein, players))

  // 2. Vul de rest van de stack met de grootste denominaties die passen.
  let rest = targetStack - aantalKlein * kleinste
  for (const waarde of [...denoms].reverse()) {
    if (waarde === kleinste || rest < waarde) continue
    const beschikbaar = Math.floor(totalCountForValue(chipset, waarde) / players)
    const aantal = Math.min(Math.floor(rest / waarde), beschikbaar)
    if (aantal > 0) {
      allocaties.push(...spreadOverColors(chipset, waarde, aantal, players))
      rest -= aantal * waarde
    }
  }

  // 3. Vul het laatste restje aan met kleine fiches, voor zover die er nog zijn.
  const extra = Math.min(Math.floor(rest / kleinste), beschikbaarKlein - aantalKlein)
  if (extra > 0) {
    const overige = allocaties.filter((a) => a.value !== kleinste)
    allocaties.length = 0
    allocaties.push(
      ...spreadOverColors(chipset, kleinste, aantalKlein + extra, players),
      ...overige,
    )
  }

  const stackValue = allocaties.reduce((som, a) => som + a.value * a.count, 0)
  if (stackValue < targetStack * 0.9) {
    shortages.push(
      `De doos haalt de gewenste startstack niet: ${stackValue} in plaats van ${targetStack}.`,
    )
  }

  return { perPlayer: allocaties, stackValue, shortages }
}

/**
 * Bepaalt wat elke speler bij aanvang krijgt. Levert de verdeling op tekorten
 * na, plus — als het niet past — het grootste aantal spelers waarvoor de doos
 * wél toereikend is.
 */
export function distributeChips(
  chipset: Chipset,
  players: number,
  targetStack: number,
  startSmallBlind: number,
): Distribution {
  if (denominations(chipset).length === 0 || players <= 0) {
    return {
      perPlayer: [],
      stackValue: 0,
      shortages: ['Deze chipset heeft geen fiches.'],
      maxPlayers: 0,
    }
  }

  const poging = attempt(chipset, players, targetStack, startSmallBlind)
  if (poging.shortages.length === 0) return { ...poging, maxPlayers: players }

  // Bij een tekort is de vraag: hoeveel spelers past deze doos dan wél? Het
  // aantal telt terug tot de verdeling zonder klachten rondkomt.
  let maxPlayers = 0
  for (let n = players - 1; n >= 1; n--) {
    if (attempt(chipset, n, targetStack, startSmallBlind).shortages.length === 0) {
      maxPlayers = n
      break
    }
  }
  return { ...poging, maxPlayers }
}
