import { describe, expect, it } from 'vitest'
import { prepareSetup, suggestStartingStack } from './setup'
import { distributeChips } from './distribution'
import { STANDARD_500, TOERNOOI_DOOS, denominations } from './chipset'
import type { Settings } from './tournament'
import { KLEINE_DOOS } from './testdozen'

const basis: Settings = {
  playerNames: ['Sam', 'Ilse', 'Joost', 'Max', 'Nadia', 'Ravi'],
  startingStack: 100,
  levelMinutes: 15,
  durationMinutes: 180,
  structure: 'doubling',
  trigger: 'both',
  colorUp: true,
  chipsetId: KLEINE_DOOS.id,
}

const fouten = (setup: ReturnType<typeof prepareSetup>) =>
  setup.warnings.filter((w) => w.level === 'error').map((w) => w.message)

describe('prepareSetup — de gebruikelijke speelwijze', () => {
  const setup = prepareSetup(basis, KLEINE_DOOS)

  it('is startbaar', () => {
    expect(fouten(setup)).toEqual([])
    expect(setup.canStart).toBe(true)
  })

  it('levert een oplopende structuur en een volle startstack', () => {
    expect(setup.structure.levels.length).toBeGreaterThan(2)
    expect(setup.distribution.stackValue).toBe(100)
  })
})

describe('prepareSetup — realistische startstacks', () => {
  // De regel "reserveer twintig kleine blinds aan kleine chips" eiste bij een
  // startstack van 10000 duizend witte chips per speler. Alleen de
  // standaardwaarde 100 was daardoor startbaar.
  const gevallen = [
    { chipset: KLEINE_DOOS, startingStack: 100 },
    { chipset: KLEINE_DOOS, startingStack: 200 },
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
    expect(fouten(setup).join(' ')).toMatch(/maximaal \d+ chips per speler/)
  })
})

describe('prepareSetup — ongeldige invoer wordt vóór de start gevangen', () => {
  it('blokkeert een lege startstack', () => {
    expect(prepareSetup({ ...basis, startingStack: 0 }, KLEINE_DOOS).canStart).toBe(false)
  })

  it('blokkeert een duur waar geen twee levels in passen', () => {
    expect(prepareSetup({ ...basis, durationMinutes: 0 }, KLEINE_DOOS).canStart).toBe(false)
  })

  it('blokkeert één speler', () => {
    expect(prepareSetup({ ...basis, playerNames: ['Sam'] }, KLEINE_DOOS).canStart).toBe(false)
  })

  it('blokkeert een chipset met alleen een leeggemaakt waardeveld', () => {
    // Number('') is 0; zonder filter kwamen er NaN-blinds uit.
    const stuk = {
      id: 'stuk',
      name: 'Stuk',
      chips: [{ color: '#fff', value: 0, count: 100 }],
    }
    const setup = prepareSetup(basis, stuk)
    expect(setup.canStart).toBe(false)
    expect(setup.structure.levels.every((l) => Number.isFinite(l.smallBlind))).toBe(true)
  })
})

describe('prepareSetup — samenhang tussen de modules', () => {
  it('deelt geen chips uit die op level 0 al van tafel gaan', () => {
    const setup = prepareSetup({ ...basis, startingStack: 2000 }, STANDARD_500)
    const kleinsteUitgedeeld = Math.min(...setup.distribution.perPlayer.map((a) => a.value))
    expect(kleinsteUitgedeeld).toBeGreaterThanOrEqual(setup.structure.startDenomination)
  })

  it('kan de eerste kleine blind met de uitgedeelde chips betalen', () => {
    for (const startingStack of [100, 1000, 2000]) {
      const setup = prepareSetup({ ...basis, startingStack }, STANDARD_500)
      const kleinste = Math.min(...setup.distribution.perPlayer.map((a) => a.value))
      expect(setup.structure.levels[0].smallBlind % kleinste).toBe(0)
    }
  })
})

describe('suggestStartingStack', () => {
  it('stelt een bedrag voor dat de doos echt kan uitdelen', () => {
    for (const spelers of [2, 4, 6, 8, 10]) {
      const stack = suggestStartingStack(TOERNOOI_DOOS, spelers)
      expect(stack, `${spelers} spelers`).toBeDefined()

      const kleinste = denominations(TOERNOOI_DOOS)[0]
      const verdeling = distributeChips(TOERNOOI_DOOS, spelers, stack!, kleinste, kleinste)
      // Waarschuwingen mogen; de start blokkeren niet.
      const blokkades = verdeling.shortages.filter(
        (t) => t.kind === 'geenFiches' || t.kind === 'startstackNietGehaald',
      )
      expect(blokkades, `${spelers} spelers`).toEqual([])
      // De verdeling komt niet altijd op de cent uit; ver eronder blijven mag niet.
      expect(verdeling.stackValue, `${spelers} spelers`).toBeGreaterThan(stack! * 0.98)
    }
  })

  it('geeft een bedrag dat je met de chips uit die doos kunt neerleggen', () => {
    const stack = suggestStartingStack(TOERNOOI_DOOS, 8)!
    expect(stack % denominations(TOERNOOI_DOOS)[0]).toBe(0)
  })

  it('stelt minder voor naarmate er meer spelers zijn', () => {
    const weinig = suggestStartingStack(TOERNOOI_DOOS, 2)!
    const veel = suggestStartingStack(TOERNOOI_DOOS, 10)!
    expect(veel).toBeLessThanOrEqual(weinig)
  })

  it('zwijgt als de doos het gezelschap niet aankan', () => {
    // Vier chips in totaal, tien spelers: elke suggestie zou een leugen zijn.
    const minidoos = {
      id: 'mini',
      name: 'Mini',
      chips: [{ color: '#fff', value: 1, count: 4 }],
    }
    expect(suggestStartingStack(minidoos, 10)).toBeUndefined()
  })

  it('zwijgt bij een doos zonder chips', () => {
    expect(suggestStartingStack({ id: 'leeg', name: 'Leeg', chips: [] }, 6)).toBeUndefined()
  })
})
