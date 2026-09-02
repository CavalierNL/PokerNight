import { chipsWithValue, denominations, type Chipset } from './chipset'
import { roundToPayable, smallBlindFor } from './amounts'

export type StructureKind = 'calculated' | 'doubling' | 'manual'

export type BlindLevel = {
  index: number
  smallBlind: number
  bigBlind: number
}

export type ColorUp = {
  /** Het level waarop deze kleur uit het spel mag. */
  levelIndex: number
  retiredValue: number
  retiredColors: string[]
  nextValue: number
}

export type StructureInput = {
  kind: StructureKind
  players: number
  startingStack: number
  durationMinutes: number
  levelMinutes: number
  manualBigBlinds?: number[]
}

export type Structure = {
  levels: BlindLevel[]
  colorUps: ColorUp[]
}

/** Aantal levels dat in de geplande duur past, minimaal twee. */
export function levelCount(durationMinutes: number, levelMinutes: number): number {
  return Math.max(2, Math.floor(durationMinutes / levelMinutes))
}

/**
 * De big blind waar de structuur naartoe werkt: bij nog drie spelers over is de
 * gemiddelde stack dan ongeveer tien big blinds.
 */
export function targetEndBigBlind(players: number, startingStack: number): number {
  return (players * startingStack) / 3 / 10
}

/**
 * De onafgeronde big blinds. De startwaarde is honderd big blinds diep, maar
 * minstens twee fiches — anders bestaat er geen kleine blind die daar strikt
 * onder ligt, en zou de hele reeks vanaf level 0 scheef staan.
 */
function rawBigBlinds(input: StructureInput, smallestDenomination: number): number[] {
  if (input.kind === 'manual') return input.manualBigBlinds ?? []

  const aantal = levelCount(input.durationMinutes, input.levelMinutes)
  const start = Math.max(input.startingStack / 100, smallestDenomination * 2)

  if (input.kind === 'doubling') {
    return Array.from({ length: aantal }, (_, i) => start * 2 ** i)
  }

  const eind = targetEndBigBlind(input.players, input.startingStack)
  const factor = Math.pow(Math.max(eind, start * 2) / start, 1 / (aantal - 1))
  return Array.from({ length: aantal }, (_, i) => start * factor ** i)
}

/**
 * Bouwt de structuur level voor level op. Dat moet sequentieel: afronden hangt
 * af van de kleinste actieve denominatie, en die verschuift zodra een color-up
 * plaatsvindt — wat op zijn beurt van de al berekende blinds afhangt.
 */
export function buildStructure(input: StructureInput, chipset: Chipset): Structure {
  const denoms = denominations(chipset)
  const ruw = rawBigBlinds(input, denoms[0] ?? 1)

  const levels: BlindLevel[] = []
  const colorUps: ColorUp[] = []
  let denomIndex = 0
  let vorigeBigBlind = 0

  ruw.forEach((ruweBb, index) => {
    const d = denoms[denomIndex] ?? 1
    // Afronden op een veelvoud van twee fichewaardes, niet één: dan is de big
    // blind altijd exact het dubbele van de kleine blind, zoals aan elke echte
    // pokertafel. Afronden op enkelvoudige fichewaardes levert paren als 30/65 op.
    const ondergrens = Math.max(vorigeBigBlind, d)
    const bigBlind = roundToPayable(Math.max(ruweBb, d * 2), d * 2, ondergrens)
    const smallBlind = smallBlindFor(bigBlind, d)
    levels.push({ index, smallBlind, bigBlind })
    vorigeBigBlind = bigBlind

    // Is de kleinste kleur nog nuttig? Zodra de kleine blind tien keer die
    // waarde is, kun je hem uit het spel halen.
    const isLaatsteDenominatie = denomIndex >= denoms.length - 1
    if (!isLaatsteDenominatie && smallBlind >= 10 * d) {
      const volgende = denoms[denomIndex + 1]
      colorUps.push({
        levelIndex: index,
        retiredValue: d,
        retiredColors: chipsWithValue(chipset, d).map((c) => c.name),
        nextValue: volgende,
      })
      denomIndex += 1
    }
  })

  return { levels, colorUps }
}
