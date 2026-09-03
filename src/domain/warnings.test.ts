import { describe, expect, it } from 'vitest'
import { setupWarnings } from './warnings'
import type { Settings } from './tournament'
import type { Structure } from './blinds'
import type { Distribution } from './distribution'

const settings: Settings = {
  playerNames: ['Sam', 'Ilse', 'Joost', 'Max'],
  startingStack: 100,
  levelMinutes: 15,
  durationMinutes: 120,
  structure: 'doubling',
  trigger: 'both',
  colorUp: true,
  chipsetId: 'huisregel',
}

const rustigeStructuur: Structure = {
  levels: [
    { index: 0, smallBlind: 1, bigBlind: 2 },
    { index: 1, smallBlind: 2, bigBlind: 4 },
    { index: 2, smallBlind: 4, bigBlind: 8 },
    { index: 3, smallBlind: 8, bigBlind: 16 },
  ],
  colorUps: [],
  startDenomination: 1,
}

const goedeVerdeling: Distribution = {
  perPlayer: [{ color: '#fff', value: 1, count: 100 }],
  stackValue: 100,
  shortages: [],
  maxPlayers: 4,
}

const fouten = (w: ReturnType<typeof setupWarnings>) => w.filter((x) => x.level === 'error')

describe('setupWarnings', () => {
  it('meldt niets als alles klopt', () => {
    expect(setupWarnings(settings, rustigeStructuur, goedeVerdeling)).toEqual([])
  })

  it('meldt een fout bij minder dan twee spelers', () => {
    const w = setupWarnings({ ...settings, playerNames: ['Sam'] }, rustigeStructuur, goedeVerdeling)
    expect(fouten(w).length).toBeGreaterThan(0)
  })

  it('meldt een fout bij een lege startstack', () => {
    // Het veld leegmaken geeft Number('') === 0; dat was startbaar.
    const w = setupWarnings({ ...settings, startingStack: 0 }, rustigeStructuur, goedeVerdeling)
    expect(fouten(w).length).toBeGreaterThan(0)
  })

  it('meldt een fout als er geen twee levels in de duur passen', () => {
    const w = setupWarnings({ ...settings, durationMinutes: 0 }, rustigeStructuur, goedeVerdeling)
    expect(fouten(w).length).toBeGreaterThan(0)
  })

  it('meldt een fout bij een structuur zonder levels', () => {
    const w = setupWarnings(
      settings,
      { levels: [], colorUps: [], startDenomination: 1 },
      goedeVerdeling,
    )
    expect(fouten(w).length).toBeGreaterThan(0)
  })
})

describe('tekorten uit de chipverdeling', () => {
  it('blokkeert als de doos de startstack niet haalt, en noemt de uitweg', () => {
    const verdeling: Distribution = {
      ...goedeVerdeling,
      shortages: [{ kind: 'startstackNietGehaald', bereikt: 40, gewenst: 100 }],
      maxPlayers: 2,
    }
    const w = setupWarnings(settings, rustigeStructuur, verdeling)
    expect(fouten(w)).toHaveLength(1)
    expect(fouten(w)[0].message).toContain('40')
    expect(fouten(w)[0].message).toContain('2 spelers')
  })

  it('blokkeert niet bij minder kleine chips dan de richtlijn', () => {
    // De spec noemt dit expliciet een richtlijn. Als error maakte hij elke
    // realistische startstack onstartbaar.
    const verdeling: Distribution = {
      ...goedeVerdeling,
      shortages: [{ kind: 'weinigKleineFiches', value: 5, perSpeler: 18, gewenst: 200 }],
    }
    const w = setupWarnings(settings, rustigeStructuur, verdeling)
    expect(fouten(w)).toHaveLength(0)
    expect(w.some((x) => x.level === 'warning')).toBe(true)
  })

  it('blokkeert bij een pokerdoos zonder chips', () => {
    const verdeling: Distribution = {
      perPlayer: [],
      stackValue: 0,
      shortages: [{ kind: 'geenFiches' }],
      maxPlayers: 0,
    }
    expect(fouten(setupWarnings(settings, rustigeStructuur, verdeling)).length).toBeGreaterThan(0)
  })
})

describe('waarschuwing over hard oplopende blinds', () => {
  it('zwijgt als de blinds pas laat de stack voorbijgaan', () => {
    const w = setupWarnings(settings, rustigeStructuur, goedeVerdeling)
    expect(w).toEqual([])
  })

  it('waarschuwt als het toernooi al in de eerste helft beslist is', () => {
    const steil: Structure = {
      levels: [
        { index: 0, smallBlind: 1, bigBlind: 2 },
        { index: 1, smallBlind: 100, bigBlind: 200 },
        { index: 2, smallBlind: 200, bigBlind: 400 },
        { index: 3, smallBlind: 400, bigBlind: 800 },
      ],
      colorUps: [],
      startDenomination: 1,
    }
    const w = setupWarnings(settings, steil, goedeVerdeling)
    expect(w.some((x) => x.level === 'warning' && x.message.includes('level 2'))).toBe(true)
  })
})
