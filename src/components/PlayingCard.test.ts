import { describe, expect, it } from 'vitest'
import { kiesHand, KLEUREN, WAARDEN } from './PlayingCard'

describe('kiesHand', () => {
  it('geeft twee verschillende kaarten', () => {
    for (let i = 0; i < 200; i += 1) {
      const [een, twee] = kiesHand()
      expect(`${een.waarde}${een.kleur}`).not.toBe(`${twee.waarde}${twee.kleur}`)
    }
  })

  it('blijft binnen het spel', () => {
    const [een, twee] = kiesHand()
    for (const kaart of [een, twee]) {
      expect(WAARDEN).toContain(kaart.waarde)
      expect(KLEUREN).toContain(kaart.kleur)
    }
  })

  it('trekt ook bij een random die altijd hetzelfde teruggeeft twee kaarten', () => {
    const [een, twee] = kiesHand(() => 0)
    expect(een).not.toEqual(twee)
  })

  it('levert bij verschillende trekkingen verschillende handen', () => {
    const handen = new Set(
      Array.from({ length: 40 }, () => kiesHand().map((k) => k.waarde + k.kleur).join()),
    )
    expect(handen.size).toBeGreaterThan(1)
  })
})

describe('het kaartspel', () => {
  it('loopt van 2 tot en met aas', () => {
    expect(WAARDEN).toHaveLength(13)
    expect(WAARDEN).toContain('2')
    expect(WAARDEN).toContain('A')
  })

  it('heeft alle 52 kaarten', () => {
    expect(WAARDEN.length * KLEUREN.length).toBe(52)
  })
})
