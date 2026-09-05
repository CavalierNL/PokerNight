/**
 * Eén gespeelde avond. `uitslag` staat van winnaar naar wie het eerst uitviel,
 * dezelfde volgorde als het eindscherm toont.
 *
 * `id` is het starttijdstip van het toernooi. Dat is uniek genoeg voor deze
 * schaal en het maakt het bijschrijven idempotent: het eindscherm rendert vaker
 * dan één keer, en zonder een vaste sleutel zou dezelfde avond bij elke render
 * opnieuw in het klassement belanden.
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
 * aanwezigheidslijst. Blijft het daarna nog gelijk, dan beslist de naam — een
 * willekeurige volgorde zou bij elke render kunnen wisselen, en dan lijkt de
 * stand te veranderen terwijl er niets gebeurd is.
 */
export function klassement(avonden: readonly Avond[]): Klassementsregel[] {
  const regels = new Map<string, Klassementsregel>()

  for (const avond of avonden) {
    avond.uitslag.forEach((naam, plaats) => {
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
 * Schrijft een avond bij. Kende de lijst hem al, dan komt dezelfde lijst terug —
 * ongewijzigd en hetzelfde object, zodat een aanroeper in een render eraan kan
 * zien dat er niets te bewaren valt.
 */
export function metAvond(avonden: readonly Avond[], avond: Avond): Avond[] {
  const bestaand = avonden.find((eerder) => eerder.id === avond.id)
  if (bestaand) return avonden as Avond[]
  return [...avonden, avond].sort((a, b) => a.datum - b.datum)
}
