import { describe, expect, it } from 'vitest'
import { niceStep, roundToPayable, smallBlindFor } from './amounts'

describe('niceStep', () => {
  it('is een tiende van de grootteorde van het bedrag', () => {
    expect(niceStep(124, 1)).toBe(10)
    expect(niceStep(2677, 1)).toBe(100)
  })

  it('gaat nooit onder de eenheid', () => {
    expect(niceStep(64, 5)).toBe(5)
    expect(niceStep(4, 1)).toBe(1)
  })

  it('gebruikt de eenheid als die groter is dan de grootteorde-stap', () => {
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

  it('geeft altijd een veelvoud van de eenheid terug', () => {
    // Dit is de eigenschap waar het om draait: een bedrag dat geen veelvoud van
    // de fichewaarde is, kun je niet leggen. Zonder de correctie in de stap gaf
    // eenheid 3 bij 102 het bedrag 100 terug.
    for (const eenheid of [1, 2, 3, 4, 5, 6, 7, 10, 25, 40, 200]) {
      for (const bedrag of [1, 4, 17, 64, 102, 124.5, 950, 2677, 48_000]) {
        const uitkomst = roundToPayable(bedrag, eenheid)
        expect(uitkomst % eenheid, `${bedrag} bij eenheid ${eenheid} gaf ${uitkomst}`).toBe(0)
        expect(uitkomst).toBeGreaterThanOrEqual(eenheid)
      }
    }
  })

  it('blijft een veelvoud van de eenheid als mustExceed meespeelt', () => {
    for (const eenheid of [3, 7, 40]) {
      let vorige = 0
      for (let i = 0; i < 15; i++) {
        vorige = roundToPayable(vorige * 1.3 + eenheid, eenheid, vorige)
        expect(vorige % eenheid).toBe(0)
      }
    }
  })

  it('rondt nooit onder de eenheid', () => {
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
