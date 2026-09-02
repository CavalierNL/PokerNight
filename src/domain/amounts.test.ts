import { describe, expect, it } from 'vitest'
import { niceStep, roundToPayable, smallBlindFor } from './amounts'

describe('niceStep', () => {
  it('is een tiende van de grootteorde van het bedrag', () => {
    expect(niceStep(124, 1)).toBe(10)
    expect(niceStep(2677, 1)).toBe(100)
  })

  it('gaat nooit onder de fichewaarde', () => {
    expect(niceStep(64, 5)).toBe(5)
    expect(niceStep(4, 1)).toBe(1)
  })

  it('gebruikt de fichewaarde als die groter is dan de grootteorde-stap', () => {
    expect(niceStep(150, 25)).toBe(25)
  })
})

describe('roundToPayable', () => {
  it('rondt af op een stap die met het bedrag meeschaalt', () => {
    expect(roundToPayable(124.5, 1)).toBe(120)
    expect(roundToPayable(2677, 1)).toBe(2700)
  })

  it('laat kleine bedragen met rust', () => {
    expect(roundToPayable(4, 1)).toBe(4)
    expect(roundToPayable(8, 1)).toBe(8)
  })

  it('rondt af op een veelvoud van de fichewaarde', () => {
    expect(roundToPayable(64, 5) % 5).toBe(0)
    expect(roundToPayable(64, 5)).toBe(65)
  })

  it('rondt nooit onder de fichewaarde', () => {
    expect(roundToPayable(0.4, 5)).toBe(5)
  })

  it('gaat een stap omhoog als de afronding niet boven mustExceed uitkomt', () => {
    expect(roundToPayable(100, 1, 100)).toBe(110)
  })

  it('blijft doorstappen tot het bedrag boven mustExceed ligt', () => {
    expect(roundToPayable(20, 1, 100)).toBeGreaterThan(100)
  })
})

describe('smallBlindFor', () => {
  it('is de helft van de big blind', () => {
    expect(smallBlindFor(10, 1)).toBe(5)
    expect(smallBlindFor(8, 1)).toBe(4)
  })

  it('rondt naar beneden af op een veelvoud van de fichewaarde', () => {
    // helft van 5 is 2,5 — het grootste veelvoud van 1 daaronder is 2
    expect(smallBlindFor(5, 1)).toBe(2)
    expect(smallBlindFor(150, 25)).toBe(75)
  })

  it('is minimaal één fichewaarde', () => {
    expect(smallBlindFor(1, 1)).toBe(1)
    expect(smallBlindFor(25, 25)).toBe(25)
  })

  it('blijft onder de big blind zodra die minstens twee fichewaardes is', () => {
    for (const [bb, d] of [
      [2, 1],
      [50, 25],
      [600, 100],
    ] as const) {
      expect(smallBlindFor(bb, d)).toBeLessThan(bb)
    }
  })
})
