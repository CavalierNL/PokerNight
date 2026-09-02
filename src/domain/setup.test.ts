import { describe, expect, it } from 'vitest'
import { prepareSetup } from './setup'
import { HOUSE_RULES, STANDARD_500 } from './chipset'
import type { Settings } from './tournament'

const basis: Settings = {
  playerNames: ['Sam', 'Ilse', 'Joost', 'Max', 'Nadia', 'Ravi'],
  buyIn: 10,
  startingStack: 100,
  levelMinutes: 15,
  durationMinutes: 180,
  structure: 'doubling',
  trigger: 'both',
  chipsetId: HOUSE_RULES.id,
}

const fouten = (setup: ReturnType<typeof prepareSetup>) =>
  setup.warnings.filter((w) => w.level === 'error').map((w) => w.message)

describe('prepareSetup — de gebruikelijke speelwijze', () => {
  const setup = prepareSetup(basis, HOUSE_RULES)

  it('is startbaar', () => {
    expect(fouten(setup)).toEqual([])
    expect(setup.canStart).toBe(true)
  })

  it('levert een oplopende structuur en een volle startstack', () => {
    expect(setup.structure.levels.length).toBeGreaterThan(2)
    expect(setup.distribution.stackValue).toBe(100)
  })

  it('verdeelt de hele pot', () => {
    expect(setup.payouts.pot).toBe(60)
    expect(setup.payouts.places.reduce((s, p) => s + p.amount, 0)).toBe(60)
  })
})

describe('prepareSetup — realistische startstacks', () => {
  // De regel "reserveer twintig kleine blinds aan kleine fiches" eiste bij een
  // startstack van 10000 duizend witte fiches per speler. Alleen de
  // standaardwaarde 100 was daardoor startbaar.
  const gevallen = [
    { chipset: HOUSE_RULES, startingStack: 100 },
    { chipset: HOUSE_RULES, startingStack: 200 },
    { chipset: STANDARD_500, startingStack: 100 },
    { chipset: STANDARD_500, startingStack: 1000 },
    { chipset: STANDARD_500, startingStack: 2000 },
  ]

  for (const { chipset, startingStack } of gevallen) {
    for (const structure of ['doubling', 'calculated'] as const) {
      it(`is startbaar: ${chipset.name}, stack ${startingStack}, ${structure}`, () => {
        const setup = prepareSetup({ ...basis, startingStack, structure }, chipset)
        expect(fouten(setup)).toEqual([])
      })
    }
  }

  it('legt uit wat er wél kan als de doos de startstack niet haalt', () => {
    const setup = prepareSetup({ ...basis, startingStack: 100_000 }, STANDARD_500)
    expect(setup.canStart).toBe(false)
    expect(fouten(setup).join(' ')).toMatch(/maximaal \d+ fiches per speler/)
  })
})

describe('prepareSetup — ongeldige invoer wordt vóór de start gevangen', () => {
  it('blokkeert een lege startstack', () => {
    expect(prepareSetup({ ...basis, startingStack: 0 }, HOUSE_RULES).canStart).toBe(false)
  })

  it('blokkeert een duur waar geen twee levels in passen', () => {
    expect(prepareSetup({ ...basis, durationMinutes: 0 }, HOUSE_RULES).canStart).toBe(false)
  })

  it('blokkeert één speler', () => {
    expect(prepareSetup({ ...basis, playerNames: ['Sam'] }, HOUSE_RULES).canStart).toBe(false)
  })

  it('blokkeert een chipset met alleen een leeggemaakt waardeveld', () => {
    // Number('') is 0; zonder filter kwamen er NaN-blinds uit.
    const stuk = {
      id: 'stuk',
      name: 'Stuk',
      chips: [{ name: 'wit', color: '#fff', value: 0, count: 100 }],
    }
    const setup = prepareSetup(basis, stuk)
    expect(setup.canStart).toBe(false)
    expect(setup.structure.levels.every((l) => Number.isFinite(l.smallBlind))).toBe(true)
  })
})

describe('prepareSetup — samenhang tussen de modules', () => {
  it('deelt geen fiches uit die op level 0 al van tafel gaan', () => {
    const setup = prepareSetup({ ...basis, startingStack: 2000 }, STANDARD_500)
    const kleinsteUitgedeeld = Math.min(...setup.distribution.perPlayer.map((a) => a.value))
    expect(kleinsteUitgedeeld).toBeGreaterThanOrEqual(setup.structure.startDenomination)
  })

  it('kan de eerste kleine blind met de uitgedeelde fiches betalen', () => {
    for (const startingStack of [100, 1000, 2000]) {
      const setup = prepareSetup({ ...basis, startingStack }, STANDARD_500)
      const kleinste = Math.min(...setup.distribution.perPlayer.map((a) => a.value))
      expect(setup.structure.levels[0].smallBlind % kleinste).toBe(0)
    }
  })
})
