/**
 * Hoe vaak elke pokerhand voorkomt, op twee momenten in dezelfde deal.
 *
 * `flop` telt de grepen van vijf kaarten uit tweeenvijftig. Dat zijn precies de
 * kaarten die je op de flop hebt: twee in je hand en drie op tafel, en je hand
 * is die vijf. `river` telt de grepen van zeven, waaruit je de beste vijf mag
 * kiezen -- je hand aan het eind.
 *
 * De twee kolommen naast elkaar vertellen wat er in de rest van de deal gebeurt:
 * twee paar wordt vijf keer zo waarschijnlijk, en de helft van de spelers die op
 * de flop niets heeft, heeft aan het eind wel iets.
 *
 * Beide tellen elke deal mee, ook die waarin je meteen folt. Aan een echte
 * tafel worden de slechte starthanden voor de flop weggelegd, dus de handen die
 * het tot de showdown halen zijn sterker dan deze percentages suggereren. Voor
 * je eigen hand klopt het wel: speel je door, dan is dit wat je hebt.
 */
export const HAND_KANSEN = [
  { naam: 'Royal flush', flop: 4, river: 4_324 },
  { naam: 'Straight flush', flop: 36, river: 37_260 },
  { naam: 'Four of a kind', flop: 624, river: 224_848 },
  { naam: 'Full house', flop: 3_744, river: 3_473_184 },
  { naam: 'Flush', flop: 5_108, river: 4_047_644 },
  { naam: 'Straight', flop: 10_200, river: 6_180_020 },
  { naam: 'Three of a kind', flop: 54_912, river: 6_461_620 },
  { naam: 'Two pair', flop: 123_552, river: 31_433_400 },
  { naam: 'One pair', flop: 1_098_240, river: 58_627_800 },
  { naam: 'High card', flop: 1_302_540, river: 23_294_460 },
] as const

/** De naam van een hand, zodat een lijst ernaast er geen kan overslaan. */
export type HandNaam = (typeof HAND_KANSEN)[number]['naam']

/** Alle grepen van vijf uit tweeenvijftig: C(52,5). */
export const HANDEN_TOT_FLOP = 2_598_960

/** Alle grepen van zeven uit tweeenvijftig: C(52,7). */
export const HANDEN_TOT_RIVER = 133_784_560

/**
 * Een aantal handen als percentage, op twee cijfers. Van 50% tot 0,024% blijft
 * het daarmee even breed; wat daaronder valt komt je toch nooit tegen en wordt
 * samengevat, zodat de kolom niet breder wordt dan de getallen die ertoe doen.
 */
export function formatteerKans(aantal: number, totaal: number): string {
  const procent = (aantal / totaal) * 100
  if (procent < 0.01) return '<0,01%'
  const decimalen = Math.max(0, 1 - Math.floor(Math.log10(procent)))
  return `${procent.toFixed(decimalen).replace('.', ',')}%`
}

/**
 * Twee starthanden tegen elkaar, all-in voor de flop. De drie getallen tellen
 * de boards waarop `hand` wint, de pot deelt of verliest van `tegen`.
 *
 * De kaarten staan hier bij de getallen en niet bij het plaatje, anders dan bij
 * `HAND_KANSEN`: de uitkomst hangt aan de precieze kaarten. Aas-koning van één
 * kleur wint drie procentpunt vaker van een laag paar dan aas-koning van twee
 * kleuren. Elk voorbeeld is daarom het kale geval -- vier verschillende kleuren
 * waar de situatie niets anders zegt, zodat geen van beiden een flush cadeau
 * krijgt of juist kwijt is.
 *
 * Geteld, niet overgenomen: de test deelt alle boards opnieuw uit met
 * `handwaarde`, en die wordt op haar beurt naast een tweede waardering gelegd.
 */
export const MATCHUPS = [
  {
    situatie: 'Hoog paar tegen twee lagere kaarten',
    hand: 'A♠ A♥',
    tegen: 'K♦ Q♣',
    wint: 1_475_740,
    deelt: 5_605,
    verliest: 230_959,
  },
  {
    situatie: 'Hoog paar tegen laag paar',
    hand: 'K♠ K♥',
    tegen: '2♦ 2♣',
    wint: 1_385_272,
    deelt: 8_592,
    verliest: 318_440,
  },
  {
    situatie: 'Twee hoge kaarten tegen laag paar',
    hand: 'A♠ K♥',
    tegen: '2♦ 2♣',
    wint: 799_119,
    deelt: 9_946,
    verliest: 903_239,
  },
  {
    situatie: 'Gedomineerde hand',
    hand: 'A♠ K♥',
    tegen: 'A♦ Q♣',
    wint: 1_228_082,
    deelt: 78_598,
    verliest: 405_624,
  },
  {
    situatie: 'Twee hoge tegen twee lage kaarten',
    hand: 'A♠ K♥',
    tegen: '7♦ 2♣',
    wint: 1_143_573,
    deelt: 7_419,
    verliest: 561_312,
  },
  {
    situatie: 'Suited connectors tegen hoog paar',
    hand: '9♦ 8♦',
    tegen: 'A♠ A♥',
    wint: 384_768,
    deelt: 5_215,
    verliest: 1_322_321,
  },
] as const

export type Matchup = (typeof MATCHUPS)[number]

/** Vijf kaarten uit de achtenveertig die de twee handen overlaten: C(48,5). */
export const BOARDS_PER_MATCHUP = 1_712_304

/**
 * Een matchup als twee hele procenten die samen honderd zijn. Een gedeelde pot
 * telt voor beide spelers half mee: het is het deel van de pot dat je op de
 * lange duur terugkrijgt, niet hoe vaak je hem helemaal wint. De tweede is de
 * rest van honderd in plaats van zelf afgerond, anders staat er bij een
 * uitkomst precies op een half procent, 50,5 tegen 49,5, ineens 51 – 50.
 */
export function matchupProcenten(matchup: { wint: number; deelt: number }): [number, number] {
  const hand = Math.round(((matchup.wint + matchup.deelt / 2) / BOARDS_PER_MATCHUP) * 100)
  return [hand, 100 - hand]
}

/**
 * Vier bekende draws op de flop, met het aantal outs: de kaarten die de hand
 * afmaken. `hand` en `flop` zijn een voorbeeld waarin geen andere weg naar het
 * doel zit dan die draw, zodat de test de outs kan natellen.
 *
 * `erbijOpRiver` zijn de outs die er na een gemiste turn bij komen. Alleen bij
 * de set is dat geen nul: de turnkaart die niet hielp ligt er dan wel, en een
 * tweede van die rang op de river maakt alsnog het full house. Zeven outs
 * worden er zo tien, en dat scheelt over twee kaarten ruim vijf procentpunt
 * (28% tegen 33%).
 */
export const DRAWS = [
  { naam: 'Flush draw', hand: 'A♦ J♦', flop: '8♦ 5♦ K♠', outs: 9, erbijOpRiver: 0 },
  {
    naam: 'Straat, open aan twee kanten',
    hand: '9♥ 8♠',
    flop: '7♦ 6♣ K♥',
    outs: 8,
    erbijOpRiver: 0,
  },
  {
    naam: 'Set naar full house of four of a kind',
    hand: '7♠ 7♥',
    flop: '7♦ K♣ 2♥',
    outs: 7,
    erbijOpRiver: 3,
  },
  { naam: 'Straat, gat in het midden', hand: '9♥ 8♠', flop: '6♦ 5♣ K♥', outs: 4, erbijOpRiver: 0 },
] as const

export type Draw = (typeof DRAWS)[number]

/** Wat je op de flop niet ziet: tweeenvijftig min je twee en de drie op tafel. */
export const KAARTEN_NA_FLOP = 47

/** Elke turn met elke river erna, in die volgorde. */
export const VOLGORDES_TURN_EN_RIVER = KAARTEN_NA_FLOP * (KAARTEN_NA_FLOP - 1)

/**
 * In hoeveel van de volgordes van turn en river de draw aankomt. Geteld via de
 * missers, want dat is één vermenigvuldiging: de turn mist, en daarna mist de
 * river ook. De rest is raak, op de turn of op de river of allebei.
 *
 * De kans op de turn alleen heeft geen functie nodig: dat zijn de outs zelf,
 * op `KAARTEN_NA_FLOP`.
 */
export function raakOpTurnOfRiver(draw: { outs: number; erbijOpRiver: number }): number {
  const misOpTurn = KAARTEN_NA_FLOP - draw.outs
  const misOpRiver = KAARTEN_NA_FLOP - 1 - draw.outs - draw.erbijOpRiver
  return VOLGORDES_TURN_EN_RIVER - misOpTurn * misOpRiver
}
