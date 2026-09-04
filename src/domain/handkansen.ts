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
