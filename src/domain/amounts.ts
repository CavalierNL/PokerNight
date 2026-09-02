/**
 * De stap waarop een bedrag afgerond wordt: een tiende van zijn eigen
 * grootteorde, maar nooit kleiner dan de kleinste fiche dat je op tafel kunt
 * leggen. Zo wordt 124 afgerond op 120 en 2677 op 2700 — bedragen die aan tafel
 * natuurlijk lezen en met weinig fiches te betalen zijn.
 */
export function niceStep(amount: number, d: number): number {
  if (amount <= 0) return d
  const grootteorde = Math.pow(10, Math.floor(Math.log10(amount)) - 1)
  return Math.max(d, grootteorde)
}

/**
 * Rondt `amount` af op een betaalbaar bedrag: een veelvoud van de fichewaarde,
 * op een stap die met het bedrag meeschaalt. Met `mustExceed` is de uitkomst
 * gegarandeerd strikt groter dan die waarde, zodat een blindstructuur nooit
 * stilstaat of terugloopt.
 */
export function roundToPayable(amount: number, d: number, mustExceed = 0): number {
  const stap = niceStep(Math.max(amount, mustExceed), d)
  let waarde = Math.max(d, Math.round(amount / stap) * stap)
  while (waarde <= mustExceed) waarde += stap
  return waarde
}

/**
 * De kleine blind: het grootste veelvoud van de fichewaarde dat niet boven de
 * helft van de big blind uitkomt, met een minimum van één fiche.
 */
export function smallBlindFor(bigBlind: number, d: number): number {
  return Math.max(d, Math.floor(bigBlind / 2 / d) * d)
}
