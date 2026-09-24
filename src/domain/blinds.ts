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
  /** Leeg betekent: doorspelen tot er één over is. */
  durationMinutes?: number
  levelMinutes: number
  manualBigBlinds?: number[]
  /** Of de kleinste kleur onderweg uit het spel mag. */
  colorUp: boolean
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

/**
 * Een ruime bovengrens voor de lengte van de reeks. Hij stopt daar niet op: hij
 * stopt op een blindwaarde en niet op een aantal. Dit is alleen een vangnet
 * tegen een oneindige lus.
 */
export const MAX_LEVELS = 40

/**
 * Het aantal levels dat in de geplande duur past, minimaal twee.
 *
 * Dat is een plan en geen grens. Het doet twee dingen: het stuurt de curve van
 * een berekende reeks — hoe groot de stappen moeten zijn om het eindpunt aan het
 * eind van de avond te halen — en het is de laatste rij waarvoor een starttijd
 * te voorspellen valt. Waar de reeks ophoudt hangt van de blindwaarde af en niet
 * hiervan: schuiven eliminaties de levels sneller op dan de klok, dan raken de
 * levels anders halverwege de avond op.
 */
export function levelCount(durationMinutes: number | undefined, levelMinutes: number): number {
  if (durationMinutes === undefined) return MAX_LEVELS
  if (levelMinutes <= 0) return 2
  return Math.max(2, Math.floor(durationMinutes / levelMinutes))
}

/**
 * Het aantal levels dat in de geplande avond past, of `undefined` als er geen
 * duur is afgesproken en er dus niets te plannen valt.
 *
 * De vorm waarin de schermen het willen: zij vragen niet "hoeveel levels", maar
 * "tot waar is dit nog een plan".
 */
export function geplandeLevels(
  durationMinutes: number | undefined,
  levelMinutes: number,
): number | undefined {
  return durationMinutes === undefined ? undefined : levelCount(durationMinutes, levelMinutes)
}

/**
 * De levellengtes die een duur precies vullen, als "N levels van M minuten".
 *
 * Een levellengte die niet in de duur past betekent dat het laatste level halверwege
 * afgekapt wordt — dan klopt de opgegeven duur niet met wat je speelt. Door alleen
 * de delers aan te bieden is de keuze in feite hoeveel levels je wilt, en volgt
 * hun lengte daaruit.
 *
 * Eerst in het bereik dat aan tafel prettig speelt. Levert dat niets op — bij een
 * priemgetal of een heel korte avond — dan wordt het bereik verruimd, want geen
 * enkele keuze aanbieden is erger dan een ongebruikelijke.
 */
export function levelOpties(durationMinutes: number): { levels: number; levelMinutes: number }[] {
  const zoek = (van: number, tot: number) => {
    const opties: { levels: number; levelMinutes: number }[] = []
    for (let lengte = van; lengte <= tot; lengte += 1) {
      if (durationMinutes % lengte !== 0) continue
      const levels = durationMinutes / lengte
      if (levels >= 2) opties.push({ levels, levelMinutes: lengte })
    }
    return opties
  }
  const prettig = zoek(10, 30)
  return prettig.length > 0 ? prettig : zoek(2, 60)
}

/**
 * Met hoeveel een level groeit ten opzichte van het vorige. `calculated` past
 * zijn factor juist aan het aantal levels aan en heeft er dus geen vaste;
 * `manual` volgt wat je zelf opgeeft.
 */
export function groeiPerLevel(kind: StructureKind): number | undefined {
  // De ladder verdubbelt vanaf de derde sport; de eerste twee stappen wijken af,
  // maar voor het schatten van het aantal levels telt de staart.
  if (kind === 'ladder') return 2
  if (kind === 'doubling') return 2
  return undefined
}

/**
 * De big blind waar de structuur naartoe werkt: bij nog drie spelers over is de
 * gemiddelde stack dan ongeveer tien big blinds.
 */
export function targetEndBigBlind(players: number, startingStack: number): number {
  return (players * startingStack) / 3 / 10
}

/**
 * Waar de reeks ophoudt als er geen eindtijd is.
 *
 * `targetEndBigBlind` markeert het punt waarop een toernooi feitelijk beslist is
 * — een zinnige grens als je op een afgesproken tijd stopt, maar bij last man
 * standing speel je juist dóór na dat punt en is de structuur dan op. Hier telt
 * pas het echte einde: alle chips bij twee spelers, elk nog een big blind of
 * twee, en de volgende hand beslist het. Dat is de big blind op een kwart van
 * wat er in het spel is.
 */
export function laatsteBigBlind(players: number, startingStack: number): number {
  return (players * startingStack) / 4
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
  const gepland = levelCount(input.durationMinutes, input.levelMinutes)
  const start = smallestDenomination * 2

  const eigenBedragen = handmatigeBedragen(input)
  if (eigenBedragen) return eigenBedragen

  if (input.kind === 'calculated') {
    const eind = targetEndBigBlind(input.players, input.startingStack)
    // De factor volgt het plan: in `gepland` stappen van de start naar het
    // eindpunt. De lijst is langer, zodat de reeks doorloopt als eliminaties de
    // levels sneller opschuiven dan de klok; `buildStructure` kapt hem op
    // waarde af.
    const factor = Math.pow(Math.max(eind, start * 2) / start, 1 / (gepland - 1))
    return Array.from({ length: MAX_LEVELS }, (_, i) => start * factor ** i)
  }

  return Array.from({ length: MAX_LEVELS }, (_, i) => start * 2 ** i)
}

/**
 * De zelf opgegeven bedragen, of `undefined` als er niets bruikbaars staat — dan
 * valt `manual` terug op verdubbelen, zodat er altijd een structuur uitkomt.
 *
 * Staat hier als eigen functie omdat twee plekken hem nodig hebben: welke reeks
 * er gemaakt wordt, en of die reeks afgekapt mag worden. Uit elkaar lopen zou
 * betekenen dat een lege handmatige lijst veertig verdubbelingen oplevert.
 */
function handmatigeBedragen(input: StructureInput): number[] | undefined {
  if (input.kind !== 'manual') return undefined
  return input.manualBigBlinds && input.manualBigBlinds.length > 0
    ? input.manualBigBlinds
    : undefined
}

/**
 * De blindreeks: 1, 2, 5, en vanaf daar verdubbelen — 10, 20, 40, 80, 160 …
 *
 * De sprong van 20 naar 50 die een doorlopende 1-2-5 reeks maakt, is aan tafel
 * niet nodig: na de 5 volstaat verdubbelen, en dat is bovendien makkelijker te
 * volgen dan een reeks die per decennium van stapgrootte wisselt.
 */
export function ladderRung(index: number): number {
  if (index < 2) return index + 1
  return 5 * 2 ** (index - 2)
}

/**
 * Ronde bedragen: 1, 2, 5, 10, 20, 50, 100 … Voor bedragen die geen reeks zijn
 * maar gewoon rond moeten uitkomen, zoals een startstack. De blindreeks
 * hierboven verdubbelt en levert daar getallen als 8000 op waar 5000 bedoeld is.
 */
export function rondBedrag(index: number): number {
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

  // Hetzelfde beginpunt als `rawBigBlinds` hanteert: de kleinste chip.
  const start = kleinste * 2
  // Met twee waardes hou je na een color-up één soort fiche over; dan valt er
  // niets meer te wisselen en heeft het geen zin.
  const colorUpMogelijk = input.colorUp && denoms.length >= 3

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
    if (colorUpMogelijk && !isLaatsteDenominatie && smallBlind >= 10 * d) {
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

    // De reeks stopt op een blindwaarde en niet op een aantal levels. Dat
    // laatste was ooit het geplande aantal, maar dat plan gaat over de klok
    // terwijl een eliminatie de levels ook opschuift: wie snel speelde raakte
    // halverwege de avond door zijn blinds heen.
    //
    // Berekend houdt zich aan zijn eigen belofte en stopt op het doel. Bij een
    // kleine startstack nadert de groeifactor 1, en dan duwt de afronding elke
    // keer een volle stap omhoog — zonder afkappen schiet de reeks het doel met
    // een veelvoud voorbij. De rest loopt door tot waar er niets meer te spelen
    // valt: alle chips bij twee spelers.
    //
    // Handmatig kapt nergens op af. Dat is precies de lijst die is opgegeven, en
    // is hij op, dan blijven de blinds op het laatste bedrag staan.
    const stoptBijEinde = handmatigeBedragen(input) === undefined
    const grens =
      input.kind === 'calculated'
        ? doelEind
        : laatsteBigBlind(input.players, input.startingStack)
    const genoegLevels = levels.length >= 2
    if (stoptBijEinde && genoegLevels && bigBlind >= grens) break
  }

  return { levels, colorUps, startDenomination }
}
