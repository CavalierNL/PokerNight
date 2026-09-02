export type Chip = {
  /** Naam van de kleur zoals aan tafel gebruikt, bijv. "wit". */
  name: string
  /** Hex-kleur voor weergave. */
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

/** Huisregel: één kleur is 5 waard, alle andere kleuren zijn 1 waard. */
export const HOUSE_RULES: Chipset = {
  id: 'huisregel',
  name: 'Huisregel (5 en 1)',
  chips: [
    { name: 'wit', color: '#f2efe6', value: 1, count: 150 },
    { name: 'rood', color: '#c0392b', value: 1, count: 100 },
    { name: 'blauw', color: '#2e6da4', value: 1, count: 100 },
    { name: 'groen', color: '#2e8b57', value: 5, count: 150 },
  ],
}

/** Klassieke 500-set met oplopende denominaties. */
export const STANDARD_500: Chipset = {
  id: 'standaard-500',
  name: 'Standaardset (500 fiches)',
  chips: [
    { name: 'wit', color: '#f2efe6', value: 1, count: 150 },
    { name: 'rood', color: '#c0392b', value: 5, count: 150 },
    { name: 'groen', color: '#2e8b57', value: 25, count: 100 },
    { name: 'zwart', color: '#22262b', value: 100, count: 75 },
    { name: 'paars', color: '#6b4fa0', value: 500, count: 25 },
  ],
}

export const PRESETS: Chipset[] = [HOUSE_RULES, STANDARD_500]
