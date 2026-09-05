/**
 * Wat er in de pot zit van één speler, aan het eind van een hand. `bedrag` is
 * alles wat hij deze hand ingelegd heeft, niet wat hij nog voor zich heeft
 * staan. `gefold` betekent: hij heeft wel betaald maar dingt niet meer mee —
 * die chips blijven liggen, dat is het hele punt van folden na een inzet.
 */
export type Inzet = { naam: string; bedrag: number; gefold: boolean }

/** Eén pot met de spelers die erom mogen spelen, in de volgorde van de invoer. */
export type Pot = { bedrag: number; kanshebbers: string[] }

export type Verdeling = {
  potten: Pot[]
  /**
   * Wat er terug moet naar wie het inlegde. Ontstaat als één speler hoger ging
   * dan iemand kon volgen: die bovenste laag heeft geen tegenpartij, dus het is
   * geen pot om te winnen maar wisselgeld. Hoogstens één speler, want alleen op
   * het hoogste niveau kan er nog maar één betaler zijn.
   */
  terug?: { naam: string; bedrag: number }
}

/**
 * Verdeelt de inzetten van een hand over hoofdpot en side pots.
 *
 * Werkt per inzetniveau in plaats van per speler: elk bedrag dat iemand inlegde
 * is een grens, en tussen twee grenzen betaalt iedereen die zover kwam evenveel.
 * Dat is precies wat een side pot is, en het is de enige manier waarop het ook
 * klopt bij drie of vier all-ins op verschillende hoogtes — het geval waar het
 * aan tafel altijd misgaat.
 *
 * Degeneratie die hier bewust niet opgelost wordt: legt op één niveau meer dan
 * één speler in terwijl ze allemaal gefold zijn, dan komt er een pot uit zonder
 * kanshebbers. Dat kan in een echte hand niet gebeuren — iemand moet de laatste
 * inzet gevolgd hebben — dus het is een teken van verkeerde invoer, en dat hoort
 * zichtbaar te zijn in plaats van weggerekend.
 */
export function verdeelPotten(inzetten: readonly Inzet[]): Verdeling {
  // Wie niets in de pot heeft telt nergens in mee, ook niet als kanshebber.
  const meebetalers = inzetten.filter((inzet) => inzet.bedrag > 0)
  const niveaus = [...new Set(meebetalers.map((inzet) => inzet.bedrag))].sort((a, b) => a - b)

  const potten: Pot[] = []
  let terug: Verdeling['terug']
  let vorigNiveau = 0

  for (const niveau of niveaus) {
    const betalers = meebetalers.filter((inzet) => inzet.bedrag >= niveau)
    const bedrag = (niveau - vorigNiveau) * betalers.length
    vorigNiveau = niveau

    if (betalers.length === 1) {
      // Niemand ging mee tot hier, dus er valt niets te winnen.
      terug = { naam: betalers[0].naam, bedrag }
      continue
    }

    potten.push({
      bedrag,
      kanshebbers: betalers.filter((inzet) => !inzet.gefold).map((inzet) => inzet.naam),
    })
  }

  return terug ? { potten, terug } : { potten }
}
