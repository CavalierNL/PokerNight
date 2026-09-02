import { describe, expect, it } from 'vitest'
import {
  denominations,
  chipsWithValue,
  kopieerChipset,
  legeChipset,
  metPresets,
  nieuwChipsetId,
  totalCountForValue,
  HOUSE_RULES,
  PRESETS,
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

describe('dozen beheren', () => {
  it('geeft een id dat nog niet bestaat', () => {
    const bestaand = [{ ...HOUSE_RULES, id: 'doos-2' }]
    const id = nieuwChipsetId(bestaand)
    expect(bestaand.some((c) => c.id === id)).toBe(false)
  })

  it('kopieert de fiches los van het origineel', () => {
    const kopie = kopieerChipset(HOUSE_RULES, PRESETS)
    kopie.chips[0].value = 999

    expect(kopie.id).not.toBe(HOUSE_RULES.id)
    expect(kopie.name).toBe('Huisregel (5 en 1) (kopie)')
    expect(HOUSE_RULES.chips[0].value).toBe(1)
  })

  it('begint een nieuwe doos met één kleur', () => {
    const nieuw = legeChipset(PRESETS)
    expect(nieuw.chips).toHaveLength(1)
    expect(PRESETS.some((c) => c.id === nieuw.id)).toBe(false)
  })

  it('zet presets terug zonder eigen dozen weg te gooien', () => {
    const eigen = { ...legeChipset(PRESETS), name: 'Van mij' }
    const hersteld = metPresets([eigen])

    expect(hersteld.some((c) => c.name === 'Van mij')).toBe(true)
    for (const preset of PRESETS) {
      expect(hersteld.some((c) => c.id === preset.id), preset.name).toBe(true)
    }
  })

  it('voegt een preset niet nog een keer toe als hij er al is', () => {
    expect(metPresets(PRESETS)).toHaveLength(PRESETS.length)
  })
})
