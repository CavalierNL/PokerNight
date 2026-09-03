import { buildStructure, type BlindLevel, type ColorUp, type StructureKind } from './blinds'
import { denominations, metInstellingen, type Chipset } from './chipset'
import { kiesDealer, schud, type Toeval } from './loting'
import { roundToPayable } from './amounts'

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
  /** Loot de zitplaatsen bij de start; de volgorde aan tafel volgt de loting. */
  shuffleSeats?: boolean
  /** Loot wie de eerste hand deelt. */
  randomDealer?: boolean
  /**
   * Of er onderweg nog iemand mag instappen, en waarmee. `startstack` is wat een
   * echt toernooi doet: laat binnenkomen met de blinds hoog is het nadeel van
   * laat komen. `gemiddelde` is eerlijker maar laat het aantal chips in het spel
   * groeien. Leeg betekent: de tafel ligt vast zodra er gedeeld is.
   */
  laatkomers?: 'startstack' | 'gemiddelde'
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

/**
 * `outAt` is het moment van uitschakelen. Nodig omdat de uitslag de omgekeerde
 * volgorde van uitvallen is, en `out` alleen zegt dát iemand eruit ligt.
 * Ontbreekt bij spelers die vóór deze versie zijn afgetikt.
 *
 * `stack` is waarmee iemand is ingestapt, en staat er alleen bij een laatkomer:
 * wie vanaf het begin meedoet heeft de startstack, en die staat al in de
 * instellingen.
 */
export type Player = { name: string; out: boolean; outAt?: number; stack?: number }

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
  /**
   * Het moment waarop er nog één speler over was. Zolang dit ontbreekt is het
   * toernooi bezig. Het staat in de core en niet ernaast, zodat ongedaan maken
   * ook het einde terugdraait — je tikt de laatste speler zo verkeerd af.
   */
  finishedAt?: number
  /** Wie de eerste hand deelt, als daarom geloot is. */
  dealer?: number
  /**
   * De kleinste chipwaarde van de doos waarmee gespeeld wordt. Bewaard omdat de
   * stack van een laatkomer erop afgerond wordt en de doos zelf hier niet is —
   * het toernooi hoort te weten waarmee het gespeeld wordt.
   */
  kleinsteChip?: number
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
  | { type: 'levelTerug'; now: number }
  | { type: 'spelerErbij'; name: string; now: number }
  | { type: 'togglePause'; now: number }
  | { type: 'bevestigLevel'; now: number }
  | { type: 'undo'; now: number }

const HISTORY_LIMIT = 20

export function createTournament(
  settings: Settings,
  chipset: Chipset,
  now: number,
  toeval: Toeval = Math.random,
): Tournament {
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

  const namen = settings.shuffleSeats ? schud(settings.playerNames, toeval) : settings.playerNames
  const dealer = settings.randomDealer ? kiesDealer(namen.length, toeval) : undefined

  // Is er geloot, dan begint het toernooi bij het levelscherm: daar staat wie
  // waar zit en wie deelt, en de klok wacht tot iedereen zit.
  const geloot = settings.shuffleSeats === true || settings.randomDealer === true
  const volleKlok = settings.levelMinutes * 60_000

  return {
    settings,
    levels,
    colorUps,
    levelIndex: 0,
    players: namen.map((name) => ({ name, out: false })),
    clock: geloot
      ? { state: 'paused', remainingMs: volleKlok, pausedAt: now }
      : { state: 'running', endsAt: now + volleKlok },
    startedAt: now,
    pausedMs: 0,
    wachtOpLevel: geloot,
    dealer,
    kleinsteChip: denominations(doos)[0],
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

export function isAfgelopen(state: Tournament): boolean {
  return state.finishedAt !== undefined
}

/**
 * De uitslag: de winnaar voorop, daarna de spelers in omgekeerde volgorde van
 * uitvallen. Wie het langst meedeed, staat het hoogst.
 *
 * Er wordt eerst op `out` gesorteerd en pas daarna op het tijdstip. Dat houdt de
 * winnaar bovenaan bij een toernooi dat nog van vóór `outAt` komt, waar de
 * tijdstippen ontbreken en de volgorde onbekend is.
 */
export function uitslag(state: Tournament): Player[] {
  return [...state.players].sort(
    (a, b) => Number(a.out) - Number(b.out) || (b.outAt ?? 0) - (a.outAt ?? 0),
  )
}

/** De tijd die er werkelijk gespeeld is: zonder de pauzes. */
export function speelduurMs(state: Tournament, now: number): number {
  const eind = state.finishedAt ?? now
  return Math.max(0, eind - state.startedAt - state.pausedMs)
}

/**
 * Alle chips die in het spel zijn. Een uitgeschakelde speler telt mee: zijn
 * chips liggen bij wie hem eruit heeft gespeeld. Een laatkomer brengt zijn eigen
 * stack mee, en die hoeft niet de startstack te zijn.
 */
export function totalChips(state: Tournament): number {
  return state.players.reduce((som, p) => som + (p.stack ?? state.settings.startingStack), 0)
}

/**
 * Waarmee iemand nu nog kan instappen. Bij `gemiddelde` afgerond op iets wat je
 * met de aanwezige chips kunt leggen — een stack van 3.417 kun je niet uitdelen.
 */
export function laatkomerStack(state: Tournament): number {
  if (state.settings.laatkomers !== 'gemiddelde') return state.settings.startingStack
  return roundToPayable(averageStack(state), state.kleinsteChip ?? 1)
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
 * Springt naar een level, of geeft `null` als dat level niet bestaat. Dat
 * onderscheid is niet cosmetisch: zonder `null` zou elke tick op het laatste
 * level een lege undo-stap opleveren, en omdat het tafelscherm vier keer per
 * seconde tikt zou de undo-geschiedenis binnen vijf seconden vol staan met niets.
 *
 * Het nieuwe level begint altijd met een volle klok, ook als je terug gaat.
 * Terug ga je omdat dat level niet af was — en zou de klok op 0:00 blijven
 * staan, dan zou de eerstvolgende tick hem meteen weer vooruit zetten.
 */
function naarLevel(state: TournamentCore, index: number, now: number): TournamentCore | null {
  if (index < 0 || index >= state.levels.length) return null
  return {
    ...state,
    levelIndex: index,
    // De klok begint pas te lopen als de nieuwe blinds bevestigd zijn.
    clock: { state: 'paused', remainingMs: state.settings.levelMinutes * 60_000, pausedAt: now },
    wachtOpLevel: true,
  }
}

function goToNextLevel(state: TournamentCore, now: number): TournamentCore | null {
  return naarLevel(state, state.levelIndex + 1, now)
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
      if (state.finishedAt !== undefined) return state
      if (state.clock.state === 'paused') return state
      if (!advancesOnTime(state.settings.trigger)) return state
      if (remainingMs(state, action.now) > 0) return state
      const volgende = goToNextLevel(core(state), action.now)
      return volgende ? withHistory(state, volgende, action.now) : state
    }

    case 'playerOut': {
      if (state.finishedAt !== undefined) return state
      if (state.players[action.index]?.out) return state
      const spelers = state.players.map((p, i) =>
        i === action.index ? { ...p, out: true, outAt: action.now } : p,
      )
      const volgende: TournamentCore = { ...core(state), players: spelers }

      // De laatste die afvalt maakt de ander winnaar. Dan gaan de blinds niet
      // meer omhoog en stopt de klok: wat daarna verstrijkt is opruimen.
      if (spelers.filter((p) => !p.out).length <= 1) {
        return withHistory(
          state,
          {
            ...volgende,
            finishedAt: action.now,
            clock: {
              state: 'paused',
              remainingMs: remainingMs(state, action.now),
              pausedAt: action.now,
            },
          },
          action.now,
        )
      }

      // Tijdens een pauze wordt er niet gespeeld, dus verhoogt een eliminatie
      // de blinds niet.
      if (state.clock.state === 'running' && advancesOnElimination(state.settings.trigger)) {
        return withHistory(state, goToNextLevel(volgende, action.now) ?? volgende, action.now)
      }
      return withHistory(state, volgende, action.now)
    }

    case 'advanceLevel': {
      if (state.finishedAt !== undefined) return state
      const volgende = goToNextLevel(core(state), action.now)
      return volgende ? withHistory(state, volgende, action.now) : state
    }

    /**
     * Handmatig een level terug. Iets anders dan ongedaan maken: dat draait de
     * vorige zet terug, wat die ook was, terwijl dit een besluit aan tafel is.
     * Het gaat daarom net als vooruit langs het levelscherm, zodat iedereen de
     * blinds ziet die weer gelden.
     */
    case 'levelTerug': {
      if (state.finishedAt !== undefined) return state
      const vorige = naarLevel(core(state), state.levelIndex - 1, action.now)
      return vorige ? withHistory(state, vorige, action.now) : state
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
     * Een laatkomer stapt in. Hij komt achteraan te zitten en niet op een
     * geloote plek: de tafel zit al, en de enige vrije stoel is de zijne.
     */
    case 'spelerErbij': {
      if (state.finishedAt !== undefined) return state
      if (state.settings.laatkomers === undefined) return state
      const naam = action.name.trim()
      if (naam === '') return state
      const speler: Player = { name: naam, out: false, stack: laatkomerStack(state) }
      return withHistory(
        state,
        { ...core(state), players: [...state.players, speler] },
        action.now,
      )
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
