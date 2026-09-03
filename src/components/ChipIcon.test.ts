import { describe, expect, it } from 'vitest'
import { chipFontSize, chipRimColor, chipTextColor, chipTextY } from './ChipIcon'
import { TOERNOOI_DOOS, longestValueDigits, STANDARD_500 } from '../domain/chipset'
import { KLEINE_DOOS } from '../domain/testdozen'

describe('chipFontSize', () => {
  it('krimpt naarmate de waardes langer worden', () => {
    const maten = [1, 2, 3, 4, 5].map(chipFontSize)
    for (const [i, maat] of maten.entries()) {
      if (i === 0) continue
      expect(maat).toBeLessThanOrEqual(maten[i - 1])
    }
    expect(maten[4]).toBeLessThan(maten[0])
  })

  it('blijft leesbaar bij korte waardes en past bij lange', () => {
    expect(chipFontSize(1)).toBe(16)
    expect(chipFontSize(5)).toBeGreaterThanOrEqual(8)
  })

  it('houdt elke lengte los van de inkepingen', () => {
    // De inkepingen lopen tot straal 14,6; met marge mag de tekst tot 25 breed.
    for (const cijfers of [1, 2, 3, 4, 5]) {
      const breedte = chipFontSize(cijfers) * cijfers * 0.6
      expect(breedte, `${cijfers} cijfers`).toBeLessThanOrEqual(25)
    }
  })

  it('kiest bij zes cijfers leesbaarheid boven passen', () => {
    // Vanaf zes cijfers wint de ondergrens en loopt de tekst tot tegen de rand.
    // Dat is een bewuste keuze: kleiner dan acht is op een chip niet meer te
    // lezen, en chipwaardes boven de honderdduizend komen niet voor.
    expect(chipFontSize(6)).toBe(8)
  })
})

describe('longestValueDigits', () => {
  it('kijkt naar de langste waarde in de doos, niet naar één chip', () => {
    expect(longestValueDigits(KLEINE_DOOS)).toBe(1)
    expect(longestValueDigits(STANDARD_500)).toBe(3)
  })

  it('gaat om met een doos die tot in de tienduizenden loopt', () => {
    const groot = {
      ...STANDARD_500,
      chips: [...STANDARD_500.chips, { color: '#e67e22', value: 10000, count: 20 }],
    }
    expect(longestValueDigits(groot)).toBe(5)
  })
})

describe('chipTextColor', () => {
  it('zet donkere tekst op een lichte chip en lichte tekst op een donkere', () => {
    expect(chipTextColor('#f2efe6')).toContain('0,0,0')
    expect(chipTextColor('#e9c31f')).toContain('0,0,0')
    expect(chipTextColor('#22262b')).toContain('255,255,255')
    expect(chipTextColor('#7a4a26')).toContain('255,255,255')
    expect(chipTextColor('#6b4fa0')).toContain('255,255,255')
  })

  it('valt terug op donkere tekst bij een onbruikbare kleur', () => {
    expect(chipTextColor('rood')).toContain('0,0,0')
    expect(chipTextColor('#fff')).toContain('0,0,0')
  })
})

describe('de toernooidoos', () => {
  it('telt 500 chips', () => {
    expect(TOERNOOI_DOOS.chips.reduce((som, c) => som + c.count, 0)).toBe(500)
  })

  it('loopt van 25 tot 10.000 en dwingt dus de kleinste cijfers af', () => {
    const waardes = TOERNOOI_DOOS.chips.map((c) => c.value)
    expect(waardes).toEqual([25, 50, 100, 500, 1000, 5000, 10000])
    expect(longestValueDigits(TOERNOOI_DOOS)).toBe(5)
  })

  it('geeft elke chip in deze doos leesbare tekst', () => {
    for (const chip of TOERNOOI_DOOS.chips) {
      expect(chipTextColor(chip.color), chip.color).toMatch(/rgba\(/)
    }
  })
})

describe('chipRimColor', () => {
  it('zet donkere stippen op een licht chip', () => {
    // Wit op wit is geen versiering maar een onzichtbare rand.
    expect(chipRimColor('#f2efe6')).toContain('0,0,0')
    expect(chipRimColor('#e9c31f')).toContain('0,0,0')
  })

  it('houdt lichte stippen op een donker chip', () => {
    expect(chipRimColor('#22262b')).toContain('255,255,255')
    expect(chipRimColor('#2e6da4')).toContain('255,255,255')
  })
})

describe('chipTextY', () => {
  it('schuift de basislijn mee met de lettergrootte', () => {
    // Kleine cijfers hangen anders onder het midden.
    expect(chipTextY(8)).toBeLessThan(chipTextY(16))
  })

  it('zet elke lettergrootte optisch in het midden van het chip', () => {
    for (const grootte of [8, 10, 13, 16]) {
      // Bovenkant en onderkant van een cijfer van 0,7 em rond de basislijn.
      const boven = chipTextY(grootte) - grootte * 0.7
      const onder = chipTextY(grootte)
      expect((boven + onder) / 2, `${grootte}`).toBeCloseTo(20, 1)
    }
  })
})
