/**
 * De waarde van een pokerhand, om de tabellen in `handkansen.ts` na te rekenen.
 *
 * De app zelf deelt geen kaarten en roept dit nergens aan: de kansen die hij
 * toont zijn vaste getallen. Maar vaste getallen zijn alleen te vertrouwen als
 * iets ze kan natellen, en dat is dit. Wordt alleen door tests gebruikt en zit
 * dus niet in de bundel.
 *
 * Een kaart is een getal van 0 tot en met 51: de rang (0 voor de twee, 12 voor
 * de aas) maal vier, plus de kleur.
 */
const RANGEN = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
const KLEUREN = ['♠', '♥', '♦', '♣']

export const AANTAL_KAARTEN = 52

/** "A♠ 10♥" wordt `[48, 33]`. */
export function leesKaarten(tekst: string): number[] {
  return tekst.split(' ').map((kaart) => {
    const rang = RANGEN.indexOf(kaart.slice(0, -1))
    const kleur = KLEUREN.indexOf(kaart.slice(-1))
    if (rang < 0 || kleur < 0) throw new Error(`'${kaart}' is geen kaart`)
    return rang * 4 + kleur
  })
}

/**
 * De soorten handen van zwak naar sterk, in de namen van `HAND_KANSEN`. Een
 * royal flush staat er niet apart in: dat is de hoogste straight flush en
 * verder niets bijzonders.
 */
export const SOORTEN = [
  'High card',
  'One pair',
  'Two pair',
  'Three of a kind',
  'Straight',
  'Flush',
  'Full house',
  'Four of a kind',
  'Straight flush',
] as const

export type Soort = (typeof SOORTEN)[number]

/** Ruimte voor vijf rangen achter de soort: 13 tot de vijfde. */
const PER_SOORT = 13 ** 5

const AAS_TOT_VIJF = 0b1_0000_0000_1111

/** De hoogste rang van een straat in deze rangen, of -1 als er geen in zit. */
function hoogsteStraat(rangen: number): number {
  for (let top = 12; top >= 4; top--) {
    const vijfOpRij = 0b11111 << (top - 4)
    if ((rangen & vijfOpRij) === vijfOpRij) return top
  }
  // De aas telt ook als één: A-2-3-4-5 is een straat met de vijf als hoogste.
  return (rangen & AAS_TOT_VIJF) === AAS_TOT_VIJF ? 3 : -1
}

/** De hoogste `aantal` rangen als één getal, de hoogste het zwaarst. */
function hoogste(rangen: number, aantal: number): number {
  let waarde = 0
  for (let rang = 12; rang >= 0 && aantal > 0; rang--) {
    if (rangen & (1 << rang)) {
      waarde = waarde * 13 + rang
      aantal--
    }
  }
  return waarde
}

const perRang = new Int8Array(13)
const rangenPerKleur = new Int32Array(4)
const aantalPerKleur = new Int8Array(4)

/**
 * De beste vijf uit vijf tot zeven kaarten als één getal: de hogere hand heeft
 * het hogere getal, gelijke handen hetzelfde. Meer dan zeven kaarten kan dit
 * niet aan -- vanaf acht passen er een flush en een full house in één greep, en
 * hier wint de flush dan zonder te kijken.
 */
export function handwaarde(kaarten: readonly number[]): number {
  perRang.fill(0)
  rangenPerKleur.fill(0)
  aantalPerKleur.fill(0)
  let rangen = 0
  for (const kaart of kaarten) {
    const rang = kaart >> 2
    const kleur = kaart & 3
    perRang[rang]++
    rangenPerKleur[kleur] |= 1 << rang
    aantalPerKleur[kleur]++
    rangen |= 1 << rang
  }

  for (let kleur = 0; kleur < 4; kleur++) {
    if (aantalPerKleur[kleur] < 5) continue
    const straat = hoogsteStraat(rangenPerKleur[kleur])
    if (straat >= 0) return 8 * PER_SOORT + straat
    return 5 * PER_SOORT + hoogste(rangenPerKleur[kleur], 5)
  }

  let vier = -1
  let drie = -1
  let tweedeDrie = -1
  let paar = -1
  let tweedePaar = -1
  for (let rang = 12; rang >= 0; rang--) {
    const aantal = perRang[rang]
    if (aantal === 4) vier = rang
    else if (aantal === 3) {
      if (drie < 0) drie = rang
      else if (tweedeDrie < 0) tweedeDrie = rang
    } else if (aantal === 2) {
      if (paar < 0) paar = rang
      else if (tweedePaar < 0) tweedePaar = rang
    }
  }
  const zonder = (...weg: number[]) => weg.reduce((over, rang) => over & ~(1 << rang), rangen)

  if (vier >= 0) return 7 * PER_SOORT + vier * 13 + hoogste(zonder(vier), 1)
  // Twee keer drie dezelfde is ook een full house: de lagere drie levert het paar.
  if (drie >= 0 && (tweedeDrie >= 0 || paar >= 0)) {
    return 6 * PER_SOORT + drie * 13 + Math.max(tweedeDrie, paar)
  }
  const straat = hoogsteStraat(rangen)
  if (straat >= 0) return 4 * PER_SOORT + straat
  if (drie >= 0) return 3 * PER_SOORT + drie * 13 ** 2 + hoogste(zonder(drie), 2)
  if (tweedePaar >= 0) {
    return 2 * PER_SOORT + paar * 13 ** 2 + tweedePaar * 13 + hoogste(zonder(paar, tweedePaar), 1)
  }
  if (paar >= 0) return 1 * PER_SOORT + paar * 13 ** 3 + hoogste(zonder(paar), 3)
  return hoogste(rangen, 5)
}

/** Welke soort hand bij een waarde hoort. */
export function soortVan(waarde: number): Soort {
  return SOORTEN[Math.floor(waarde / PER_SOORT)]
}
