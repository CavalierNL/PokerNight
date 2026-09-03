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
}

/**
 * Of een color-up in deze doos überhaupt zin heeft. Met twee waardes, zoals de
 * huisregel met 5 en 1, hou je na het weghalen van de kleinste één soort fiche
 * over en valt er niets meer te wisselen. Vanaf drie waardes wel.
 */
export function kanColorUp(chipset: Chipset): boolean {
  return denominations(chipset).length >= 3
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

/** Klassieke 500-set met oplopende denominaties. */
export const STANDARD_500: Chipset = {
  id: 'standaard-500',
  name: 'Standaardset (500 chips)',
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

export const PRESETS: Chipset[] = [STANDARD_500, TOERNOOI_DOOS]

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

/**
 * De huisregel: één kleur is 5 waard, alle andere zijn 1. Geen aparte doos maar
 * een bewerking op de doos die je die avond op tafel hebt: welke chips er zijn
 * en hoeveel ligt vast in de doos, wat ze waard zijn niet.
 *
 * Staat `vijfKleur` niet in de doos — je hebt van doos gewisseld — dan is alles
 * 1 waard. De structuur klopt dan nog, hij is alleen niet wat je bedoelde; het
 * setupscherm zorgt dat er altijd een bestaande kleur gekozen staat.
 */
export function metHuisregel(chipset: Chipset, vijfKleur: string): Chipset {
  return {
    ...chipset,
    chips: chipset.chips.map((chip) => ({ ...chip, value: chip.color === vijfKleur ? 5 : 1 })),
  }
}

/**
 * De doos zoals hij voor dit toernooi geldt. Staat op één plek zodat het
 * setupscherm en een startend toernooi dezelfde doos gebruiken; het scherm dat
 * er zelf een zou samenstellen is precies hoe die twee uit elkaar gaan lopen.
 */
export function metInstellingen(
  chipset: Chipset,
  instellingen: { houseRuleFiveColor?: string },
): Chipset {
  const vijfKleur = instellingen.houseRuleFiveColor
  return vijfKleur ? metHuisregel(chipset, vijfKleur) : chipset
}
