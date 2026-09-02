/**
 * De grofheid waarmee een bedrag afgerond mag worden: een tiende van zijn eigen
 * grootteorde. Zo hoort 124 op tientallen afgerond te worden en 2677 op
 * honderdtallen — dat leest aan tafel als een normaal bedrag.
 *
 * `unit` is de ondergrens: fijner dan één fiche afronden heeft geen zin.
 */
export function niceStep(amount: number, unit: number): number {
  if (amount <= 0) return unit
  const grootteorde = Math.pow(10, Math.floor(Math.log10(amount)) - 1)
  return Math.max(unit, grootteorde)
}

/**
 * Rondt `amount` af op een bedrag dat je met de aanwezige fiches kunt leggen:
 * altijd een veelvoud van `unit`, op een stap die met de grootte van het bedrag
 * meeschaalt.
 *
 * De stap wordt zelf op een veelvoud van `unit` gezet. Zonder die correctie is de
 * uitkomst een veelvoud van de grootteorde-stap maar niet van `unit` — bij een
 * fichewaarde van 3 zou 102 op 100 uitkomen, en 100 kun je met fiches van 3 niet
 * leggen.
 *
 * `roundToPayable(124.5, 1)` is 120, `roundToPayable(2677, 1)` is 2700.
 *
 * Met `mustExceed` is de uitkomst gegarandeerd strikt groter dan die waarde,
 * zodat een blindstructuur nooit stilstaat of terugloopt.
 */
export function roundToPayable(amount: number, unit: number, mustExceed = 0): number {
  const grof = niceStep(Math.max(amount, mustExceed), unit)
  const stap = Math.max(unit, Math.round(grof / unit) * unit)
  let waarde = Math.max(unit, Math.round(amount / stap) * stap)
  while (waarde <= mustExceed) waarde += stap
  return waarde
}

/**
 * De kleine blind: het grootste veelvoud van de fichewaarde dat niet boven de
 * helft van de big blind uitkomt, met een minimum van één fiche. Is de big blind
 * op een veelvoud van `2 × d` afgerond — wat `buildStructure` doet — dan komt
 * hier exact de helft uit.
 */
export function smallBlindFor(bigBlind: number, d: number): number {
  return Math.max(d, Math.floor(bigBlind / 2 / d) * d)
}
