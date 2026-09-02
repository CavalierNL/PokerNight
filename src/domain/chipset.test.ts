import { describe, expect, it } from 'vitest'
import {
  denominations,
  chipsWithValue,
  totalCountForValue,
  HOUSE_RULES,
  STANDARD_500,
} from './chipset'

describe('denominations', () => {
  it('geeft unieke waardes oplopend terug', () => {
    expect(denominations(HOUSE_RULES)).toEqual([1, 5])
  })

  it('telt kleuren met dezelfde waarde als één denominatie', () => {
    const kleurenMetWaardeEen = HOUSE_RULES.chips.filter((c) => c.value === 1)
    expect(kleurenMetWaardeEen.length).toBeGreaterThan(1)
    expect(denominations(HOUSE_RULES)).toHaveLength(2)
  })

  it('herkent de vijf denominaties van de standaardset', () => {
    expect(denominations(STANDARD_500)).toEqual([1, 5, 25, 100, 500])
  })
})

describe('chipsWithValue', () => {
  it('geeft alle kleuren met die waarde', () => {
    expect(chipsWithValue(HOUSE_RULES, 5)).toHaveLength(1)
    expect(chipsWithValue(HOUSE_RULES, 1).length).toBeGreaterThan(1)
  })

  it('geeft een lege lijst voor een waarde die niet bestaat', () => {
    expect(chipsWithValue(HOUSE_RULES, 25)).toEqual([])
  })
})

describe('totalCountForValue', () => {
  it('telt de aantallen van alle kleuren met die waarde op', () => {
    const verwacht = HOUSE_RULES.chips
      .filter((c) => c.value === 1)
      .reduce((som, c) => som + c.count, 0)
    expect(totalCountForValue(HOUSE_RULES, 1)).toBe(verwacht)
  })
})
