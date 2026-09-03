import { buildStructure, type BlindLevel, type ColorUp, type StructureKind } from './blinds'
import { metInstellingen, type Chipset } from './chipset'

export type Trigger = 'time' | 'elimination' | 'both'

export type Settings = {
  playerNames: string[]
  startingStack: number
  levelMinutes: number
  /** Leeg betekent: doorspelen tot er één over is (last man standing). */
  durationMinutes?: number
  structure: StructureKind
  trigger: Trigger
  /**
   * Of de kleinste kleur onderweg uit het spel mag. Een keuze per toernooi en
   * niet per doos: dezelfde doos speel je de ene avond met en de andere zonder.
   * Bij een doos met minder dan drie waardes gebeurt het sowieso niet.
   */
  colorUp: boolean
  /**
   * De huisregel: de kleur die 5 waard is, de rest wordt 1. Leeg betekent dat de
   * doos zijn eigen waardes houdt.
   */
  houseRuleFiveColor?: string
  manualBigBlinds?: number[]
  chipsetId: string
}

/**
 * De klok telt nooit op per tick. Lopend betekent: er is een eindtijdstip en de
 * resterende tijd volgt uit de huidige tijd. Gepauzeerd betekent: de resterende
 * tijd staat vast. Daardoor overleeft de klok een refresh of een slapende laptop.
 *
 * Wel schuift er per tick hoogstens één level op. Slaapt de laptop drie levels
 * lang, dan gaan de blinds één level omhoog en begint dat level opnieuw — gemiste
 * levels worden bewust niet ingehaald, want er is in die tijd ook niet gespeeld.
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
  /** Totaal gepauzeerde tijd, zodat de optellende klok pauzes niet meetelt. */
  pausedMs: number
  /**
   * Er is zojuist een level omgegaan en dat is nog niet aan tafel bevestigd. De
   * klok staat zolang stil: een levelovergang die niemand ziet, kost anders de
   * eerste minuut van het nieuwe level.
   *
   * Ontbreekt bij een toernooi dat vóór deze versie is opgeslagen; dat leest als
   * "niets te bevestigen", en dat klopt.
   */
  wachtOpLevel?: boolean
}

/**
 * Een undo-stap. `takenAt` hoort erbij omdat een `Clock` alleen betekenis heeft
 * ten opzichte van een tijdstip: zonder dat zou undo een eindtijdstip uit het
 * verleden terugzetten en zou de klok meteen weer aflopen.
 */
type Snapshot = { core: TournamentCore; takenAt: number }

export type Tournament = TournamentCore & { history: Snapshot[] }

export type Action =
  | { type: 'tick'; now: number }
  | { type: 'playerOut'; index: number; now: number }
  | { type: 'advanceLevel'; now: number }
  | { type: 'togglePause'; now: number }
  | { type: 'bevestigLevel'; now: number }
  | { type: 'undo'; now: number }

const HISTORY_LIMIT = 20

export function createTournament(settings: Settings, chipset: Chipset, now: number): Tournament {
  const doos = metInstellingen(chipset, settings)
  const { levels, colorUps } = buildStructure(
    {
      kind: settings.structure,
      players: settings.playerNames.length,
      startingStack: settings.startingStack,
      durationMinutes: settings.durationMinutes,
      levelMinutes: settings.levelMinutes,
      manualBigBlinds: settings.manualBigBlinds,
      colorUp: settings.colorUp,
    },
    doos,
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
    wachtOpLevel: false,
    history: [],
  }
}

export function currentLevel(state: Tournament): BlindLevel | undefined {
  return state.levels[state.levelIndex]
}

export function nextLevel(state: Tournament): BlindLevel | undefined {
  return state.levels[state.levelIndex + 1]
}

export function remainingMs(state: Tournament, now: number): number {
  if (state.clock.state === 'paused') return state.clock.remainingMs
  return Math.max(0, state.clock.endsAt - now)
}

export function isLastLevel(state: Tournament): boolean {
  return state.levelIndex >= state.levels.length - 1
}

/**
 * Wanneer het toernooi naar verwachting klaar is, als er vanaf nu onafgebroken
 * doorgespeeld wordt. Omdat er vanaf `now` gerekend wordt, schuift de schatting
 * vanzelf op met elke pauze. Alleen zinvol als de tijd de levels opschuift.
 */
export function expectedEndAt(state: Tournament, now: number): number | undefined {
  // Zonder eindtijd zegt het laatste level niets over wanneer het klaar is: er
  // wordt gespeeld tot er één over is.
  if (state.settings.durationMinutes === undefined) return undefined
  if (state.settings.trigger === 'elimination') return undefined
  const levelsTeGaan = state.levels.length - state.levelIndex - 1
  return now + remainingMs(state, now) + levelsTeGaan * state.settings.levelMinutes * 60_000
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

function withHistory(state: Tournament, next: TournamentCore, now: number): Tournament {
  return {
    ...next,
    history: [{ core: core(state), takenAt: now }, ...state.history].slice(0, HISTORY_LIMIT),
  }
}

/**
 * Het volgende level, of `null` als er geen volgend level is. Dat onderscheid is
 * niet cosmetisch: zonder `null` zou elke tick op het laatste level een lege
 * undo-stap opleveren, en omdat het tafelscherm vier keer per seconde tikt zou
 * de undo-geschiedenis binnen vijf seconden vol staan met niets.
 */
function goToNextLevel(state: TournamentCore, now: number): TournamentCore | null {
  if (state.levelIndex >= state.levels.length - 1) return null
  return {
    ...state,
    levelIndex: state.levelIndex + 1,
    // De klok begint pas te lopen als de nieuwe blinds bevestigd zijn.
    clock: { state: 'paused', remainingMs: state.settings.levelMinutes * 60_000, pausedAt: now },
    wachtOpLevel: true,
  }
}

const advancesOnTime = (t: Trigger) => t === 'time' || t === 'both'
const advancesOnElimination = (t: Trigger) => t === 'elimination' || t === 'both'

/**
 * Zet een bewaarde klok terug alsof hij nu wordt hervat. Was er op het moment van
 * de snapshot geen tijd meer over — dan was de snapshot genomen precies toen het
 * level afliep — dan krijgt het teruggezette level een volle klok. Zonder dat zou
 * undo van een levelovergang meteen weer door de eerstvolgende tick ongedaan
 * worden gemaakt.
 */
function herstelKlok(snapshot: Snapshot, now: number, levelMinutes: number): Clock {
  if (snapshot.core.clock.state === 'paused') {
    return { state: 'paused', remainingMs: snapshot.core.clock.remainingMs, pausedAt: now }
  }
  const over = snapshot.core.clock.endsAt - snapshot.takenAt
  return { state: 'running', endsAt: now + (over > 0 ? over : levelMinutes * 60_000) }
}

export function reduce(state: Tournament, action: Action): Tournament {
  switch (action.type) {
    case 'tick': {
      if (state.clock.state === 'paused') return state
      if (!advancesOnTime(state.settings.trigger)) return state
      if (remainingMs(state, action.now) > 0) return state
      const volgende = goToNextLevel(core(state), action.now)
      return volgende ? withHistory(state, volgende, action.now) : state
    }

    case 'playerOut': {
      if (state.players[action.index]?.out) return state
      const spelers = state.players.map((p, i) => (i === action.index ? { ...p, out: true } : p))
      let volgende: TournamentCore = { ...core(state), players: spelers }
      // Tijdens een pauze wordt er niet gespeeld, dus verhoogt een eliminatie
      // de blinds niet.
      if (state.clock.state === 'running' && advancesOnElimination(state.settings.trigger)) {
        volgende = goToNextLevel(volgende, action.now) ?? volgende
      }
      return withHistory(state, volgende, action.now)
    }

    case 'advanceLevel': {
      const volgende = goToNextLevel(core(state), action.now)
      return volgende ? withHistory(state, volgende, action.now) : state
    }

    // Pauzeren komt niet in de geschiedenis. Het is geen zet die je terugdraait
    // maar een knop met een tegenhanger: hervatten. Zou het er wel in staan, dan
    // zou "ongedaan maken" na een pauze eerst die pauze afpellen in plaats van
    // de eliminatie of de levelovergang die je bedoelde.
    case 'togglePause': {
      if (state.clock.state === 'running') {
        return {
          ...state,
          clock: {
            state: 'paused',
            remainingMs: remainingMs(state, action.now),
            pausedAt: action.now,
          },
        }
      }
      return {
        ...state,
        pausedMs: state.pausedMs + (action.now - state.clock.pausedAt),
        clock: { state: 'running', endsAt: action.now + state.clock.remainingMs },
      }
    }

    /**
     * De nieuwe blinds zijn aan tafel gezien. De klok gaat lopen en de tijd die
     * daarmee gemoeid was telt als pauze: er is in die minuut niet gespeeld.
     */
    case 'bevestigLevel': {
      if (!state.wachtOpLevel || state.clock.state !== 'paused') return state
      return {
        ...state,
        wachtOpLevel: false,
        pausedMs: state.pausedMs + (action.now - state.clock.pausedAt),
        clock: { state: 'running', endsAt: action.now + state.clock.remainingMs },
      }
    }

    case 'undo': {
      const [vorige, ...rest] = state.history
      if (!vorige) return state
      return {
        ...vorige.core,
        clock: herstelKlok(vorige, action.now, state.settings.levelMinutes),
        // Gepauzeerde tijd is echt verstreken; die draai je niet terug.
        pausedMs: state.pausedMs,
        history: rest,
      }
    }
  }
}
