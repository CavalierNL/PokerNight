import { describe, expect, it } from 'vitest'
import {
  PRESETS,
  STANDARD_500,
  chipsWithValue,
  denominations,
  kanColorUp,
  kopieerChipset,
  legeChipset,
  metHuisregel,
  metInstellingen,
  metPresets,
  nieuwChipsetId,
  totalCountForValue,
  ladderHeeftZin,
  TOERNOOI_DOOS,
} from './chipset'
import { KLEINE_DOOS } from './testdozen'

describe('denominations', () => {
  it('geeft unieke waardes oplopend terug', () => {
    expect(denominations(KLEINE_DOOS)).toEqual([1, 5])
  })

  it('telt kleuren met dezelfde waarde als één denominatie', () => {
    const kleurenMetWaardeEen = KLEINE_DOOS.chips.filter((c) => c.value === 1)
    expect(kleurenMetWaardeEen.length).toBeGreaterThan(1)
    expect(denominations(KLEINE_DOOS)).toHaveLength(2)
  })

  it('herkent de vijf denominaties van de standaardset', () => {
    expect(denominations(STANDARD_500)).toEqual([1, 5, 25, 100, 500])
  })
})

describe('chipsWithValue', () => {
  it('geeft alle kleuren met die waarde', () => {
    expect(chipsWithValue(KLEINE_DOOS, 5)).toHaveLength(1)
    expect(chipsWithValue(KLEINE_DOOS, 1).length).toBeGreaterThan(1)
  })

  it('geeft een lege lijst voor een waarde die niet bestaat', () => {
    expect(chipsWithValue(KLEINE_DOOS, 25)).toEqual([])
  })
})

describe('totalCountForValue', () => {
  it('telt de aantallen van alle kleuren met die waarde op', () => {
    const verwacht = KLEINE_DOOS.chips
      .filter((c) => c.value === 1)
      .reduce((som, c) => som + c.count, 0)
    expect(totalCountForValue(KLEINE_DOOS, 1)).toBe(verwacht)
  })
})

describe('dozen beheren', () => {
  it('geeft een id dat nog niet bestaat', () => {
    const bestaand = [{ ...KLEINE_DOOS, id: 'doos-2' }]
    const id = nieuwChipsetId(bestaand)
    expect(bestaand.some((c) => c.id === id)).toBe(false)
  })

  it('kopieert de chips los van het origineel', () => {
    const kopie = kopieerChipset(KLEINE_DOOS, PRESETS)
    kopie.chips[0].value = 999

    expect(kopie.id).not.toBe(KLEINE_DOOS.id)
    expect(kopie.name).toBe('Kleine doos (kopie)')
    expect(KLEINE_DOOS.chips[0].value).toBe(1)
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

describe('de huisregel', () => {
  it('maakt één kleur 5 waard en alle andere 1', () => {
    const groen = KLEINE_DOOS.chips[3].color
    const doos = metHuisregel(KLEINE_DOOS, groen)

    expect(denominations(doos)).toEqual([1, 5])
    for (const chip of doos.chips) {
      expect(chip.value, chip.color).toBe(chip.color === groen ? 5 : 1)
    }
  })

  it('laat de kleuren en de aantallen ongemoeid', () => {
    const doos = metHuisregel(STANDARD_500, STANDARD_500.chips[0].color)
    expect(doos.chips.map((c) => c.color)).toEqual(STANDARD_500.chips.map((c) => c.color))
    expect(doos.chips.map((c) => c.count)).toEqual(STANDARD_500.chips.map((c) => c.count))
  })

  it('slaat elke doos plat tot twee waardes, dus zonder color-up', () => {
    // De standaardset heeft er vijf; met de huisregel blijven er twee over.
    expect(kanColorUp(STANDARD_500)).toBe(true)
    expect(kanColorUp(metHuisregel(STANDARD_500, STANDARD_500.chips[2].color))).toBe(false)
  })

  it('raakt het origineel niet aan', () => {
    const voor = STANDARD_500.chips.map((c) => c.value)
    metHuisregel(STANDARD_500, STANDARD_500.chips[0].color)
    expect(STANDARD_500.chips.map((c) => c.value)).toEqual(voor)
  })

  it('maakt alles 1 als de gekozen kleur niet in de doos zit', () => {
    // Kan alleen door van doos te wisselen; het scherm houdt de keuze geldig.
    const doos = metHuisregel(KLEINE_DOOS, '#nietbestaand')
    expect(denominations(doos)).toEqual([1])
  })
})

describe('metInstellingen', () => {
  it('past de huisregel toe als er een kleur gekozen is', () => {
    const doos = metInstellingen(STANDARD_500, { houseRuleFiveColor: STANDARD_500.chips[1].color })
    expect(denominations(doos)).toEqual([1, 5])
  })

  it('laat de doos met rust als er geen kleur gekozen is', () => {
    expect(metInstellingen(STANDARD_500, {})).toBe(STANDARD_500)
  })
})

describe('ladderHeeftZin', () => {
  it('geldt bij een doos waarvan de tweede waarde vijf keer de eerste is', () => {
    // De huisregel maakt precies zo'n doos: 1 en 5.
    expect(ladderHeeftZin(metHuisregel(TOERNOOI_DOOS, TOERNOOI_DOOS.chips[0].color))).toBe(true)
    expect(ladderHeeftZin(STANDARD_500)).toBe(true)
  })

  it('geldt niet bij een doos die met 25 en 50 begint', () => {
    // Daar is elk veelvoud van 25 even goed te leggen; de reeks levert dan alleen
    // 125/250 op waar 100/200 net zo goed is.
    expect(ladderHeeftZin(TOERNOOI_DOOS)).toBe(false)
  })

  it('geldt niet bij een doos met maar één waarde', () => {
    expect(ladderHeeftZin({ id: 'een', name: 'Eén', chips: [{ color: '#fff', value: 5, count: 100 }] })).toBe(
      false,
    )
  })
})
