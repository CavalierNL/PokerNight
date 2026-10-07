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
    // tweeenvijftig, 2,6 miljoen stuks, en per soort moet er uitkomen wat al in
    // `HAND_KANSEN` stond voordat deze functie bestond.
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
})
