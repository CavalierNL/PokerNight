import { describe, expect, it } from 'vitest'
import { calculatePayouts, payoutPercentages } from './payout'

describe('payoutPercentages', () => {
  it('geeft alles aan de winnaar bij vier spelers of minder', () => {
    expect(payoutPercentages(4)).toEqual([100])
    expect(payoutPercentages(2)).toEqual([100])
  })

  it('betaalt twee plaatsen bij vijf tot zeven spelers', () => {
    expect(payoutPercentages(6)).toEqual([65, 35])
  })

  it('betaalt drie plaatsen bij acht tot elf spelers', () => {
    expect(payoutPercentages(8)).toEqual([50, 30, 20])
  })

  it('betaalt vier plaatsen vanaf twaalf spelers', () => {
    expect(payoutPercentages(12)).toEqual([40, 25, 20, 15])
  })
})

describe('calculatePayouts', () => {
  it('verdeelt de pot over de betaalde plaatsen', () => {
    const uitbetalingen = calculatePayouts(10, 8)
    expect(uitbetalingen).toHaveLength(3)
    expect(uitbetalingen[0].place).toBe(1)
  })

  it('telt altijd exact op tot de pot', () => {
    for (let spelers = 2; spelers <= 15; spelers++) {
      for (const inleg of [5, 10, 12.5, 20]) {
        const pot = Math.round(inleg * spelers)
        const som = calculatePayouts(inleg, spelers).reduce((s, u) => s + u.amount, 0)
        expect(som).toBe(pot)
      }
    }
  })

  it('geeft het afrondingsrestant aan de winnaar', () => {
    // pot 65, 65/35 => 42,25 en 22,75 => 42 en 22, restant 1 naar de winnaar
    const uitbetalingen = calculatePayouts(13, 5)
    expect(uitbetalingen[0].amount).toBe(43)
    expect(uitbetalingen[1].amount).toBe(22)
  })

  it('geeft hele euro-bedragen', () => {
    for (const uitbetaling of calculatePayouts(12.5, 9)) {
      expect(Number.isInteger(uitbetaling.amount)).toBe(true)
    }
  })
})
