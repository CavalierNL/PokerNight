import { describe, expect, it } from 'vitest'
import { naamlozePlaatsen, positiesBij } from './posities'

/** De lijst als "plaats: namen", zodat een verwachting op één regel past. */
function leesbaar(aantalSpelers: number): string[] {
  return positiesBij(aantalSpelers).map(
    (positie) => `${positie.plaats}: ${positie.namen.join(' / ')}`,
  )
}

describe('positiesBij', () => {
  it('maakt heads-up van de button de small blind', () => {
    expect(leesbaar(2)).toStrictEqual(['0: Button / Small blind', '1: Big blind'])
  })

  it('heeft met drie spelers alleen de button en de blinds', () => {
    expect(leesbaar(3)).toStrictEqual(['0: Button', '1: Small blind', '2: Big blind'])
  })

  it('geeft met vier spelers de ene stoel die overblijft beide namen', () => {
    // Links van de big blind én rechts van de button: het is dezelfde stoel.
    expect(leesbaar(4)).toStrictEqual([
      '0: Button',
      '1: Small blind',
      '2: Big blind',
      '3: Under the gun / Cut-off',
    ])
  })

  it('heeft met vijf spelers voor elke stoel een naam', () => {
    expect(leesbaar(5)).toStrictEqual([
      '0: Button',
      '1: Small blind',
      '2: Big blind',
      '3: Under the gun',
      '4: Cut-off',
    ])
  })

  it.each([6, 7, 8, 9, 10])(
    'houdt met %i spelers de cut-off rechts van de button',
    (aantal) => {
      expect(leesbaar(aantal)).toStrictEqual([
        '0: Button',
        '1: Small blind',
        '2: Big blind',
        '3: Under the gun',
        `${aantal - 1}: Cut-off`,
      ])
    },
  )

  it.each([2, 3, 4, 5, 6, 7, 8, 9, 10])(
    'zet met %i spelers niemand op een stoel die er niet is',
    (aantal) => {
      const plaatsen = positiesBij(aantal).map((positie) => positie.plaats)
      // Oplopend en zonder dubbelen: de lijst loopt de tafel één keer rond.
      expect(plaatsen).toStrictEqual([...new Set(plaatsen)].sort((a, b) => a - b))
      expect(Math.max(...plaatsen)).toBeLessThan(aantal)
    },
  )

  it('geeft niets terug als er geen tafel meer is', () => {
    expect(positiesBij(1)).toStrictEqual([])
    expect(positiesBij(0)).toStrictEqual([])
    expect(positiesBij(-3)).toStrictEqual([])
    expect(positiesBij(4.5)).toStrictEqual([])
    expect(positiesBij(Number.NaN)).toStrictEqual([])
  })
})

describe('naamlozePlaatsen', () => {
  it('telt pas vanaf zes spelers iemand zonder naam', () => {
    expect([2, 3, 4, 5, 6, 7, 8, 9, 10].map(naamlozePlaatsen)).toStrictEqual([
      0, 0, 0, 0, 1, 2, 3, 4, 5,
    ])
  })

  it('telt niemand als er geen tafel meer is', () => {
    expect(naamlozePlaatsen(1)).toBe(0)
    expect(naamlozePlaatsen(0)).toBe(0)
  })
})
