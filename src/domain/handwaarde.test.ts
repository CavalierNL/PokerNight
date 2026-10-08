import { describe, expect, it } from 'vitest'
import { HAND_KANSEN } from './handkansen'
import { AANTAL_KAARTEN, SOORTEN, handwaarde, leesKaarten, soortVan } from './handwaarde'

const soort = (kaarten: string) => soortVan(handwaarde(leesKaarten(kaarten)))
const waarde = (kaarten: string) => handwaarde(leesKaarten(kaarten))

describe('leesKaarten', () => {
  it('geeft elke kaart een eigen getal', () => {
    expect(leesKaarten('2♠ 2♥ 10♦ A♣')).toStrictEqual([0, 1, 34, 51])
  })

  it('weigert wat geen kaart is', () => {
    expect(() => leesKaarten('1♠')).toThrow("'1♠' is geen kaart")
    expect(() => leesKaarten('Ah')).toThrow("'Ah' is geen kaart")
  })
})

describe('handwaarde', () => {
  it('telt van alle grepen van vijf precies de bekende verdeling', () => {
    // De toets op de hele functie in één keer: elke greep van vijf uit
    // tweeenvijftig, 2,6 miljoen stuks, en per soort moet er uitkomen wat in
    // `HAND_KANSEN` staat. Die getallen zijn niet met deze functie geteld, dus
    // dit is een onafhankelijke controle.
    const geteld: Record<string, number> = Object.fromEntries(SOORTEN.map((naam) => [naam, 0]))
    for (let a = 0; a < AANTAL_KAARTEN; a++)
      for (let b = a + 1; b < AANTAL_KAARTEN; b++)
        for (let c = b + 1; c < AANTAL_KAARTEN; c++)
          for (let d = c + 1; d < AANTAL_KAARTEN; d++)
            for (let e = d + 1; e < AANTAL_KAARTEN; e++)
              geteld[soortVan(handwaarde([a, b, c, d, e]))]++

    const verwacht: Record<string, number> = Object.fromEntries(
      HAND_KANSEN.map((hand) => [hand.naam, hand.flop]),
    )
    // De royal flush is hier de hoogste straight flush en geen eigen soort.
    verwacht['Straight flush'] += verwacht['Royal flush']
    delete verwacht['Royal flush']
    expect(geteld).toStrictEqual(verwacht)
  })

  it('kiest de beste vijf uit zeven', () => {
    expect(soort('A♠ A♥ K♦ K♣ 7♠ 7♥ 2♦')).toBe('Two pair')
    expect(soort('9♠ 9♥ 9♦ 4♣ 4♠ 4♥ K♦')).toBe('Full house')
    expect(soort('A♦ J♦ 8♦ 5♦ 2♦ 2♠ 2♥')).toBe('Flush')
    expect(soort('9♥ 8♠ 7♦ 6♣ 5♥ 5♠ 5♦')).toBe('Straight')
    expect(soort('9♠ 8♠ 7♠ 6♠ 5♠ A♠ A♥')).toBe('Straight flush')
    // Vijf op rij en vijf van één kleur, maar niet dezelfde vijf.
    expect(soort('9♠ 8♠ 7♠ 6♥ 5♠ 2♠ K♦')).toBe('Flush')
  })

  it('laat bij drie paren het laagste vallen en houdt de hoogste bijkaart', () => {
    expect(waarde('A♠ A♥ K♦ K♣ 7♠ 7♥ 2♦')).toBe(waarde('A♦ A♣ K♠ K♥ 7♦ 3♣ 2♠'))
    expect(waarde('A♠ A♥ K♦ K♣ 7♠ 7♥ 2♦')).toBeLessThan(waarde('A♦ A♣ K♠ K♥ 8♦ 3♣ 2♠'))
  })

  it('telt de aas ook als één, maar dan als laagste straat', () => {
    expect(soort('A♠ 2♥ 3♦ 4♣ 5♠')).toBe('Straight')
    expect(waarde('A♠ 2♥ 3♦ 4♣ 5♠')).toBeLessThan(waarde('2♥ 3♦ 4♣ 5♠ 6♥'))
    expect(soort('Q♠ K♥ A♦ 2♣ 3♠')).toBe('High card')
  })

  it('laat het bord beslissen als geen van beiden het verbetert', () => {
    // Allebei spelen de straat die op tafel ligt: gedeelde pot.
    const bord = '10♠ J♥ Q♦ K♣ A♠'
    expect(waarde(`2♥ 2♦ ${bord}`)).toBe(waarde(`7♣ 3♠ ${bord}`))
  })

  it('zet elke soort boven de vorige, hoe hoog de kaarten daarin ook zijn', () => {
    const vanZwakNaarSterk = [
      'A♠ K♥ Q♦ J♣ 9♠',
      '2♠ 2♥ 3♦ 4♣ 5♠',
      'A♠ A♥ 3♦ 4♣ 5♠',
      '2♠ 2♥ 3♦ 3♣ 4♠',
      'A♠ A♥ K♦ K♣ Q♠',
      '2♠ 2♥ 2♦ 3♣ 4♠',
      'A♠ A♥ A♦ K♣ Q♠',
      'A♠ 2♥ 3♦ 4♣ 5♠',
      '10♠ J♥ Q♦ K♣ A♠',
      '2♠ 3♠ 4♠ 5♠ 7♠',
      'A♠ K♠ Q♠ J♠ 9♠',
      '2♠ 2♥ 2♦ 3♣ 3♠',
      'A♠ A♥ A♦ K♣ K♠',
      '2♠ 2♥ 2♦ 2♣ 3♠',
      'A♠ A♥ A♦ A♣ K♠',
      'A♠ 2♠ 3♠ 4♠ 5♠',
      '10♠ J♠ Q♠ K♠ A♠',
    ].map(waarde)
    expect(vanZwakNaarSterk).toStrictEqual([...vanZwakNaarSterk].sort((a, b) => a - b))
    expect(new Set(vanZwakNaarSterk).size).toBe(vanZwakNaarSterk.length)
  })

  // Binnen een soort: wat de hand maakt weegt zwaarder dan de bijkaarten, en
  // er tellen er precies vijf mee. Een zesde kaart die toch meetelt maakt van
  // een gedeelde pot een winnaar; een vijfde die niet meetelt andersom.
  it('laat de rang van het paar of de drie zwaarder wegen dan de bijkaarten', () => {
    expect(waarde('3♠ 3♥ A♦ K♣ Q♠ 7♥ 2♦')).toBeLessThan(waarde('4♠ 4♥ 7♦ 6♣ 5♠ 3♦ 2♣'))
    expect(waarde('2♠ 2♥ 2♦ A♣ K♠ 9♥ 7♦')).toBeLessThan(waarde('3♠ 3♥ 3♦ 5♣ 4♠ 9♦ 7♣'))
    expect(waarde('K♠ K♥ Q♦ Q♣ A♦')).toBeLessThan(waarde('A♠ A♥ 2♦ 2♣ 3♠'))
    expect(waarde('2♠ 2♥ 2♦ A♣ A♠')).toBeLessThan(waarde('3♠ 3♥ 3♦ 2♣ 2♠'))
  })

  it.each([
    ['een paar: de derde bijkaart beslist', 'K♠ K♥ A♦ Q♣ 2♠', 'J♥ 3♦', '10♥ 3♣', 'wint'],
    ['een paar: de vierde niet meer', 'K♠ K♥ A♦ Q♣ J♠', '3♦ 2♣', '4♥ 2♦', 'deelt'],
    ['drie dezelfde: de tweede bijkaart beslist', '7♠ 7♥ 7♦ A♣ 4♠', 'K♥ 2♦', 'Q♥ 2♣', 'wint'],
    ['drie dezelfde: de derde niet meer', '7♠ 7♥ 7♦ A♣ K♠', 'Q♥ 2♦', 'J♥ 3♦', 'deelt'],
    ['hoge kaart: de vijfde beslist', 'A♠ K♥ Q♦ J♣ 3♠', '9♥ 2♦', '8♥ 2♣', 'wint'],
    ['hoge kaart: de zesde niet meer', 'A♠ K♥ Q♦ J♣ 9♠', '3♦ 2♣', '4♥ 2♦', 'deelt'],
    ['twee paar: één bijkaart beslist', 'K♠ K♥ 5♦ 5♣ 2♠', 'A♥ 3♦', 'Q♥ 3♣', 'wint'],
    ['four of a kind: de bijkaart beslist', '7♠ 7♥ 7♦ 7♣ 2♠', 'K♥ 3♦', 'Q♥ 3♣', 'wint'],
    ['four of a kind: de bijkaart mag uit een paar komen', '7♠ 7♥ 7♦ 7♣ K♠', 'K♥ 2♦', '3♥ 2♣', 'deelt'],
    ['full house: het hoogste paar telt', '9♠ 9♥ 9♦ 4♣ 2♠', 'K♥ K♦', '4♥ Q♦', 'wint'],
    ['full house: een derde van het paar helpt niet', '9♠ 9♥ 9♦ 4♣ 4♠', '4♥ K♦', 'K♥ Q♦', 'deelt'],
    ['flush: de vijf hoogste van die kleur', 'A♦ J♦ 8♦ 5♦ 3♦', '2♦ K♠', '4♠ K♥', 'deelt'],
    ['flush: een hogere van die kleur wint', 'A♦ J♦ 8♦ 5♦ 3♦', '9♦ 2♠', 'K♠ K♥', 'wint'],
    ['straat: de hoogste vijf op rij', '8♠ 7♦ 6♣ 5♥ K♠', '9♥ 4♠', '9♦ 2♦', 'deelt'],
    ['straat: een kaart erboven wint', '8♠ 7♦ 6♣ 5♥ K♠', '9♥ 2♠', '4♠ 2♦', 'wint'],
  ])('%s', (_naam, bord, hand, tegen, uitkomst) => {
    const verschil = waarde(`${hand} ${bord}`) - waarde(`${tegen} ${bord}`)
    expect(Math.sign(verschil)).toBe(uitkomst === 'wint' ? 1 : 0)
  })
})

/**
 * Een tweede waardering, zo dom mogelijk: alleen voor vijf kaarten, en de
 * beste hand uit zeven is de beste van alle eenentwintig grepen van vijf. Deelt
 * geen regel code met `handwaarde`, en dat is het hele punt -- de matchups in
 * `handkansen.ts` zijn met `handwaarde` geteld, dus een fout daarin zit ook in
 * de tabel en valt alleen op naast iets dat anders rekent.
 */
function naiefVijf(kaarten: number[]): number[] {
  const perRang = new Map<number, number>()
  for (const kaart of kaarten) {
    const rang = Math.floor(kaart / 4)
    perRang.set(rang, (perRang.get(rang) ?? 0) + 1)
  }
  // Eerst wat het vaakst voorkomt, daarbinnen de hoogste: precies de volgorde
  // waarin je twee handen van dezelfde soort vergelijkt.
  const groepen = [...perRang].sort((a, b) => b[1] - a[1] || b[0] - a[0])
  const rangen = groepen.map(([rang]) => rang)
  const vorm = groepen.map(([, aantal]) => aantal).join('')
  const flush = new Set(kaarten.map((kaart) => kaart % 4)).size === 1
  const wiel = rangen.join() === '12,3,2,1,0'
  const straat = vorm === '11111' && (rangen[0] - rangen[4] === 4 || wiel)
  const top = wiel ? 3 : rangen[0]

  if (straat && flush) return [8, top]
  if (vorm === '41') return [7, ...rangen]
  if (vorm === '32') return [6, ...rangen]
  if (flush) return [5, ...rangen]
  if (straat) return [4, top]
  if (vorm === '311') return [3, ...rangen]
  if (vorm === '221') return [2, ...rangen]
  if (vorm === '2111') return [1, ...rangen]
  return [0, ...rangen]
}

function vergelijk(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return Math.sign(a[i] - b[i])
  return 0
}

function naiefZeven(kaarten: number[]): number[] {
  let beste: number[] = [-1]
  for (let i = 0; i < 7; i++)
    for (let j = i + 1; j < 7; j++) {
      const vijf = naiefVijf(kaarten.filter((_, plek) => plek !== i && plek !== j))
      if (vergelijk(vijf, beste) > 0) beste = vijf
    }
  return beste
}

describe('handwaarde naast een tweede waardering', () => {
  it('wijst bij twintigduizend deals dezelfde winnaar aan', () => {
    // Een vaste reeks in plaats van Math.random: een deal die het hier oneens
    // maakt moet morgen dezelfde deal zijn.
    let staat = 20260902
    const willekeurig = () => {
      staat = (Math.imul(staat, 1664525) + 1013904223) >>> 0
      return staat / 2 ** 32
    }

    const oneens: string[] = []
    for (let deal = 0; deal < 20_000; deal++) {
      const spel = Array.from({ length: AANTAL_KAARTEN }, (_, kaart) => kaart)
      for (let i = 0; i < 9; i++) {
        const j = i + Math.floor(willekeurig() * (AANTAL_KAARTEN - i))
        ;[spel[i], spel[j]] = [spel[j], spel[i]]
      }
      const bord = spel.slice(4, 9)
      const hand = [...spel.slice(0, 2), ...bord]
      const tegen = [...spel.slice(2, 4), ...bord]

      const snel = Math.sign(handwaarde(hand) - handwaarde(tegen))
      const naief = naiefZeven(hand)
      const zelfdeSoort = SOORTEN.indexOf(soortVan(handwaarde(hand))) === naief[0]
      if (snel !== vergelijk(naief, naiefZeven(tegen)) || !zelfdeSoort) oneens.push(spel.slice(0, 9).join(' '))
    }
    expect(oneens).toStrictEqual([])
  })
})
