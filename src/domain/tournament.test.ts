import { describe, expect, it } from 'vitest'
import {
  averageStack,
  averageStackInBigBlinds,
  createTournament,
  currentLevel,
  playersLeft,
  reduce,
  remainingMs,
  type Settings,
} from './tournament'
import { HOUSE_RULES } from './chipset'

const T0 = 1_000_000

const basis: Settings = {
  playerNames: ['Sam', 'Ilse', 'Joost', 'Max'],
  buyIn: 10,
  startingStack: 100,
  levelMinutes: 15,
  durationMinutes: 120,
  structure: 'doubling',
  trigger: 'both',
  chipsetId: HOUSE_RULES.id,
}

const maak = (overrides: Partial<Settings> = {}) =>
  createTournament({ ...basis, ...overrides }, HOUSE_RULES, T0)

describe('createTournament', () => {
  it('begint op level 0 met een lopende klok', () => {
    const t = maak()
    expect(t.levelIndex).toBe(0)
    expect(t.clock.state).toBe('running')
  })

  it('zet alle spelers in het toernooi', () => {
    expect(playersLeft(maak())).toBe(4)
  })

  it('laat de klok de levellengte lopen', () => {
    expect(remainingMs(maak(), T0)).toBe(15 * 60 * 1000)
  })
})

describe('tick', () => {
  it('verhoogt het level als de tijd om is en de trigger tijd omvat', () => {
    const t = maak({ trigger: 'time' })
    const na = reduce(t, { type: 'tick', now: T0 + 15 * 60 * 1000 })
    expect(na.levelIndex).toBe(1)
  })

  it('verhoogt het level niet zolang er tijd over is', () => {
    const t = maak({ trigger: 'time' })
    const na = reduce(t, { type: 'tick', now: T0 + 60 * 1000 })
    expect(na.levelIndex).toBe(0)
  })

  it('verhoogt het level niet bij de trigger eliminatie', () => {
    const t = maak({ trigger: 'elimination' })
    const na = reduce(t, { type: 'tick', now: T0 + 60 * 60 * 1000 })
    expect(na.levelIndex).toBe(0)
  })

  it('doet niets als de klok gepauzeerd is', () => {
    const t = reduce(maak(), { type: 'togglePause', now: T0 })
    const na = reduce(t, { type: 'tick', now: T0 + 60 * 60 * 1000 })
    expect(na.levelIndex).toBe(0)
  })
})

describe('playerOut', () => {
  it('haalt de speler uit het toernooi', () => {
    const na = reduce(maak(), { type: 'playerOut', index: 1, now: T0 })
    expect(na.players[1].out).toBe(true)
    expect(playersLeft(na)).toBe(3)
  })

  it('verhoogt het level bij de trigger eliminatie', () => {
    const t = maak({ trigger: 'elimination' })
    const na = reduce(t, { type: 'playerOut', index: 0, now: T0 })
    expect(na.levelIndex).toBe(1)
  })

  it('zet de leveltimer terug op vol bij een eliminatie', () => {
    const t = maak({ trigger: 'both' })
    const halverwege = T0 + 7 * 60 * 1000
    const na = reduce(t, { type: 'playerOut', index: 0, now: halverwege })
    expect(remainingMs(na, halverwege)).toBe(15 * 60 * 1000)
  })

  it('verhoogt het level niet bij de trigger tijd', () => {
    const t = maak({ trigger: 'time' })
    const na = reduce(t, { type: 'playerOut', index: 0, now: T0 })
    expect(na.levelIndex).toBe(0)
  })

  it('verhoogt het level niet tijdens een pauze', () => {
    const t = reduce(maak({ trigger: 'both' }), { type: 'togglePause', now: T0 })
    const na = reduce(t, { type: 'playerOut', index: 0, now: T0 })
    expect(na.levelIndex).toBe(0)
    expect(na.players[0].out).toBe(true)
  })
})

describe('togglePause', () => {
  it('bevriest de resterende tijd', () => {
    const t = maak()
    const gepauzeerd = reduce(t, { type: 'togglePause', now: T0 + 5 * 60 * 1000 })
    expect(gepauzeerd.clock.state).toBe('paused')
    expect(remainingMs(gepauzeerd, T0 + 60 * 60 * 1000)).toBe(10 * 60 * 1000)
  })

  it('hervat waar de klok gebleven was', () => {
    const t = maak()
    const gepauzeerd = reduce(t, { type: 'togglePause', now: T0 + 5 * 60 * 1000 })
    const hervat = reduce(gepauzeerd, { type: 'togglePause', now: T0 + 60 * 60 * 1000 })
    expect(hervat.clock.state).toBe('running')
    expect(remainingMs(hervat, T0 + 60 * 60 * 1000)).toBe(10 * 60 * 1000)
  })

  it('telt de gepauzeerde tijd op', () => {
    const t = maak()
    const gepauzeerd = reduce(t, { type: 'togglePause', now: T0 })
    const hervat = reduce(gepauzeerd, { type: 'togglePause', now: T0 + 3 * 60 * 1000 })
    expect(hervat.pausedMs).toBe(3 * 60 * 1000)
  })
})

describe('undo', () => {
  it('draait een eliminatie terug', () => {
    const t = maak()
    const na = reduce(t, { type: 'playerOut', index: 2, now: T0 })
    const terug = reduce(na, { type: 'undo' })
    expect(terug.players[2].out).toBe(false)
    expect(terug.levelIndex).toBe(0)
  })

  it('doet niets als er niets terug te draaien is', () => {
    const t = maak()
    expect(reduce(t, { type: 'undo' }).players).toEqual(t.players)
  })
})

describe('gemiddelde stack', () => {
  it('is het totaal gedeeld door de spelers die nog meedoen', () => {
    const t = maak()
    expect(averageStack(t)).toBe(100)
    const na = reduce(t, { type: 'playerOut', index: 0, now: T0 })
    expect(averageStack(na)).toBeCloseTo(400 / 3)
  })

  it('rekent om naar big blinds', () => {
    const t = maak()
    const bb = currentLevel(t).bigBlind
    expect(averageStackInBigBlinds(t)).toBeCloseTo(100 / bb)
  })
})

describe('einde structuur', () => {
  it('blijft op het laatste level staan', () => {
    let t = maak({ trigger: 'time', durationMinutes: 30 })
    const laatste = t.levels.length - 1
    for (let i = 0; i < 10; i++) {
      t = reduce(t, { type: 'advanceLevel', now: T0 })
    }
    expect(t.levelIndex).toBe(laatste)
  })
})
