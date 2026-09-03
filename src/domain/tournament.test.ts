import { describe, expect, it } from 'vitest'
import {
  averageStack,
  averageStackInBigBlinds,
  createTournament,
  currentLevel,
  expectedEndAt,
  playersLeft,
  reduce,
  remainingMs,
  type Settings,
  type Tournament,
} from './tournament'
import { KLEINE_DOOS } from './testdozen'

const T0 = 1_000_000
const MINUUT = 60_000

const basis: Settings = {
  playerNames: ['Sam', 'Ilse', 'Joost', 'Max'],
  startingStack: 100,
  levelMinutes: 15,
  durationMinutes: 120,
  structure: 'doubling',
  trigger: 'both',
  colorUp: true,
  chipsetId: KLEINE_DOOS.id,
}

const maak = (overrides: Partial<Settings> = {}) =>
  createTournament({ ...basis, ...overrides }, KLEINE_DOOS, T0)

/** Zet het toernooi op het laatste level. */
function naarLaatsteLevel(t: Tournament, now = T0): Tournament {
  while (t.levelIndex < t.levels.length - 1) t = reduce(t, { type: 'advanceLevel', now })
  return t
}

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
    expect(remainingMs(maak(), T0)).toBe(15 * MINUUT)
  })
})

describe('tick', () => {
  it('verhoogt het level als de tijd om is en de trigger tijd omvat', () => {
    const na = reduce(maak({ trigger: 'time' }), { type: 'tick', now: T0 + 15 * MINUUT })
    expect(na.levelIndex).toBe(1)
  })

  it('verhoogt het level niet zolang er tijd over is', () => {
    const na = reduce(maak({ trigger: 'time' }), { type: 'tick', now: T0 + MINUUT })
    expect(na.levelIndex).toBe(0)
  })

  it('verhoogt het level niet bij de trigger eliminatie', () => {
    const na = reduce(maak({ trigger: 'elimination' }), { type: 'tick', now: T0 + 60 * MINUUT })
    expect(na.levelIndex).toBe(0)
  })

  it('doet niets als de klok gepauzeerd is', () => {
    const t = reduce(maak(), { type: 'togglePause', now: T0 })
    expect(reduce(t, { type: 'tick', now: T0 + 60 * MINUUT }).levelIndex).toBe(0)
  })

  it('laat de state ongemoeid als er geen volgend level meer is', () => {
    // Anders levert elke tick een nieuw object op. Het tafelscherm tikt vier keer
    // per seconde, dus dat betekent vier renders en vier schrijfacties naar
    // localStorage per seconde, en een undo-geschiedenis die binnen vijf seconden
    // vol staat met lege stappen.
    const laatste = naarLaatsteLevel(maak({ trigger: 'time' }))
    const veelLater = T0 + 999 * MINUUT
    const na = reduce(laatste, { type: 'tick', now: veelLater })
    expect(na).toBe(laatste)

    let herhaald = laatste
    for (let i = 0; i < 40; i++) {
      herhaald = reduce(herhaald, { type: 'tick', now: veelLater + i })
    }
    expect(herhaald.history.length).toBe(laatste.history.length)
  })
})

describe('playerOut', () => {
  it('haalt de speler uit het toernooi', () => {
    const na = reduce(maak(), { type: 'playerOut', index: 1, now: T0 })
    expect(na.players[1].out).toBe(true)
    expect(playersLeft(na)).toBe(3)
  })

  it('verhoogt het level bij de trigger eliminatie', () => {
    const na = reduce(maak({ trigger: 'elimination' }), { type: 'playerOut', index: 0, now: T0 })
    expect(na.levelIndex).toBe(1)
  })

  it('zet de leveltimer terug op vol bij een eliminatie', () => {
    const halverwege = T0 + 7 * MINUUT
    const na = reduce(maak(), { type: 'playerOut', index: 0, now: halverwege })
    expect(remainingMs(na, halverwege)).toBe(15 * MINUUT)
  })

  it('verhoogt het level niet bij de trigger tijd', () => {
    const na = reduce(maak({ trigger: 'time' }), { type: 'playerOut', index: 0, now: T0 })
    expect(na.levelIndex).toBe(0)
  })

  it('verhoogt het level niet tijdens een pauze', () => {
    const t = reduce(maak(), { type: 'togglePause', now: T0 })
    const na = reduce(t, { type: 'playerOut', index: 0, now: T0 })
    expect(na.levelIndex).toBe(0)
    expect(na.players[0].out).toBe(true)
  })

  it('haalt de speler er nog steeds uit op het laatste level', () => {
    const laatste = naarLaatsteLevel(maak())
    const na = reduce(laatste, { type: 'playerOut', index: 2, now: T0 })
    expect(na.players[2].out).toBe(true)
    expect(na.levelIndex).toBe(laatste.levelIndex)
  })
})

describe('togglePause', () => {
  it('bevriest de resterende tijd', () => {
    const gepauzeerd = reduce(maak(), { type: 'togglePause', now: T0 + 5 * MINUUT })
    expect(gepauzeerd.clock.state).toBe('paused')
    expect(remainingMs(gepauzeerd, T0 + 60 * MINUUT)).toBe(10 * MINUUT)
  })

  it('hervat waar de klok gebleven was', () => {
    const gepauzeerd = reduce(maak(), { type: 'togglePause', now: T0 + 5 * MINUUT })
    const hervat = reduce(gepauzeerd, { type: 'togglePause', now: T0 + 60 * MINUUT })
    expect(hervat.clock.state).toBe('running')
    expect(remainingMs(hervat, T0 + 60 * MINUUT)).toBe(10 * MINUUT)
  })

  it('telt de gepauzeerde tijd op', () => {
    const gepauzeerd = reduce(maak(), { type: 'togglePause', now: T0 })
    const hervat = reduce(gepauzeerd, { type: 'togglePause', now: T0 + 3 * MINUUT })
    expect(hervat.pausedMs).toBe(3 * MINUUT)
  })
})

describe('undo', () => {
  it('draait een eliminatie terug', () => {
    const na = reduce(maak(), { type: 'playerOut', index: 2, now: T0 })
    const terug = reduce(na, { type: 'undo', now: T0 })
    expect(terug.players[2].out).toBe(false)
    expect(terug.levelIndex).toBe(0)
  })

  it('houdt de resterende tijd van het level intact', () => {
    const halverwege = T0 + 7 * MINUUT
    const na = reduce(maak({ trigger: 'time' }), { type: 'playerOut', index: 0, now: halverwege })
    const terug = reduce(na, { type: 'undo', now: halverwege })
    expect(remainingMs(terug, halverwege)).toBe(8 * MINUUT)
  })

  it('draait een tijdgestuurde levelovergang echt terug', () => {
    // De teruggezette klok stond op nul, dus de eerstvolgende tick zette het
    // level meteen weer omhoog en deed undo in de praktijk niets.
    const om = T0 + 15 * MINUUT
    const t = reduce(maak({ trigger: 'time' }), { type: 'tick', now: om })
    expect(t.levelIndex).toBe(1)

    const terug = reduce(t, { type: 'undo', now: om })
    expect(terug.levelIndex).toBe(0)
    expect(remainingMs(terug, om)).toBe(15 * MINUUT)
    expect(reduce(terug, { type: 'tick', now: om + 250 }).levelIndex).toBe(0)
  })

  it('laat het toernooi na een late undo niet doorschieten', () => {
    // De bewaarde klok heeft een eindtijdstip dat tussen de stap en de undo
    // veroudert; zonder herstel zou het teruggezette level meteen aflopen.
    const uitOp = T0 + 5 * MINUUT
    const undoOp = T0 + 25 * MINUUT
    const naUit = reduce(maak(), { type: 'playerOut', index: 0, now: uitOp })
    const terug = reduce(naUit, { type: 'undo', now: undoOp })

    expect(terug.players[0].out).toBe(false)
    expect(terug.clock.state).toBe('running')
    expect(remainingMs(terug, undoOp)).toBe(10 * MINUUT)
    expect(reduce(terug, { type: 'tick', now: undoOp + 250 }).levelIndex).toBe(0)
  })

  it('draait gepauzeerde tijd die echt verstreken is niet terug', () => {
    const gepauzeerd = reduce(maak(), { type: 'togglePause', now: T0 })
    const hervat = reduce(gepauzeerd, { type: 'togglePause', now: T0 + 3 * MINUUT })
    const terug = reduce(hervat, { type: 'undo', now: T0 + 4 * MINUUT })
    expect(terug.pausedMs).toBe(3 * MINUUT)
  })

  it('stapt meerdere acties terug', () => {
    // Na elke levelovergang staat de klok stil tot die bevestigd is; zonder die
    // bevestiging telt een tweede eliminatie niet als speeltijd.
    let t = maak({ trigger: 'elimination' })
    t = reduce(t, { type: 'playerOut', index: 0, now: T0 })
    t = reduce(t, { type: 'bevestigLevel', now: T0 })
    t = reduce(t, { type: 'playerOut', index: 1, now: T0 })
    expect(t.levelIndex).toBe(2)

    t = reduce(t, { type: 'undo', now: T0 })
    expect(t.levelIndex).toBe(1)
    expect(t.players[1].out).toBe(false)

    t = reduce(t, { type: 'undo', now: T0 })
    expect(t.levelIndex).toBe(0)
    expect(t.players[0].out).toBe(false)
  })

  it('bewaart hoogstens twintig stappen', () => {
    // Dertig spelers die één voor één uitgaan: genoeg stappen om de grens te
    // halen. Pauzeren telt niet meer mee, dat komt niet in de geschiedenis.
    let t = maak({ playerNames: Array.from({ length: 30 }, (_, i) => `Speler ${i + 1}`) })
    for (let i = 0; i < 30; i++) {
      t = reduce(t, { type: 'playerOut', index: i, now: T0 + i * 1000 })
    }
    expect(t.history.length).toBe(20)
  })

  it('doet niets als er niets terug te draaien is', () => {
    const t = maak()
    expect(reduce(t, { type: 'undo', now: T0 })).toBe(t)
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
    expect(averageStackInBigBlinds(t)).toBeCloseTo(100 / currentLevel(t)!.bigBlind)
  })
})

describe('verwachte eindtijd', () => {
  it('telt de resterende levels bij de huidige klok op', () => {
    const t = maak({ trigger: 'time' })
    const teGaan = t.levels.length - 1
    expect(expectedEndAt(t, T0)).toBe(T0 + 15 * MINUUT + teGaan * 15 * MINUUT)
  })

  it('schuift op met elke pauze', () => {
    const t = maak({ trigger: 'time' })
    const gepauzeerd = reduce(t, { type: 'togglePause', now: T0 })
    expect(expectedEndAt(gepauzeerd, T0 + 20 * MINUUT)!).toBe(expectedEndAt(t, T0)! + 20 * MINUUT)
  })

  it('bestaat niet als alleen eliminaties de blinds verhogen', () => {
    expect(expectedEndAt(maak({ trigger: 'elimination' }), T0)).toBeUndefined()
  })
})

describe('einde structuur', () => {
  it('blijft op het laatste level staan', () => {
    let t = maak({ trigger: 'time', durationMinutes: 30 })
    const laatste = t.levels.length - 1
    for (let i = 0; i < 10; i++) t = reduce(t, { type: 'advanceLevel', now: T0 })
    expect(t.levelIndex).toBe(laatste)
  })

  it('vult de undo-geschiedenis niet met lege stappen', () => {
    const laatste = naarLaatsteLevel(maak())
    const na = reduce(laatste, { type: 'advanceLevel', now: T0 })
    expect(na).toBe(laatste)
  })
})

describe('een pauze staat los van de geschiedenis', () => {
  it('komt niet in de geschiedenis terecht', () => {
    const t = maak()
    const gepauzeerd = reduce(t, { type: 'togglePause', now: T0 + 100 })

    expect(gepauzeerd.clock.state).toBe('paused')
    expect(gepauzeerd.history).toHaveLength(t.history.length)
  })

  it('laat ongedaan maken doorpakken naar wat je echt deed', () => {
    // Iemand gaat eruit, daarna wordt er gepauzeerd. Ongedaan maken hoort die
    // eliminatie terug te draaien en niet eerst de pauze af te pellen.
    const naUit = reduce(maak(), { type: 'playerOut', index: 0, now: T0 + 100 })
    const naPauze = reduce(naUit, { type: 'togglePause', now: T0 + 200 })
    const naUndo = reduce(naPauze, { type: 'undo', now: T0 + 300 })

    expect(naUit.players[0].out).toBe(true)
    expect(naUndo.players[0].out).toBe(false)
  })

  it('houdt hervatten symmetrisch met pauzeren', () => {
    const t = maak()
    const gepauzeerd = reduce(t, { type: 'togglePause', now: T0 + 100 })
    const hervat = reduce(gepauzeerd, { type: 'togglePause', now: T0 + 10_000 })

    expect(hervat.clock.state).toBe('running')
    // De pauze telt niet mee als speeltijd.
    expect(hervat.pausedMs).toBe(9900)
    expect(hervat.history).toHaveLength(t.history.length)
  })
})

describe('een levelovergang wacht op bevestiging', () => {
  it('laat de klok stilstaan tot de nieuwe blinds gezien zijn', () => {
    const t = maak()
    const na = reduce(t, { type: 'advanceLevel', now: T0 })

    expect(na.levelIndex).toBe(1)
    expect(na.wachtOpLevel).toBe(true)
    expect(na.clock.state).toBe('paused')
    // De volle levellengte staat klaar, er is nog niets van afgelopen.
    expect(remainingMs(na, T0 + 5 * MINUUT)).toBe(15 * MINUUT)
  })

  it('start de klok pas bij de bevestiging', () => {
    const wachtend = reduce(maak(), { type: 'advanceLevel', now: T0 })
    const bevestigd = reduce(wachtend, { type: 'bevestigLevel', now: T0 + 2 * MINUUT })

    expect(bevestigd.wachtOpLevel).toBe(false)
    expect(bevestigd.clock.state).toBe('running')
    expect(remainingMs(bevestigd, T0 + 2 * MINUUT)).toBe(15 * MINUUT)
  })

  it('rekent de wachttijd niet als speeltijd', () => {
    const wachtend = reduce(maak(), { type: 'advanceLevel', now: T0 })
    const bevestigd = reduce(wachtend, { type: 'bevestigLevel', now: T0 + 2 * MINUUT })

    expect(bevestigd.pausedMs).toBe(2 * MINUUT)
  })

  it('doet niets als er niets te bevestigen is', () => {
    const t = maak()
    expect(reduce(t, { type: 'bevestigLevel', now: T0 })).toBe(t)
  })

  it('laat een tik het level niet nog een keer opschuiven tijdens het wachten', () => {
    const wachtend = reduce(maak(), { type: 'advanceLevel', now: T0 })
    const naTik = reduce(wachtend, { type: 'tick', now: T0 + 60 * MINUUT })

    expect(naTik.levelIndex).toBe(1)
  })
})
