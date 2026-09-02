import { chipsWithValue, denominations, type Chipset } from './chipset'
import { roundToPayable, smallBlindFor } from './amounts'

export type StructureKind = 'ladder' | 'calculated' | 'doubling' | 'manual'

export type BlindLevel = {
  index: number
  smallBlind: number
  bigBlind: number
}

export type ColorUp = {
  /** Het level waarop deze kleur uit het spel mag. */
  levelIndex: number
  retiredValue: number
  /**
   * De hex-kleuren die uit het spel gaan, en die je ervoor terugkrijgt. Ze staan
   * hier in plaats van dat het scherm ze bij de chipset ophaalt: een lopend
   * toernooi moet de fiches kunnen tonen zoals ze bij de start waren, ook als de
   * doos daarna is aangepast of verwijderd.
   */
  retiredColors: string[]
  nextValue: number
  nextColors: string[]
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
 * De ladder van bedragen die je aan tafel zonder rekenen kunt leggen: 1, 2, 5,
 * 10, 20, 50, 100 … Elke stap is een veelvoud van tien met een 1, 2 of 5 ervoor.
 */
export function ladderRung(index: number): number {
  const factoren = [1, 2, 5]
  return factoren[index % 3] * 10 ** Math.floor(index / 3)
}

/**
 * De eerstvolgende big blind op de ladder, geschaald op de fichewaarde die nu in
 * het spel is. De big blind is `2 × fichewaarde × sport`, zodat de kleine blind
 * exact de helft is en allebei met hele fiches te leggen zijn.
 *
 * Schuift de ladder mee na een color-up: de sport wordt opnieuw gezocht bij de
 * nieuwe kleinste fichewaarde, in plaats van door te tellen op de oude.
 */
function ladderBigBlind(denomination: number, minimum: number, strikt: boolean): number {
  for (let i = 0; i < 60; i += 1) {
    const bigBlind = 2 * denomination * ladderRung(i)
    if (strikt ? bigBlind > minimum : bigBlind >= minimum) return bigBlind
  }
  // Onbereikbaar bij realistische invoer: sport 59 is al 2×10^19.
  return minimum + 2 * denomination
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

  const start = Math.max(input.startingStack / 100, kleinste * 2)

  for (const ruweBb of ruw) {
    const index = levels.length
    const d = denoms[denomIndex] ?? 1

    // Afronden op een veelvoud van twee fichewaardes, niet één: de kleine blind
    // is de helft van de big blind, dus alleen dan zijn ze allebei met hele
    // fiches te betalen. Afronden op enkelvoudige fichewaardes levert paren als
    // 30/65 op.
    const ondergrens = Math.max(vorigeBigBlind, d)
    const bigBlind =
      input.kind === 'ladder'
        ? ladderBigBlind(d, index === 0 ? start : vorigeBigBlind, index > 0)
        : roundToPayable(Math.max(ruweBb, d * 2), d * 2, ondergrens)
    const smallBlind = smallBlindFor(bigBlind, d)
    levels.push({ index, smallBlind, bigBlind })
    vorigeBigBlind = bigBlind

    // Is de kleinste kleur nog nuttig? Zodra de kleine blind tien keer die
    // waarde is, kun je hem uit het spel halen.
    const isLaatsteDenominatie = denomIndex >= denoms.length - 1
    if (chipset.colorUp && !isLaatsteDenominatie && smallBlind >= 10 * d) {
      colorUps.push({
        levelIndex: index,
        retiredValue: d,
        retiredColors: chipsWithValue(chipset, d).map((c) => c.color),
        nextValue: denoms[denomIndex + 1],
        nextColors: chipsWithValue(chipset, denoms[denomIndex + 1]).map((c) => c.color),
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
    //
    // De ladder kapt bewust níét af. Levels boven het beslispunt worden nooit
    // bereikt, maar afkappen zou de reeks korter maken dan de opgegeven duur
    // zonder dat er een instelling is die dat rechttrekt — en het zou de
    // waarschuwing over hard oplopende blinds hieronder de mond snoeren, terwijl
    // die precies het goede verhaal vertelt.
    const genoegLevels = levels.length >= 2
    if (input.kind === 'calculated' && genoegLevels && bigBlind >= doelEind) break
  }

  return { levels, colorUps, startDenomination }
}
