/**
 * Eén gespeelde avond. `uitslag` staat van winnaar naar wie het eerst uitviel,
 * dezelfde volgorde als het eindscherm toont.
 *
 * `id` is het starttijdstip van het toernooi. Dat is uniek genoeg voor deze
 * schaal en het houdt hetzelfde toernooi op één regel: een afgerond toernooi
 * blijft in de opslag staan tot er op Klaar gedrukt wordt, dus na een refresh
 * wordt het opnieuw ingelezen en zou het zonder vaste sleutel een tweede keer
 * bijgeschreven worden.
 */
export type Avond = { id: number; datum: number; uitslag: string[] }

export type Klassementsregel = {
  naam: string
  punten: number
  avonden: number
  overwinningen: number
}

/**
 * Wat een plaats waard is. De winnaar krijgt zoveel punten als er spelers waren,
 * de laatste één. Zo weegt een avond met acht mensen zwaarder dan een avond met
 * drie — acht verslaan is meer dan twee verslaan — en levert meedoen altijd iets
 * op, want anders is vroeg uitvallen precies zoveel waard als er niet zijn.
 *
 * `plaats` telt vanaf 0, net als de index in `uitslag`.
 */
export function puntenVoor(plaats: number, aantalSpelers: number): number {
  return aantalSpelers - plaats
}

/**
 * De stand over alle avonden, de hoogste eerst.
 *
 * Bij gelijke punten wint wie vaker eerste werd: het is een pokeravond en geen
 * aanwezigheidslijst. Blijft het daarna nog gelijk, dan beslist de naam. Dat is
 * niet nodig om de volgorde stabiel te houden — `sort` is stabiel en de
 * invoegvolgorde ligt vast — maar wel om hem voorspelbaar te maken voor wie
 * ernaar kijkt: op alfabet in plaats van op wie er toevallig het eerst een avond
 * meespeelde.
 *
 * Staat dezelfde naam twee keer in één uitslag, dan telt alleen zijn beste
 * plaats. Dat kan echt: het setupscherm dedupliceert niet en een laatkomer krijgt
 * een vrij getypte naam. Zonder deze regel kreeg zo iemand twee keer punten en
 * telde één avond voor twee — met acht spelers meer punten dan een avond
 * maximaal kan opleveren.
 */
export function klassement(avonden: readonly Avond[]): Klassementsregel[] {
  const regels = new Map<string, Klassementsregel>()

  for (const avond of avonden) {
    const gezien = new Set<string>()
    avond.uitslag.forEach((naam, plaats) => {
      if (gezien.has(naam)) return
      gezien.add(naam)

      const regel = regels.get(naam) ?? { naam, punten: 0, avonden: 0, overwinningen: 0 }
      regel.punten += puntenVoor(plaats, avond.uitslag.length)
      regel.avonden += 1
      if (plaats === 0) regel.overwinningen += 1
      regels.set(naam, regel)
    })
  }

  return [...regels.values()].sort(
    (a, b) =>
      b.punten - a.punten ||
      b.overwinningen - a.overwinningen ||
      a.naam.localeCompare(b.naam, 'nl'),
  )
}

/**
 * Elke overwinning met de datum erbij, de nieuwste eerst.
 *
 * Sorteert zelf op datum en vertrouwt niet op de volgorde van de invoer: de
 * opslag bewaart de avonden wel gesorteerd, maar dat is een eigenschap van de
 * aanroeper en niet van dit type.
 */
export function hallOfFame(avonden: readonly Avond[]): { naam: string; datum: number }[] {
  return avonden
    .filter((avond) => avond.uitslag.length > 0)
    .map((avond) => ({ naam: avond.uitslag[0], datum: avond.datum }))
    .sort((a, b) => b.datum - a.datum)
}

/**
 * Schrijft een avond bij, op `id` — het starttijdstip van het toernooi.
 *
 * Staat er al een avond met dezelfde uitslag, dan komt exact dezelfde lijst
 * terug: hetzelfde object, zodat een aanroeper in een render eraan kan zien dat
 * er niets te bewaren valt.
 *
 * Maar verschilt de uitslag, dan vervangt de nieuwe de oude. Dat is geen detail:
 * het eindscherm heeft een knop "Ongedaan maken" voor als de verkeerde speler is
 * afgetikt. Zonder vervangen zou de eerste — foute — uitslag blijven staan en
 * zou de correctie er nooit meer in komen, terwijl het scherm de goede winnaar
 * toont. Het klassement zou dan stil iemand anders de zege geven.
 */
export function metAvond(avonden: readonly Avond[], avond: Avond): Avond[] {
  const bestaand = avonden.find((eerder) => eerder.id === avond.id)
  if (bestaand && zelfdeUitslag(bestaand.uitslag, avond.uitslag)) return avonden as Avond[]

  const rest = avonden.filter((eerder) => eerder.id !== avond.id)
  return [...rest, avond].sort((a, b) => a.datum - b.datum)
}

function zelfdeUitslag(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((naam, index) => naam === b[index])
}
