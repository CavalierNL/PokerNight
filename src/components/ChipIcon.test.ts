import { describe, expect, it } from 'vitest'
import { chipFontSize, chipRimColor, chipTextColor } from './ChipIcon'
import { TOERNOOI_DOOS, HOUSE_RULES, longestValueDigits, STANDARD_500 } from '../domain/chipset'

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
    expect(chipFontSize(1)).toBe(17)
    expect(chipFontSize(5)).toBeGreaterThanOrEqual(8)
    // Vijf cijfers moeten binnen het vrije midden blijven: de randstippen liggen
    // op straal 16,2 van een tekenvlak van 40, dus tot 30 breed is er ruimte.
    expect(chipFontSize(5) * 5 * 0.6).toBeLessThanOrEqual(30)
  })
})

describe('longestValueDigits', () => {
  it('kijkt naar de langste waarde in de doos, niet naar één fiche', () => {
    expect(longestValueDigits(HOUSE_RULES)).toBe(1)
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
  it('zet donkere tekst op een lichte fiche en lichte tekst op een donkere', () => {
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
  it('telt 500 fiches', () => {
    expect(TOERNOOI_DOOS.chips.reduce((som, c) => som + c.count, 0)).toBe(500)
  })

  it('loopt van 25 tot 10.000 en dwingt dus de kleinste cijfers af', () => {
    const waardes = TOERNOOI_DOOS.chips.map((c) => c.value)
    expect(waardes).toEqual([25, 50, 100, 500, 1000, 5000, 10000])
    expect(longestValueDigits(TOERNOOI_DOOS)).toBe(5)
  })

  it('geeft elke fiche in deze doos leesbare tekst', () => {
    for (const chip of TOERNOOI_DOOS.chips) {
      expect(chipTextColor(chip.color), chip.color).toMatch(/rgba\(/)
    }
  })
})

describe('chipRimColor', () => {
  it('zet donkere stippen op een licht fiche', () => {
    // Wit op wit is geen versiering maar een onzichtbare rand.
    expect(chipRimColor('#f2efe6')).toContain('0,0,0')
    expect(chipRimColor('#e9c31f')).toContain('0,0,0')
  })

  it('houdt lichte stippen op een donker fiche', () => {
    expect(chipRimColor('#22262b')).toContain('255,255,255')
    expect(chipRimColor('#2e6da4')).toContain('255,255,255')
  })
})
