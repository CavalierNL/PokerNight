import { describe, expect, it } from 'vitest'
import { chipFontSize } from './ChipIcon'
import { HOUSE_RULES, longestValueDigits, STANDARD_500 } from '../domain/chipset'

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
    expect(chipFontSize(1)).toBe(15)
    expect(chipFontSize(5)).toBeGreaterThanOrEqual(7)
    // Vijf cijfers moeten binnen de binnenring van 24 breed blijven.
    expect(chipFontSize(5) * 5 * 0.6).toBeLessThanOrEqual(28)
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
      chips: [...STANDARD_500.chips, { name: 'oranje', color: '#e67e22', value: 10000, count: 20 }],
    }
    expect(longestValueDigits(groot)).toBe(5)
  })
})
