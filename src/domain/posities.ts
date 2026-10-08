/**
 * De plaatsen aan tafel die een eigen naam hebben. Alleen deze: het zijn de
 * namen die in een regel voorkomen ("de eerste speler links van de button") of
 * die aan een thuistafel ook echt gezegd worden. Wat daartussen zit heet per
 * boek anders en blijft hier naamloos.
 */
export type PositieNaam = 'Button' | 'Small blind' | 'Big blind' | 'Under the gun' | 'Cut-off'

export type Positie = {
  /** Hoeveel plaatsen links van de button; de button zelf is 0. */
  plaats: number
  /** Meestal één naam. Twee als dezelfde stoel beide rollen heeft. */
  namen: PositieNaam[]
}

/**
 * Welke namen er aan tafel zijn bij dit aantal spelers, met de klok mee vanaf de
 * button.
 *
 * Under the gun en cut-off zijn namen voor stoelen die geen button en geen blind
 * zijn. Met drie spelers is er zo'n stoel niet, dus dan vallen beide weg; met
 * vier is er precies één en die draagt ze allebei. Heads-up is de button zelf de
 * small blind — dat is geen keuze maar de regel.
 *
 * Onder de twee spelers valt er niets te verdelen en is de lijst leeg, net als
 * bij een aantal dat geen geheel getal is.
 */
export function positiesBij(aantalSpelers: number): Positie[] {
  if (!Number.isInteger(aantalSpelers) || aantalSpelers < 2) return []

  const headsUp = aantalSpelers === 2
  const stoelen: [PositieNaam, number][] = [
    ['Button', 0],
    ['Small blind', headsUp ? 0 : 1],
    ['Big blind', headsUp ? 1 : 2],
  ]
  if (aantalSpelers > 3) {
    stoelen.push(['Under the gun', 3], ['Cut-off', aantalSpelers - 1])
  }

  const posities: Positie[] = []
  for (const [naam, plaats] of stoelen) {
    const bestaand = posities.find((positie) => positie.plaats === plaats)
    if (bestaand) bestaand.namen.push(naam)
    else posities.push({ plaats, namen: [naam] })
  }
  return posities
}

/**
 * Hoeveel spelers op een stoel zonder naam zitten. Vanaf zes spelers zijn dat
 * de plaatsen tussen under the gun en de cut-off.
 */
export function naamlozePlaatsen(aantalSpelers: number): number {
  const posities = positiesBij(aantalSpelers)
  return posities.length === 0 ? 0 : aantalSpelers - posities.length
}
