/**
 * Een speelkaart als SVG. Net als het fiche bewust getekend en niet als plaatje:
 * de kop van de pagina kiest bij elke reload een andere hand, en dat kan niet uit
 * één vast bestand komen — het zou 52 afbeeldingen kosten voor decoratie.
 */

export const KLEUREN = ['♠', '♥', '♦', '♣'] as const
// Het hele spel. De kaarten worden getekend, dus er is geen reden om bij 7 te
// stoppen zoals een korte pot doet.
export const WAARDEN = [
  'A',
  'K',
  'Q',
  'J',
  '10',
  '9',
  '8',
  '7',
  '6',
  '5',
  '4',
  '3',
  '2',
] as const

export type Kaart = { waarde: string; kleur: string }

/** Harten en ruiten zijn rood, schoppen en klaveren zwart. */
function isRood(kleur: string): boolean {
  return kleur === '♥' || kleur === '♦'
}

/**
 * Twee verschillende kaarten. `random` is een parameter zodat een test een vaste
 * hand kan afdwingen in plaats van te moeten hopen.
 */
export function kiesHand(random: () => number = Math.random): [Kaart, Kaart] {
  const alle: Kaart[] = KLEUREN.flatMap((kleur) => WAARDEN.map((waarde) => ({ waarde, kleur })))
  const eerste = Math.floor(random() * alle.length)
  // Een offset in plaats van opnieuw trekken: zo kan er nooit twee keer dezelfde
  // kaart uit komen, ook niet bij een random die toevallig hetzelfde teruggeeft.
  const tweede = (eerste + 1 + Math.floor(random() * (alle.length - 1))) % alle.length
  return [alle[eerste], alle[tweede]]
}

export function PlayingCard({ kaart, className }: { kaart: Kaart; className?: string }) {
  const inkt = isRood(kaart.kleur) ? '#c0392b' : '#22262b'

  return (
    <svg
      className={className}
      width="34"
      height="48"
      viewBox="0 0 34 48"
      role="img"
      aria-label={`${kaart.waarde} ${kaart.kleur}`}
    >
      <rect x="0.5" y="0.5" width="33" height="47" rx="4" fill="#f7f4ec" stroke="#cfc7b4" />
      <text x="4" y="14" fontSize="11" fontWeight="700" fill={inkt} fontFamily="Georgia, serif">
        {kaart.waarde}
      </text>
      <text x="17" y="38" fontSize="19" textAnchor="middle" fill={inkt}>
        {kaart.kleur}
      </text>
    </svg>
  )
}

/**
 * Eén hand voor de hele sessie. Op moduleniveau getrokken zodat de kop en het
 * pauzescherm dezelfde kaarten tonen; zou elk scherm zelf trekken, dan wisselden
 * ze bij elke pauze en leest dat als een storing in plaats van als een grapje.
 */
export const SESSIE_HAND = kiesHand()

/**
 * De achterkant van een kaart. Tijdens een pauze laat je je kaarten niet zien;
 * dan hoort er ook geen hand op tafel te liggen.
 */
export function CardBack({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="34"
      height="48"
      viewBox="0 0 34 48"
      role="img"
      aria-label="kaart met de rug omhoog"
    >
      <rect x="0.5" y="0.5" width="33" height="47" rx="4" fill="#f7f4ec" stroke="#cfc7b4" />
      <rect x="3" y="3" width="28" height="42" rx="2.5" fill="#123a2a" />
      {/*
        Ruitjes, zoals het patroon op een kaartrug. Een ruit spant van x-4 tot
        x+4 en van y tot y+10; de rijen en kolommen zijn zo gekozen dat alles
        binnen het groene vlak (3 tot 31 breed, 3 tot 45 hoog) blijft.
      */}
      <g fill="none" stroke="#2e8b57" strokeWidth="1">
        {[0, 1, 2].map((rij) =>
          [0, 1, 2].map((kolom) => (
            <path
              key={`${rij}-${kolom}`}
              d={`M ${8 + kolom * 9} ${10 + rij * 11} l 4 5 l -4 5 l -4 -5 Z`}
            />
          )),
        )}
      </g>
    </svg>
  )
}
