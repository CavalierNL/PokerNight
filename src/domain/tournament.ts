import { buildStructure, type BlindLevel, type ColorUp, type StructureKind } from './blinds'
import type { Chipset } from './chipset'

export type Trigger = 'time' | 'elimination' | 'both'

export type Settings = {
  playerNames: string[]
  /** Inleg per speler in euro's. */
  buyIn: number
  startingStack: number
  levelMinutes: number
  durationMinutes: number
  structure: StructureKind
  trigger: Trigger
  manualBigBlinds?: number[]
  chipsetId: string
}

/**
 * De klok telt nooit op per tick. Lopend betekent: er is een eindtijdstip en de
 * resterende tijd volgt uit de huidige tijd. Gepauzeerd betekent: de resterende
 * tijd staat vast. Daardoor overleeft de klok een refresh of een slapende laptop.
 */
export type Clock =
  | { state: 'running'; endsAt: number }
  | { state: 'paused'; remainingMs: number; pausedAt: number }

export type Player = { name: string; out: boolean }

/** De toernooistate zonder de geschiedenis, zodat undo geen zichzelf bevattende boom wordt. */
type TournamentCore = {
  settings: Settings
  levels: BlindLevel[]
  colorUps: ColorUp[]
  levelIndex: number
  players: Player[]
  clock: Clock
  startedAt: number
  /** Totaal gepauzeerde tijd, voor de verwachte eindtijd. */
  pausedMs: number
}

export type Tournament = TournamentCore & { history: TournamentCore[] }

export type Action =
  | { type: 'tick'; now: number }
  | { type: 'playerOut'; index: number; now: number }
  | { type: 'advanceLevel'; now: number }
  | { type: 'togglePause'; now: number }
  | { type: 'undo' }

const HISTORY_LIMIT = 20

export function createTournament(settings: Settings, chipset: Chipset, now: number): Tournament {
  const { levels, colorUps } = buildStructure(
    {
      kind: settings.structure,
      players: settings.playerNames.length,
      startingStack: settings.startingStack,
      durationMinutes: settings.durationMinutes,
      levelMinutes: settings.levelMinutes,
      manualBigBlinds: settings.manualBigBlinds,
    },
    chipset,
  )

  return {
    settings,
    levels,
    colorUps,
    levelIndex: 0,
    players: settings.playerNames.map((name) => ({ name, out: false })),
    clock: { state: 'running', endsAt: now + settings.levelMinutes * 60_000 },
    startedAt: now,
    pausedMs: 0,
    history: [],
  }
}

export function currentLevel(state: Tournament): BlindLevel {
  return state.levels[state.levelIndex]
}

export function nextLevel(state: Tournament): BlindLevel | undefined {
  return state.levels[state.levelIndex + 1]
}

export function remainingMs(state: Tournament, now: number): number {
  if (state.clock.state === 'paused') return state.clock.remainingMs
  return Math.max(0, state.clock.endsAt - now)
}

export function playersLeft(state: Tournament): number {
  return state.players.filter((p) => !p.out).length
}

export function totalChips(state: Tournament): number {
  return state.players.length * state.settings.startingStack
}

export function averageStack(state: Tournament): number {
  const over = playersLeft(state)
  return over === 0 ? 0 : totalChips(state) / over
}

export function averageStackInBigBlinds(state: Tournament): number {
  const bb = currentLevel(state)?.bigBlind ?? 0
  return bb === 0 ? 0 : averageStack(state) / bb
}

export function colorUpAt(state: Tournament, levelIndex: number): ColorUp | undefined {
  return state.colorUps.find((c) => c.levelIndex === levelIndex)
}

function core(state: Tournament): TournamentCore {
  const { history: _geschiedenis, ...rest } = state
  return rest
}

function withHistory(state: Tournament, next: TournamentCore): Tournament {
  return { ...next, history: [core(state), ...state.history].slice(0, HISTORY_LIMIT) }
}

/** Zet het level één op en start de leveltimer opnieuw. Blijft op het laatste level staan. */
function goToNextLevel(state: TournamentCore, now: number): TournamentCore {
  if (state.levelIndex >= state.levels.length - 1) return state
  return {
    ...state,
    levelIndex: state.levelIndex + 1,
    clock: { state: 'running', endsAt: now + state.settings.levelMinutes * 60_000 },
  }
}

const advancesOnTime = (t: Trigger) => t === 'time' || t === 'both'
const advancesOnElimination = (t: Trigger) => t === 'elimination' || t === 'both'

export function reduce(state: Tournament, action: Action): Tournament {
  switch (action.type) {
    case 'tick': {
      if (state.clock.state === 'paused') return state
      if (!advancesOnTime(state.settings.trigger)) return state
      if (remainingMs(state, action.now) > 0) return state
      return withHistory(state, goToNextLevel(core(state), action.now))
    }

    case 'playerOut': {
      if (state.players[action.index]?.out) return state
      const spelers = state.players.map((p, i) => (i === action.index ? { ...p, out: true } : p))
      let volgende: TournamentCore = { ...core(state), players: spelers }
      // Tijdens een pauze wordt er niet gespeeld, dus verhoogt een eliminatie
      // de blinds niet.
      if (state.clock.state === 'running' && advancesOnElimination(state.settings.trigger)) {
        volgende = goToNextLevel(volgende, action.now)
      }
      return withHistory(state, volgende)
    }

    case 'advanceLevel':
      return withHistory(state, goToNextLevel(core(state), action.now))

    case 'togglePause': {
      if (state.clock.state === 'running') {
        return withHistory(state, {
          ...core(state),
          clock: {
            state: 'paused',
            remainingMs: remainingMs(state, action.now),
            pausedAt: action.now,
          },
        })
      }
      return withHistory(state, {
        ...core(state),
        pausedMs: state.pausedMs + (action.now - state.clock.pausedAt),
        clock: { state: 'running', endsAt: action.now + state.clock.remainingMs },
      })
    }

    case 'undo': {
      const [vorige, ...rest] = state.history
      if (!vorige) return state
      return { ...vorige, history: rest }
    }
  }
}
