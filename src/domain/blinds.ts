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
  /**
   * De kleinste fichewaarde die op level 0 nog in het spel is. Bij een grote
   * startstack gaan de kleinste kleuren meteen eruit; de chipverdeling moet die
   * dan niet als startfiches reserveren.
   */
  startDenomination: number
}

/** Aantal levels dat in de geplande duur past, minimaal twee. */
export function levelCount(durationMinutes: number, levelMinutes: number): number {
  if (levelMinutes <= 0) return 2
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
 *
 * Bij `manual` gelden de opgegeven bedragen als wens, niet als voorschrift:
 * `buildStructure` rondt ze af en dwingt ze zo nodig omhoog om de reeks stijgend
 * te houden. Een lege lijst valt terug op verdubbelen, zodat er altijd een
 * structuur uitkomt.
 */
function rawBigBlinds(input: StructureInput, smallestDenomination: number): number[] {
  const aantal = levelCount(input.durationMinutes, input.levelMinutes)
  const start = Math.max(input.startingStack / 100, smallestDenomination * 2)

  if (input.kind === 'manual' && input.manualBigBlinds && input.manualBigBlinds.length > 0) {
    return input.manualBigBlinds
  }

  if (input.kind === 'calculated') {
    const eind = targetEndBigBlind(input.players, input.startingStack)
    const factor = Math.pow(Math.max(eind, start * 2) / start, 1 / (aantal - 1))
    return Array.from({ length: aantal }, (_, i) => start * factor ** i)
  }

  return Array.from({ length: aantal }, (_, i) => start * 2 ** i)
}

/**
 * Bouwt de structuur level voor level op. Dat moet sequentieel: afronden hangt
 * af van de kleinste actieve denominatie, en die verschuift zodra een color-up
 * plaatsvindt — wat op zijn beurt van de al berekende blinds afhangt.
 */
export function buildStructure(input: StructureInput, chipset: Chipset): Structure {
  const denoms = denominations(chipset)
  const kleinste = denoms[0] ?? 1
  const ruw = rawBigBlinds(input, kleinste)
  const doelEind = targetEndBigBlind(input.players, input.startingStack)

  const levels: BlindLevel[] = []
  const colorUps: ColorUp[] = []
  let denomIndex = 0
  let vorigeBigBlind = 0
  let startDenomination = kleinste

  for (const ruweBb of ruw) {
    const index = levels.length
    const d = denoms[denomIndex] ?? 1

    // Afronden op een veelvoud van twee fichewaardes, niet één: de kleine blind
    // is de helft van de big blind, dus alleen dan zijn ze allebei met hele
    // fiches te betalen. Afronden op enkelvoudige fichewaardes levert paren als
    // 30/65 op.
    const ondergrens = Math.max(vorigeBigBlind, d)
    const bigBlind = roundToPayable(Math.max(ruweBb, d * 2), d * 2, ondergrens)
    const smallBlind = smallBlindFor(bigBlind, d)
    levels.push({ index, smallBlind, bigBlind })
    vorigeBigBlind = bigBlind

    // Is de kleinste kleur nog nuttig? Zodra de kleine blind tien keer die
    // waarde is, kun je hem uit het spel halen.
    const isLaatsteDenominatie = denomIndex >= denoms.length - 1
    if (!isLaatsteDenominatie && smallBlind >= 10 * d) {
      colorUps.push({
        levelIndex: index,
        retiredValue: d,
        retiredColors: chipsWithValue(chipset, d).map((c) => c.name),
        nextValue: denoms[denomIndex + 1],
      })
      denomIndex += 1
      // Gaat deze kleur op level 0 al weg, dan begint het toernooi zonder hem en
      // hoeft de chipverdeling hem niet uit te delen.
      if (index === 0) startDenomination = denoms[denomIndex]
    }

    // Een berekende structuur mikt op een eindpunt. Bij een kleine startstack
    // nadert de groeifactor 1, en dan duwt de afronding elke keer een volle stap
    // omhoog — waardoor de reeks het doel met een veelvoud voorbijschiet.
    // Afkappen zodra het doel gehaald is houdt hem bij zijn eigen belofte.
    const genoegLevels = levels.length >= 2
    if (input.kind === 'calculated' && genoegLevels && bigBlind >= doelEind) break
  }

  return { levels, colorUps, startDenomination }
}
