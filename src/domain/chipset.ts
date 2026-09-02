export type Chip = {
  /**
   * Hex-kleur voor weergave. Meteen ook de identiteit van de rij: een naam als
   * "wit" stond nergens meer op het scherm, want overal waar hij stond wordt nu
   * het fiche zelf getoond.
   */
  color: string
  /** Waarde in fiche-eenheden. Meerdere kleuren mogen dezelfde waarde hebben. */
  value: number
  /** Totaal aantal fiches van deze kleur in de doos. */
  count: number
}

export type Chipset = {
  id: string
  name: string
  chips: Chip[]
  /**
   * Of de kleinste kleur onderweg uit het spel gehaald mag worden. Bij een doos
   * met maar twee waardes, zoals de huisregel, levert dat niets op: je speelt
   * daarna met één soort fiche en kunt niets meer wisselen. Per doos in te
   * stellen, want of het de moeite is hangt af van wat er in de doos zit.
   */
  colorUp: boolean
}

/**
 * Unieke waardes, oplopend. Kleuren met dezelfde waarde vormen één denominatie.
 *
 * Waardes van nul of lager vallen af. De chipset-editor laat een getalveld leeg
 * achter als je het wist, en `Number('')` is 0 — zonder deze filter rekent de
 * hele blindstructuur daarna met een fichewaarde van 0 en komt er `NaN` uit.
 */
export function denominations(chipset: Chipset): number[] {
  const waardes = new Set(chipset.chips.filter((c) => c.value > 0).map((c) => c.value))
  return [...waardes].sort((a, b) => a - b)
}

export function chipsWithValue(chipset: Chipset, value: number): Chip[] {
  return chipset.chips.filter((c) => c.value === value)
}

export function totalCountForValue(chipset: Chipset, value: number): number {
  return chipsWithValue(chipset, value).reduce((som, c) => som + c.count, 0)
}

/**
 * Het aantal cijfers van de langste fichewaarde in de doos. Bepaalt de
 * lettergrootte op het fiche: die geldt voor de hele doos, niet per fiche, zodat
 * de fiches van één set naast elkaar dezelfde maat cijfers dragen.
 */
export function longestValueDigits(chipset: Chipset): number {
  const langste = Math.max(1, ...chipset.chips.map((c) => String(Math.max(0, c.value)).length))
  return langste
}

/** Huisregel: één kleur is 5 waard, alle andere kleuren zijn 1 waard. */
export const HOUSE_RULES: Chipset = {
  id: 'huisregel',
  name: 'Huisregel (5 en 1)',
  colorUp: false,
  chips: [
    { color: '#f2efe6', value: 1, count: 150 },
    { color: '#c0392b', value: 1, count: 100 },
    { color: '#2e6da4', value: 1, count: 100 },
    { color: '#2e8b57', value: 5, count: 150 },
  ],
}

/** Klassieke 500-set met oplopende denominaties. */
export const STANDARD_500: Chipset = {
  id: 'standaard-500',
  name: 'Standaardset (500 fiches)',
  colorUp: true,
  chips: [
    { color: '#f2efe6', value: 1, count: 150 },
    { color: '#c0392b', value: 5, count: 150 },
    { color: '#2e8b57', value: 25, count: 100 },
    { color: '#22262b', value: 100, count: 75 },
    { color: '#6b4fa0', value: 500, count: 25 },
  ],
}

/** De doos die hier aan tafel ligt: 500 fiches, van 25 tot 10.000. */
export const TOERNOOI_DOOS: Chipset = {
  id: 'grote-set',
  name: 'Toernooi doos',
  colorUp: true,
  chips: [
    { color: '#2e8b57', value: 25, count: 75 },
    { color: '#2e6da4', value: 50, count: 75 },
    { color: '#22262b', value: 100, count: 125 },
    { color: '#6b4fa0', value: 500, count: 75 },
    { color: '#e9c31f', value: 1000, count: 75 },
    { color: '#d96a9a', value: 5000, count: 50 },
    { color: '#7a4a26', value: 10000, count: 25 },
  ],
}

export const PRESETS: Chipset[] = [HOUSE_RULES, STANDARD_500, TOERNOOI_DOOS]

/**
 * Een id dat niet botst met een bestaande doos. Oplopend geteld in plaats van
 * willekeurig: dat is te volgen in de opslag en levert in een test elke keer
 * hetzelfde op.
 */
export function nieuwChipsetId(bestaand: Chipset[]): string {
  let nummer = bestaand.length + 1
  while (bestaand.some((c) => c.id === `doos-${nummer}`)) nummer += 1
  return `doos-${nummer}`
}

/** Een verse doos om zelf op te bouwen: één kleur, de rest voeg je toe. */
export function legeChipset(bestaand: Chipset[]): Chipset {
  return {
    id: nieuwChipsetId(bestaand),
    name: 'Nieuwe doos',
    colorUp: true,
    chips: [{ color: '#cccccc', value: 1, count: 50 }],
  }
}

/** Een kopie om vanaf te beginnen; een doos van zeven kleuren natypen is werk. */
export function kopieerChipset(bron: Chipset, bestaand: Chipset[]): Chipset {
  return {
    ...bron,
    id: nieuwChipsetId(bestaand),
    name: `${bron.name} (kopie)`,
    chips: bron.chips.map((chip) => ({ ...chip })),
  }
}

/**
 * Zet ontbrekende presets terug zonder eigen dozen weg te gooien. De oude versie
 * verving de hele lijst — dat was ongevaarlijk zolang je niets eigens kon maken,
 * en is dat nu niet meer.
 */
export function metPresets(huidig: Chipset[]): Chipset[] {
  const ontbrekend = PRESETS.filter((preset) => !huidig.some((c) => c.id === preset.id))
  return [...huidig, ...ontbrekend]
}
