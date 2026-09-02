export type Payout = {
  /** 1 is de winnaar. */
  place: number
  /** Bedrag in hele euro's. */
  amount: number
}

/** Verdeling in procenten, naar groepsgrootte. */
export function payoutPercentages(players: number): number[] {
  if (players <= 4) return [100]
  if (players <= 7) return [65, 35]
  if (players <= 11) return [50, 30, 20]
  return [40, 25, 20, 15]
}

/**
 * Verdeelt de pot over de betaalde plaatsen. Elk bedrag wordt naar beneden
 * afgerond op hele euro's; het restant gaat naar de winnaar, zodat de som altijd
 * exact de pot is en er geen munten over blijven.
 */
export function calculatePayouts(buyIn: number, players: number): Payout[] {
  const pot = Math.round(buyIn * players)
  const percentages = payoutPercentages(players)

  const bedragen = percentages.map((p) => Math.floor((pot * p) / 100))
  const restant = pot - bedragen.reduce((som, b) => som + b, 0)
  bedragen[0] += restant

  return bedragen.map((amount, i) => ({ place: i + 1, amount }))
}
