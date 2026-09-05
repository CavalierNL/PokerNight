/**
 * Wat er in de pot zit van één speler, aan het eind van een hand. `bedrag` is
 * alles wat hij deze hand ingelegd heeft, niet wat hij nog voor zich heeft
 * staan. `gefold` betekent: hij heeft wel betaald maar dingt niet meer mee —
 * die chips blijven liggen, dat is het hele punt van folden na een inzet.
 *
 * `naam` is hier de identiteit van een speler. Dat gaat goed zolang er geen twee
 * spelers met dezelfde naam aan tafel zitten; de app dwingt dat niet af, dus de
 * berekening rekent op objecten en niet op namen, en alleen de uitvoer wordt
 * dan onleesbaar in plaats van fout.
 */
export type Inzet = { naam: string; bedrag: number; gefold: boolean }

/**
 * Eén pot met de spelers die erom mogen spelen, in de volgorde van de invoer.
 *
 * Geen kanshebbers betekent verkeerde invoer — zie `verdeelPotten` — en hoort
 * zichtbaar te blijven in plaats van weggerekend. Verberg deze pot dus niet in
 * de weergave.
 */
export type Pot = { bedrag: number; kanshebbers: string[] }

/**
 * Wat er terug moet naar wie het inlegde. Ontstaat als één speler hoger ging dan
 * iemand kon volgen: die bovenste laag heeft geen tegenpartij, dus het is geen
 * pot om te winnen maar wisselgeld.
 */
export type Wisselgeld = { naam: string; bedrag: number }

export type Verdeling = {
  /** Van laag naar hoog: `potten[0]` is de hoofdpot, daarna de side pots. */
  potten: Pot[]
  /**
   * Hoogstens één, want alleen op het hoogste niveau kan er nog maar één
   * betaler zijn: elk niveau is de inleg van een meebetaler, dus een niveau met
   * één betaler is noodzakelijk het hoogste.
   */
  terug?: Wisselgeld
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
  // Afronden hoort hier en niet in het invoerveld: elke aanroeper heeft er
  // hetzelfde aan, en zo is de functie totaal voor elk getal. Math.floor(NaN)
  // blijft NaN en valt op `> 0` af, net als een negatief bedrag — wie niets in
  // de pot heeft telt nergens in mee, ook niet als kanshebber.
  const meebetalers = inzetten
    .map((inzet) => ({ ...inzet, bedrag: Math.floor(inzet.bedrag) }))
    .filter((inzet) => inzet.bedrag > 0)

  // Oplopend sorteren is dragend, niet cosmetisch: `niveau - vorigNiveau`
  // hieronder is alleen een bandbreedte als de niveaus oplopen. Zonder deze
  // sortering komen er negatieve potbedragen uit, zonder dat er iets crasht.
  const niveaus = [...new Set(meebetalers.map((inzet) => inzet.bedrag))].sort((a, b) => a - b)

  const potten: Pot[] = []
  let terug: Wisselgeld | undefined
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

    const kanshebbers = betalers.filter((inzet) => !inzet.gefold).map((inzet) => inzet.naam)

    // Een niveaugrens bij het bedrag van iemand die gefold is levert een laag op
    // waar precies dezelfde mensen om spelen als om de laag eronder. Dat is aan
    // tafel geen side pot maar één pot: een side pot betekent dat er een ándere
    // speler aanspraak op kan maken. Twee regels tonen die naar dezelfde mensen
    // gaan nodigt uit tot twee keer uitbetalen.
    const vorige = potten[potten.length - 1]
    if (vorige && zelfdeSpelers(vorige.kanshebbers, kanshebbers)) {
      vorige.bedrag += bedrag
      continue
    }

    potten.push({ bedrag, kanshebbers })
  }

  return terug ? { potten, terug } : { potten }
}

/**
 * Of twee potten naar dezelfde mensen kunnen gaan. Op volgorde vergelijken mag:
 * beide lijsten komen uit dezelfde invoervolgorde, en de tweede is een deelrij
 * van de eerste.
 */
function zelfdeSpelers(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((naam, index) => naam === b[index])
}

/**
 * Alles wat er uit de verdeling komt: de potten plus het wisselgeld. Hoort
 * gelijk te zijn aan wat erin ging.
 *
 * Bestaat omdat de optionele `terug` uitnodigt tot alleen de potten optellen, en
 * dan klopt het totaal aan tafel niet met wat er in het midden ligt.
 */
export function totaalUit(verdeling: Verdeling): number {
  const inPotten = verdeling.potten.reduce((som, pot) => som + pot.bedrag, 0)
  return inPotten + (verdeling.terug?.bedrag ?? 0)
}
