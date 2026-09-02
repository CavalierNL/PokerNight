export type Payout = {
  /** 1 is de winnaar. */
  place: number
  /** Bedrag in hele euro's. */
  amount: number
}

export type Payouts = {
  /** Wat er te verdelen is, in hele euro's. */
  pot: number
  places: Payout[]
}

/** Verdeling in procenten, naar groepsgrootte. Telt altijd op tot 100. */
export function payoutPercentages(players: number): number[] {
  if (players <= 4) return [100]
  if (players <= 7) return [65, 35]
  if (players <= 11) return [50, 30, 20]
  return [40, 25, 20, 15]
}

/**
 * Verdeelt de pot over de betaalde plaatsen.
 *
 * De pot wordt naar beneden afgerond op hele euro's: bij een inleg van € 7,50
 * met vijf spelers zit er € 37,50 in de doos, en er wordt € 37 uitbetaald. Naar
 * boven afronden zou € 38 uitkeren uit een kas die dat niet heeft.
 *
 * Elk bedrag wordt eveneens naar beneden afgerond; het restant gaat naar de
 * winnaar, zodat de som exact de pot is en er geen munten over blijven.
 */
export function calculatePayouts(buyIn: number, players: number): Payouts {
  const pot = Math.max(0, Math.floor(buyIn * players))
  const percentages = payoutPercentages(players)

  const bedragen = percentages.map((p) => Math.floor((pot * p) / 100))
  bedragen[0] += pot - bedragen.reduce((som, b) => som + b, 0)

  return { pot, places: bedragen.map((amount, i) => ({ place: i + 1, amount })) }
}
