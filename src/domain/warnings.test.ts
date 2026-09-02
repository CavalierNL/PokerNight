import { describe, expect, it } from 'vitest'
import { setupWarnings } from './warnings'
import type { Settings } from './tournament'
import type { Structure } from './blinds'
import type { Distribution } from './distribution'

const settings: Settings = {
  playerNames: ['Sam', 'Ilse', 'Joost', 'Max'],
  buyIn: 10,
  startingStack: 100,
  levelMinutes: 15,
  durationMinutes: 120,
  structure: 'doubling',
  trigger: 'both',
  chipsetId: 'huisregel',
}

const goedeStructuur: Structure = {
  levels: [
    { index: 0, smallBlind: 1, bigBlind: 2 },
    { index: 1, smallBlind: 2, bigBlind: 4 },
  ],
  colorUps: [],
}

const goedeVerdeling: Distribution = {
  perPlayer: [{ name: 'wit', color: '#fff', value: 1, count: 100 }],
  stackValue: 100,
  shortages: [],
  maxPlayers: 8,
}

describe('setupWarnings', () => {
  it('meldt niets als alles klopt', () => {
    expect(setupWarnings(settings, goedeStructuur, goedeVerdeling)).toEqual([])
  })

  it('meldt een fout bij minder dan twee spelers', () => {
    const warnings = setupWarnings(
      { ...settings, playerNames: ['Sam'] },
      goedeStructuur,
      goedeVerdeling,
    )
    expect(warnings.some((w) => w.level === 'error')).toBe(true)
  })

  it('geeft tekorten uit de chipverdeling door', () => {
    const verdeling = { ...goedeVerdeling, shortages: ['Te weinig witte fiches.'] }
    const warnings = setupWarnings(settings, goedeStructuur, verdeling)
    expect(warnings.some((w) => w.message.includes('Te weinig witte fiches.'))).toBe(true)
  })

  it('waarschuwt als de eind-big-blind boven de gemiddelde stack uitkomt', () => {
    const structuur: Structure = {
      levels: [
        { index: 0, smallBlind: 1, bigBlind: 2 },
        { index: 1, smallBlind: 250, bigBlind: 500 },
      ],
      colorUps: [],
    }
    const warnings = setupWarnings(settings, structuur, goedeVerdeling)
    expect(warnings.some((w) => w.level === 'warning')).toBe(true)
  })

  it('meldt een fout bij een structuur zonder levels', () => {
    const warnings = setupWarnings(settings, { levels: [], colorUps: [] }, goedeVerdeling)
    expect(warnings.some((w) => w.level === 'error')).toBe(true)
  })
})
