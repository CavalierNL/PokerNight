/**
 * Een bron van toeval. Als argument en niet als vaste aanroep van `Math.random`,
 * zodat een test de uitkomst kan vastleggen: bij loten is "het lijkt
 * willekeurig" niet te controleren, en dit is de enige manier om te weten dat
 * er niemand verdwijnt of dubbel komt te zitten.
 */
export type Toeval = () => number

/** Een getal van 0 tot en met `max`, ook als de bron precies 1 teruggeeft. */
function tot(max: number, toeval: Toeval): number {
  return Math.min(max, Math.floor(toeval() * (max + 1)))
}

/** Fisher-Yates: elke volgorde even waarschijnlijk, en de invoer blijft heel. */
export function schud<T>(items: readonly T[], toeval: Toeval = Math.random): T[] {
  const uit = [...items]
  for (let i = uit.length - 1; i > 0; i -= 1) {
    const j = tot(i, toeval)
    ;[uit[i], uit[j]] = [uit[j], uit[i]]
  }
  return uit
}

/** De index van wie de eerste hand deelt, of `undefined` zonder spelers. */
export function kiesDealer(aantal: number, toeval: Toeval = Math.random): number | undefined {
  if (aantal <= 0) return undefined
  return tot(aantal - 1, toeval)
}
