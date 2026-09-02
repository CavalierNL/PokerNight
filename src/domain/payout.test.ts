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

  it('telt altijd op tot honderd procent', () => {
    for (let spelers = 2; spelers <= 20; spelers++) {
      expect(payoutPercentages(spelers).reduce((s, p) => s + p, 0)).toBe(100)
    }
  })
})

describe('calculatePayouts', () => {
  it('verdeelt de pot over de betaalde plaatsen', () => {
    const { places } = calculatePayouts(10, 8)
    expect(places).toHaveLength(3)
    expect(places[0].place).toBe(1)
  })

  it('betaalt nooit meer uit dan er is opgehaald', () => {
    // Halve euro's zijn normaal gebruik: het inlegveld staat op stappen van 0,50.
    // Naar boven afronden zou geld uitkeren dat niet in de doos zit.
    for (let spelers = 2; spelers <= 15; spelers++) {
      for (const inleg of [2.5, 5, 7.5, 10, 12.5, 20]) {
        const { pot, places } = calculatePayouts(inleg, spelers)
        const som = places.reduce((s, u) => s + u.amount, 0)
        expect(som).toBe(pot)
        expect(pot).toBeLessThanOrEqual(inleg * spelers)
      }
    }
  })

  it('houdt de halve euro in de kas', () => {
    // 7,50 x 5 = 37,50 opgehaald; er wordt 37 verdeeld, niet 38.
    const { pot, places } = calculatePayouts(7.5, 5)
    expect(pot).toBe(37)
    expect(places.reduce((s, u) => s + u.amount, 0)).toBe(37)
  })

  it('geeft het afrondingsrestant aan de winnaar', () => {
    // pot 65, 65/35 => 42,25 en 22,75 => 42 en 22, restant 1 naar de winnaar
    const { places } = calculatePayouts(13, 5)
    expect(places[0].amount).toBe(43)
    expect(places[1].amount).toBe(22)
  })

  it('geeft hele euro-bedragen', () => {
    for (const uitbetaling of calculatePayouts(12.5, 9).places) {
      expect(Number.isInteger(uitbetaling.amount)).toBe(true)
    }
  })

  it('geeft geen negatieve pot bij onzinnige invoer', () => {
    expect(calculatePayouts(0, 6).pot).toBe(0)
    expect(calculatePayouts(-5, 6).pot).toBe(0)
  })
})
