import { describe, expect, it } from 'vitest'
import {
  avondAftelMs,
  averageStack,
  averageStackInBigBlinds,
  createTournament,
  currentLevel,
  expectedEndAt,
  isAfgelopen,
  isLastLevel,
  aftelMs,
  avondklokInSeconden,
  totalChips,
  levelAftelMs,
  nextLevel,
  nogInHetSpel,
  playersLeft,
  reduce,
  remainingMs,
  speelduurMs,
  uitslag,
  wachtOpEindstand,
  winnaar,
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

/**
 * Een bron die de tafel op volgorde laat zitten: bij 1 wisselt elke plaats met
 * zichzelf. Zo blijven de namen in de tests voorspelbaar, en gaat de loting zelf
 * apart getest met een bron die wél schudt.
 */
const opVolgorde = () => 1

const nieuw = (overrides: Partial<Settings> = {}) =>
  createTournament({ ...basis, ...overrides }, KLEINE_DOOS, T0, opVolgorde)

/**
 * Een toernooi zoals het aan tafel staat: de tafelindeling is gezien en de klok
 * loopt. Elk toernooi begint bij dat scherm, en bijna geen test gaat daarover.
 */
const maak = (overrides: Partial<Settings> = {}) =>
  reduce(nieuw(overrides), { type: 'bevestigLevel', now: T0 })

/**
 * Zet het toernooi op het laatste gegenereerde level. Dat is iets anders dan het
 * laatste level: voorbij deze rij maakt de reducer er gewoon een bij, en
 * `isLastLevel` is hier dan ook onwaar.
 */
function naarLaatsteLevel(t: Tournament, now = T0): Tournament {
  while (t.levelIndex < t.levels.length - 1) t = reduce(t, { type: 'advanceLevel', now })
  return t
}

describe('createTournament', () => {
  it('begint op level 0 bij het levelscherm', () => {
    const t = nieuw()
    expect(t.levelIndex).toBe(0)
    expect(t.wachtOpLevel).toBe(true)
  })

  it('laat de klok lopen zodra de tafel zit', () => {
    expect(maak().clock.state).toBe('running')
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

  it('blijft stil nadat een level is omgegaan', () => {
    // Anders levert elke tick een nieuw object op. Het tafelscherm tikt vier keer
    // per seconde, dus dat betekent vier renders en vier schrijfacties naar
    // localStorage per seconde, en een undo-geschiedenis die binnen vijf seconden
    // vol staat. Een omgaand level pauzeert de klok tot de tafel de nieuwe blinds
    // bevestigt, dus daarna gebeurt er niets meer vanzelf.
    let laatste = naarLaatsteLevel(maak({ trigger: 'time', durationMinutes: undefined }))
    laatste = reduce(laatste, { type: 'bevestigLevel', now: T0 })
    const veelLater = T0 + 999 * MINUUT
    const na = reduce(laatste, { type: 'tick', now: veelLater })
    expect(na).not.toBe(laatste)

    let herhaald = na
    for (let i = 0; i < 40; i++) {
      herhaald = reduce(herhaald, { type: 'tick', now: veelLater + i })
    }
    expect(herhaald).toBe(na)
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
  it('wijst naar het einde van de afgesproken speelduur', () => {
    const t = maak({ trigger: 'time' })
    expect(expectedEndAt(t, T0)).toBe(T0 + 120 * MINUUT)
  })

  it('schuift niet naar voren als een eliminatie een level overslaat', () => {
    // De blinds springen dan vooruit, maar de avond is nog even lang.
    const t = maak({ durationMinutes: 4, levelMinutes: 2 })
    const na = reduce(t, { type: 'playerOut', index: 0, now: T0 + 5_000 })
    expect(expectedEndAt(na, T0 + 5_000)).toBe(T0 + 4 * MINUUT)
  })

  it('schuift op met elke pauze', () => {
    const t = maak({ trigger: 'time' })
    const gepauzeerd = reduce(t, { type: 'togglePause', now: T0 })
    expect(expectedEndAt(gepauzeerd, T0 + 20 * MINUUT)!).toBe(expectedEndAt(t, T0)! + 20 * MINUUT)
  })

  it('wijst bij blinds op eliminatie naar het einde van de speelduur', () => {
    // De blinds volgen de eliminaties, maar de avond heeft wel een einde. Dat
    // is de andere instelling, en die hoort hier gewoon te gelden.
    const t = maak({ trigger: 'elimination', durationMinutes: 4, levelMinutes: 2 })
    expect(expectedEndAt(t, T0 + MINUUT)).toBe(T0 + 4 * MINUUT)
  })

  it('bestaat niet zonder afgesproken speelduur', () => {
    expect(
      expectedEndAt(maak({ trigger: 'elimination', durationMinutes: undefined }), T0),
    ).toBeUndefined()
  })
})

describe('einde structuur', () => {
  /** De enige reeks die echt ophoudt: een eigen lijst met bedragen. */
  const eigenLijst = () => maak({ structure: 'manual', manualBigBlinds: [2, 4, 8] })

  it('klimt door voorbij de gegenereerde reeks', () => {
    let t = maak({ trigger: 'time', durationMinutes: 30 })
    const gegenereerd = t.levels.length
    for (let i = 0; i < 10; i++) t = reduce(t, { type: 'advanceLevel', now: T0 })
    expect(t.levelIndex).toBeGreaterThan(gegenereerd - 1)
  })

  it('blijft op het laatste bedrag van een eigen lijst staan', () => {
    let t = eigenLijst()
    for (let i = 0; i < 10; i++) t = reduce(t, { type: 'advanceLevel', now: T0 })
    expect(t.levelIndex).toBe(t.levels.length - 1)
  })

  it('vult de undo-geschiedenis niet met lege stappen', () => {
    const laatste = naarLaatsteLevel(eigenLijst())
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

/** Tikt spelers af tot er één over is. */
function totDeWinnaar(t: Tournament, now = T0): Tournament {
  for (let i = 0; i < t.players.length - 1; i += 1) {
    t = reduce(t, { type: 'playerOut', index: i, now: now + i })
  }
  return t
}

describe('het einde van het toernooi', () => {
  it('is afgelopen zodra er nog één speler over is', () => {
    const na = totDeWinnaar(maak())
    expect(isAfgelopen(na)).toBe(true)
    expect(playersLeft(na)).toBe(1)
  })

  it('is niet afgelopen zolang er twee spelers zijn', () => {
    let t = reduce(maak(), { type: 'playerOut', index: 0, now: T0 })
    t = reduce(t, { type: 'playerOut', index: 1, now: T0 + 1 })
    expect(isAfgelopen(t)).toBe(false)
  })

  it('verhoogt de blinds niet meer bij de laatste eliminatie', () => {
    // Een level dat niemand meer speelt, hoort niet in de structuur.
    let t = maak({ trigger: 'elimination' })
    for (const index of [0, 1]) {
      t = reduce(t, { type: 'playerOut', index, now: T0 + index })
      t = reduce(t, { type: 'bevestigLevel', now: T0 + index })
    }
    const voorDeLaatste = t.levelIndex
    expect(voorDeLaatste).toBe(2)

    t = reduce(t, { type: 'playerOut', index: 2, now: T0 + 3 })
    expect(isAfgelopen(t)).toBe(true)
    expect(t.levelIndex).toBe(voorDeLaatste)
  })

  it('zet de klok stil', () => {
    const t = totDeWinnaar(maak({ trigger: 'time' }))
    expect(t.clock.state).toBe('paused')
    const veelLater = reduce(t, { type: 'tick', now: T0 + 10 * 15 * MINUUT })
    expect(veelLater.levelIndex).toBe(t.levelIndex)
  })

  it('zet de winnaar bovenaan en de rest omgekeerd aan uitvallen', () => {
    const t = totDeWinnaar(maak())
    expect(uitslag(t).map((p) => p.name)).toEqual(['Max', 'Joost', 'Ilse', 'Sam'])
  })

  it('telt de pauze niet mee in de speelduur', () => {
    let t = reduce(maak(), { type: 'togglePause', now: T0 + 5 * MINUUT })
    t = reduce(t, { type: 'togglePause', now: T0 + 8 * MINUUT })
    t = totDeWinnaar(t, T0 + 20 * MINUUT)
    expect(speelduurMs(t, T0 + 99 * MINUUT)).toBe(20 * MINUUT + 2 - 3 * MINUUT)
  })

  it('is terug te draaien, voor als je de verkeerde afgetikt hebt', () => {
    const t = totDeWinnaar(maak())
    const terug = reduce(t, { type: 'undo', now: T0 + MINUUT })
    expect(isAfgelopen(terug)).toBe(false)
    expect(playersLeft(terug)).toBe(2)
  })

  it('laat zich daarna niet meer verzetten', () => {
    const t = totDeWinnaar(maak())
    expect(reduce(t, { type: 'advanceLevel', now: T0 + MINUUT })).toBe(t)
    expect(reduce(t, { type: 'levelTerug', now: T0 + MINUUT })).toBe(t)
  })
})

describe('handmatig een level terug', () => {
  it('gaat terug en vraagt om bevestiging aan tafel', () => {
    const t = reduce(maak(), { type: 'advanceLevel', now: T0 })
    const terug = reduce(t, { type: 'levelTerug', now: T0 + MINUUT })
    expect(terug.levelIndex).toBe(0)
    expect(terug.wachtOpLevel).toBe(true)
  })

  it('doet niets op het eerste level', () => {
    const t = maak()
    expect(reduce(t, { type: 'levelTerug', now: T0 })).toBe(t)
  })

  it('geeft het teruggekregen level een volle klok', () => {
    // Anders staat de klok op 0:00 en zet de eerstvolgende tick het level
    // meteen weer vooruit — dan is teruggaan onmogelijk.
    const omgeslagen = T0 + 15 * MINUUT
    let t = reduce(maak({ trigger: 'time' }), { type: 'tick', now: omgeslagen })
    t = reduce(t, { type: 'bevestigLevel', now: omgeslagen })
    t = reduce(t, { type: 'levelTerug', now: omgeslagen })
    expect(remainingMs(t, omgeslagen)).toBe(15 * MINUUT)

    t = reduce(t, { type: 'bevestigLevel', now: omgeslagen })
    t = reduce(t, { type: 'tick', now: omgeslagen + 1000 })
    expect(t.levelIndex).toBe(0)
  })

  it('is zelf ook terug te draaien', () => {
    const t = reduce(maak(), { type: 'advanceLevel', now: T0 })
    const terug = reduce(t, { type: 'levelTerug', now: T0 + MINUUT })
    expect(reduce(terug, { type: 'undo', now: T0 + 2 * MINUUT }).levelIndex).toBe(1)
  })
})

describe('loten bij de start', () => {
  const schudt = () => 0

  it('zet de spelers in de geloote volgorde', () => {
    const t = createTournament(basis, KLEINE_DOOS, T0, schudt)
    expect([...t.players.map((p) => p.name)].sort()).toEqual([...basis.playerNames].sort())
    expect(t.players.map((p) => p.name)).not.toEqual(basis.playerNames)
  })

  it('wacht met de klok tot de tafel zit', () => {
    // De tafelindeling staat op het levelscherm; zolang die er staat wordt er
    // niet gespeeld en loopt de tijd niet.
    const t = createTournament(basis, KLEINE_DOOS, T0, schudt)
    expect(t.wachtOpLevel).toBe(true)
    expect(t.clock.state).toBe('paused')
    expect(remainingMs(t, T0 + 5 * MINUUT)).toBe(15 * MINUUT)

    const gestart = reduce(t, { type: 'bevestigLevel', now: T0 + 5 * MINUUT })
    expect(gestart.clock.state).toBe('running')
    expect(remainingMs(gestart, T0 + 5 * MINUUT)).toBe(15 * MINUUT)
  })
})

describe('een laatkomer', () => {
  const erbij = (t: Tournament, name = 'Nour', now = T0 + MINUUT) =>
    reduce(t, { type: 'spelerErbij', name, now })

  it('doet niet mee als laatkomers uitstaan', () => {
    const t = maak()
    expect(erbij(t)).toBe(t)
  })

  it('komt binnen met de startstack', () => {
    const t = erbij(maak({ laatkomers: 'startstack' }))
    expect(t.players.map((p) => p.name)).toContain('Nour')
    expect(playersLeft(t)).toBe(5)
    expect(totalChips(t)).toBe(5 * 100)
  })

  it('komt met de gemiddelde stack binnen als dat gekozen is', () => {
    // Vier spelers van 100, waarvan er één af is: gemiddeld 133 over drie.
    let t = maak({ laatkomers: 'gemiddelde' })
    t = reduce(t, { type: 'playerOut', index: 0, now: T0 })
    t = erbij(t)
    expect(t.players[4].stack).toBe(130)
    expect(totalChips(t)).toBe(400 + 130)
  })

  it('telt mee in de gemiddelde stack', () => {
    const t = erbij(maak({ laatkomers: 'startstack' }))
    expect(averageStack(t)).toBe(100)
  })

  it('negeert een lege naam', () => {
    const t = maak({ laatkomers: 'startstack' })
    expect(erbij(t, '   ')).toBe(t)
  })

  it('kan er na afloop niet meer bij', () => {
    const t = totDeWinnaar(maak({ laatkomers: 'startstack' }))
    expect(erbij(t)).toBe(t)
  })

  it('is terug te draaien', () => {
    const t = erbij(maak({ laatkomers: 'startstack' }))
    expect(reduce(t, { type: 'undo', now: T0 + 2 * MINUUT }).players).toHaveLength(4)
  })
})

describe('het einde van de speelduur', () => {
  /** Speelt de afgesproken duur uit met een lopende klok. */
  function totDeSpeelduurOm(t: Tournament): Tournament {
    const uitgespeeld = reduce(naarLaatsteLevel(t), { type: 'bevestigLevel', now: T0 })
    return reduce(uitgespeeld, { type: 'tick', now: T0 + 120 * MINUUT })
  }

  it('sluit het toernooi af als de afgesproken duur om is', () => {
    expect(isAfgelopen(totDeSpeelduurOm(maak({ trigger: 'time' })))).toBe(true)
  })

  it('speelt door voorbij de gegenereerde reeks zolang de duur nog loopt', () => {
    // De levels gaan over de blinds, niet over wanneer je stopt. Is de reeks op,
    // dan komt er een level bij en loopt de avond gewoon door.
    const uitgespeeld = reduce(naarLaatsteLevel(maak({ trigger: 'time' })), {
      type: 'bevestigLevel',
      now: T0,
    })
    const gegenereerd = uitgespeeld.levels.length
    const na = reduce(uitgespeeld, { type: 'tick', now: T0 + 15 * MINUUT })
    expect(isAfgelopen(na)).toBe(false)
    // Niet tegen levels.length vergelijken: die schuift mee, en dan klopt de
    // vergelijking of de reeks nu groeit of niet.
    expect(na.levelIndex).toBe(gegenereerd)
    expect(na.levels[na.levelIndex].bigBlind).toBe(uitgespeeld.levels[gegenereerd - 1].bigBlind * 2)
  })

  it('wijst geen winnaar aan als er nog meerderen zitten', () => {
    // Zonder de stacks te tellen valt niet te zeggen wie voorstaat, en dat
    // gokt de app niet.
    const t = totDeSpeelduurOm(maak({ trigger: 'time' }))
    expect(winnaar(t)).toBeUndefined()
    expect(nogInHetSpel(t)).toHaveLength(4)
  })

  it('speelt zonder afgesproken duur gewoon door', () => {
    const t = totDeSpeelduurOm(maak({ trigger: 'time', durationMinutes: undefined }))
    expect(isAfgelopen(t)).toBe(false)
  })

  it('houdt op met tikken zodra het klaar is', () => {
    let t = totDeSpeelduurOm(maak({ trigger: 'time' }))
    const naHetEinde = t
    for (let i = 0; i < 40; i++) t = reduce(t, { type: 'tick', now: T0 + 99 * MINUUT + i })
    expect(t).toBe(naHetEinde)
  })

  it('is terug te draaien naar het laatste level', () => {
    const t = totDeSpeelduurOm(maak({ trigger: 'time' }))
    const terug = reduce(t, { type: 'undo', now: T0 + 120 * MINUUT })
    expect(isAfgelopen(terug)).toBe(false)
    expect(terug.levelIndex).toBe(t.levelIndex)
  })

  it('blijft terug ook als de klok doortikt', () => {
    // De speelduur hangt aan de gespeelde tijd en niet aan de klok, dus na het
    // terugdraaien is de avond nog steeds om. Met een lopende klok zette de
    // eerstvolgende tik hem meteen weer op klaar, en was er geen weg terug
    // meer: geen enkele handeling bracht de avond nog aan de praat.
    const t = totDeSpeelduurOm(maak({ trigger: 'time' }))
    const terug = reduce(t, { type: 'undo', now: T0 + 120 * MINUUT })
    const na = reduce(terug, { type: 'tick', now: T0 + 120 * MINUUT + 250 })
    expect(isAfgelopen(na)).toBe(false)
  })

  it('geeft de avond een levellengte terug', () => {
    // Anders staat de teruggezette avond op nul en is er niets te spelen. Dit
    // is dezelfde ingreep die een teruggezet level een volle klok geeft.
    const t = totDeSpeelduurOm(maak({ trigger: 'time' }))
    const terug = reduce(t, { type: 'undo', now: T0 + 120 * MINUUT })
    expect(avondAftelMs(terug, T0 + 120 * MINUUT)).toBe(15 * MINUUT)
  })
})

describe('de speelduur als alleen eliminaties de blinds verhogen', () => {
  /** Vier minuten in twee levels van twee, met blinds op eliminaties. */
  const avond = (overrides: Partial<Settings> = {}) =>
    maak({ trigger: 'elimination', durationMinutes: 4, levelMinutes: 2, ...overrides })

  it('sluit het toernooi af zodra de speelduur verstreken is', () => {
    expect(isAfgelopen(reduce(avond(), { type: 'tick', now: T0 + 4 * MINUUT }))).toBe(true)
  })

  it('sluit het geen tel eerder af', () => {
    expect(isAfgelopen(reduce(avond(), { type: 'tick', now: T0 + 4 * MINUUT - 1 }))).toBe(false)
  })

  it('verhoogt de blinds onderweg nog steeds niet', () => {
    // De helft die niet mag veranderen: wanneer de blinds omhoog gaan en
    // wanneer de avond klaar is zijn twee losse instellingen.
    expect(reduce(avond(), { type: 'tick', now: T0 + 3 * MINUUT }).levelIndex).toBe(0)
  })

  it('telt een pauze niet mee in de speelduur', () => {
    let t = reduce(avond(), { type: 'togglePause', now: T0 + MINUUT })
    t = reduce(t, { type: 'togglePause', now: T0 + 4 * MINUUT })
    expect(isAfgelopen(reduce(t, { type: 'tick', now: T0 + 6 * MINUUT }))).toBe(false)
    expect(isAfgelopen(reduce(t, { type: 'tick', now: T0 + 7 * MINUUT }))).toBe(true)
  })

  it('speelt zonder afgesproken speelduur door tot er een over is', () => {
    const t = avond({ durationMinutes: undefined })
    expect(isAfgelopen(reduce(t, { type: 'tick', now: T0 + 99 * MINUUT }))).toBe(false)
  })
})

describe('de twee klokken', () => {
  it('telt het level af zolang de klok de blinds opschuift', () => {
    const t = maak()
    expect(levelAftelMs(t, T0 + MINUUT)).toBe(remainingMs(t, T0 + MINUUT))
  })

  it('heeft geen levelklok als de blinds alleen op eliminaties omhoog gaan', () => {
    expect(levelAftelMs(maak({ trigger: 'elimination' }), T0 + MINUUT)).toBeUndefined()
  })

  it('blijft het level aftellen voorbij de gegenereerde reeks', () => {
    // Er komt altijd een level bij, dus er is geen laatste level meer waar de
    // klok zou stilvallen.
    expect(levelAftelMs(naarLaatsteLevel(maak()), T0)).toBe(15 * MINUUT)
  })

  it('heeft geen levelklok meer op het laatste van een eigen lijst', () => {
    // Daar komt er niets meer bij, dus telt de klok nergens naartoe.
    const t = naarLaatsteLevel(maak({ structure: 'manual', manualBigBlinds: [2, 4] }))
    expect(levelAftelMs(t, T0)).toBeUndefined()
  })

  it('telt de avond af naar het einde van de speelduur', () => {
    expect(avondAftelMs(maak({ durationMinutes: 4, levelMinutes: 2 }), T0 + MINUUT)).toBe(3 * MINUUT)
  })

  it('laat de avondklok stilstaan tijdens een pauze', () => {
    // Anders loopt de teller op het scherm door terwijl er niet gespeeld wordt.
    const t = reduce(maak({ durationMinutes: 4, levelMinutes: 2 }), {
      type: 'togglePause',
      now: T0 + MINUUT,
    })
    expect(avondAftelMs(t, T0 + 3 * MINUUT)).toBe(3 * MINUUT)
  })

  it('laat de avondklok niet door nul heen zakken', () => {
    const t = maak({ durationMinutes: 4, levelMinutes: 2 })
    expect(avondAftelMs(t, T0 + 99 * MINUUT)).toBe(0)
  })

  it('heeft geen avondklok bij last man standing', () => {
    expect(avondAftelMs(maak({ durationMinutes: undefined }), T0)).toBeUndefined()
  })

  it('laat ze naast elkaar lopen, elk met zijn eigen betekenis', () => {
    // Hiervoor was dit een getal dat stilletjes van betekenis wisselde.
    const t = maak({ durationMinutes: 60, levelMinutes: 15 })
    expect(levelAftelMs(t, T0 + MINUUT)).toBe(14 * MINUUT)
    expect(avondAftelMs(t, T0 + MINUUT)).toBe(59 * MINUUT)
  })
})

describe('de avondklok wordt pas op het eind fijn', () => {
  /**
   * Vier minuten in twee levels van twee. Het tweede level duurt precies zo
   * lang als wat er dan van de avond over is, dus dat is het laatste.
   */
  const kort = () => maak({ durationMinutes: 4, levelMinutes: 2, trigger: 'time' })

  /** Schuift een level op en bevestigt de nieuwe blinds, zoals aan tafel. */
  function volgendLevel(t: Tournament, now: number): Tournament {
    return reduce(reduce(t, { type: 'advanceLevel', now }), { type: 'bevestigLevel', now })
  }

  it('staat op minuten zolang er nog een level na dit komt', () => {
    // Twee klokken die allebei per seconde verspringen is te onrustig, en zo
    // lang de avond nog uren duurt zegt die seconde ook niets.
    expect(avondklokInSeconden(kort(), T0)).toBe(false)
  })

  it('gaat op seconden zodra het laatste level begonnen is', () => {
    const t = volgendLevel(kort(), T0 + 2 * MINUUT)
    expect(avondklokInSeconden(t, T0 + 2 * MINUUT)).toBe(true)
  })

  it('rekent een level dat precies zo lang duurt als de rest van de avond mee', () => {
    // De grens hoort erbij: duurt dit level even lang, dan komt er geen meer.
    const t = volgendLevel(kort(), T0 + 2 * MINUUT)
    expect(levelAftelMs(t, T0 + 2 * MINUUT)).toBeUndefined()
    expect(avondAftelMs(t, T0 + 2 * MINUUT)).toBe(2 * MINUUT)
  })

  it('klapt niet terug naar minuten als een eliminatie het level opschuift', () => {
    // Een eliminatie zet de levelklok terug op vol, en vol is nog steeds langer
    // dan wat er van de avond over is. Anders ging de klok op het eind heen en
    // weer tussen minuten en seconden.
    const laatste = volgendLevel(kort(), T0 + 2 * MINUUT)
    const naEliminatie = volgendLevel(laatste, T0 + 3 * MINUUT)
    expect(avondklokInSeconden(naEliminatie, T0 + 3 * MINUUT)).toBe(true)
  })

  it('laat de levelklok wegvallen in het laatste level', () => {
    // Die telt naar blinds die niet meer omhoog gaan: de avond is eerder om.
    const t = volgendLevel(kort(), T0 + 2 * MINUUT)
    expect(levelAftelMs(t, T0 + 2 * MINUUT)).toBeUndefined()
  })

  it('houdt de levelklok zolang dat level nog echt afloopt', () => {
    expect(levelAftelMs(kort(), T0)).toBe(2 * MINUUT)
  })

  it('blijft op minuten bij een avond die nog lang duurt', () => {
    expect(avondklokInSeconden(maak({ durationMinutes: 120, levelMinutes: 15 }), T0)).toBe(false)
  })

  describe('zonder levelklok', () => {
    /** Blinds alleen op eliminaties: er is geen level om tegen af te zetten. */
    const opEliminatie = () => maak({ trigger: 'elimination', durationMinutes: 30 })

    it('staat op minuten zolang er meer dan tien minuten over zijn', () => {
      expect(avondklokInSeconden(opEliminatie(), T0 + 19 * MINUUT)).toBe(false)
    })

    it('gaat op seconden bij tien minuten', () => {
      expect(avondklokInSeconden(opEliminatie(), T0 + 20 * MINUUT)).toBe(true)
    })

    it('blijft daaronder op seconden', () => {
      expect(avondklokInSeconden(opEliminatie(), T0 + 25 * MINUUT)).toBe(true)
    })
  })

  it('gaat bij een opgeraakte eigen lijst op seconden vanaf een levellengte', () => {
    // Daar komt geen levelwissel meer, dus dit level eindigt nooit. De maat is
    // dan de levellengte: hetzelfde moment waarop een gewoon laatste level zou
    // beginnen, zodat de klok niet alsnog terugvalt naar minuten.
    // Met bevestiging erachter, anders staat de klok nog stil op het
    // levelscherm en loopt de avond helemaal niet.
    const t = reduce(
      naarLaatsteLevel(maak({ structure: 'manual', manualBigBlinds: [2, 4], durationMinutes: 30 })),
      { type: 'bevestigLevel', now: T0 },
    )
    expect(avondklokInSeconden(t, T0 + 14 * MINUUT)).toBe(false)
    expect(avondklokInSeconden(t, T0 + 15 * MINUUT)).toBe(true)
  })

  it('heeft niets fijn te maken bij last man standing', () => {
    expect(avondklokInSeconden(maak({ durationMinutes: undefined }), T0 + 99 * MINUUT)).toBe(false)
  })
})

describe('een eliminatie verkort de avond niet', () => {
  /** Vier minuten in twee levels van twee, met blinds op klok en eliminatie. */
  const avond = () => maak({ durationMinutes: 4, levelMinutes: 2 })

  /** Iemand valt meteen uit, dus de laatste gegenereerde rij begint na vijf seconden. */
  function naDeEersteUitvaller(): Tournament {
    const t = reduce(avond(), { type: 'playerOut', index: 0, now: T0 + 5_000 })
    return reduce(t, { type: 'bevestigLevel', now: T0 + 5_000 })
  }

  it('speelt de hele afgesproken duur uit', () => {
    // Hiervoor was dit 2:05 in plaats van 4:00: de levels waren op, dus stopte
    // het toernooi — terwijl de gekozen speelduur vier minuten was.
    const t = naDeEersteUitvaller()
    expect(isAfgelopen(reduce(t, { type: 'tick', now: T0 + 3 * MINUUT }))).toBe(false)
    expect(isAfgelopen(reduce(t, { type: 'tick', now: T0 + 4 * MINUUT }))).toBe(true)
  })

  it('laat de blinds ondertussen doorklimmen', () => {
    // Het geplande aantal levels was twee, en die zijn na de eerste uitvaller
    // op. De reeks loopt door, dus de blinds blijven niet bovenaan staan.
    const t = naDeEersteUitvaller()
    const na = reduce(t, { type: 'tick', now: T0 + 2 * MINUUT + 5_000 })
    expect(na.levelIndex).toBe(2)
  })
})

describe('wat er aftelt naar het eerstvolgende moment', () => {
  it('is de levelklok zolang de blinds nog omhoog gaan', () => {
    const t = maak({ trigger: 'time', durationMinutes: 120, levelMinutes: 15 })
    expect(aftelMs(t, T0 + MINUUT)).toBe(levelAftelMs(t, T0 + MINUUT))
  })

  it('is de avondklok in het laatste level, waar de levelklok weg is', () => {
    // Hier hing de waarschuwing aan een klok die niet meer te zien was, en
    // eindigde de avond zonder goud en zonder gong.
    const t = maak({ trigger: 'time', durationMinutes: 10, levelMinutes: 15 })
    expect(levelAftelMs(t, T0)).toBeUndefined()
    expect(aftelMs(t, T0)).toBe(10 * MINUUT)
  })

  it('is de avondklok als de blinds alleen op eliminaties omhoog gaan', () => {
    const t = maak({ trigger: 'elimination', durationMinutes: 30 })
    expect(aftelMs(t, T0 + MINUUT)).toBe(29 * MINUUT)
  })

  it('telt nergens naartoe bij last man standing', () => {
    expect(aftelMs(maak({ trigger: 'elimination', durationMinutes: undefined }), T0)).toBeUndefined()
  })
})

describe('de klok valt niet terug van seconden naar minuten', () => {
  /** Een eigen lijst van drie bedragen op een avond van 35 minuten. */
  const eigenLijst = () =>
    maak({
      structure: 'manual',
      manualBigBlinds: [10, 20, 40],
      trigger: 'both',
      durationMinutes: 35,
      levelMinutes: 20,
    })

  /** Schuift een level op en bevestigt de nieuwe blinds, zoals aan tafel. */
  const volgend = (t: Tournament, now: number) =>
    reduce(reduce(t, { type: 'advanceLevel', now }), { type: 'bevestigLevel', now })

  it('houdt seconden vast als de eigen lijst opraakt', () => {
    // Het laatste bedrag van de lijst heeft geen levelklok meer, maar de avond
    // is nog even lang. Zonder regel sprong de klok hier terug van 13:48 naar
    // 14 min - vooruit spelen mag de klok nooit grover maken.
    const nu = T0 + 21 * MINUUT
    const voorlaatste = volgend(eigenLijst(), nu)
    expect(avondklokInSeconden(voorlaatste, nu)).toBe(true)
    expect(avondklokInSeconden(volgend(voorlaatste, nu), nu)).toBe(true)
  })

  it('staat nog op minuten als de lijst vroeg opraakt', () => {
    // Raakt de lijst op terwijl er nog ruim een level te gaan is, dan is er
    // niets fijns aan de hand en blijft de klok grof.
    const t = reduce(naarLaatsteLevel(eigenLijst()), { type: 'bevestigLevel', now: T0 })
    expect(avondklokInSeconden(t, T0 + 5 * MINUUT)).toBe(false)
  })
})

describe('de reeks groeit niet eindeloos door', () => {
  it('stopt met bijmaken zodra een big blind alle chips overtreft', () => {
    // Doorklikken met de levelknop verdubbelde eindeloos door, tot Infinity in
    // de opslag en op het scherm. Boven alle chips in het spel valt er niets
    // meer te betalen, dus daar houdt het op.
    let t = maak({ trigger: 'time' })
    const alles = totalChips(t)
    for (let i = 0; i < 400; i += 1) t = reduce(t, { type: 'advanceLevel', now: T0 })
    const hoogste = t.levels[t.levels.length - 1]
    expect(Number.isFinite(hoogste.bigBlind)).toBe(true)
    expect(hoogste.bigBlind).toBeLessThanOrEqual(alles * 2)
  })
})

describe('de eindstand na de speelduur', () => {
  /**
   * De speelduur loopt af terwijl er nog drie zitten: Sam is onderweg afgetikt,
   * Ilse, Joost en Max zitten er nog.
   */
  function totDeTijdOm(): Tournament {
    const gespeeld = reduce(maak({ trigger: 'time' }), {
      type: 'playerOut',
      index: 0,
      now: T0 + MINUUT,
    })
    const uitgespeeld = reduce(naarLaatsteLevel(gespeeld), { type: 'bevestigLevel', now: T0 })
    return reduce(uitgespeeld, { type: 'tick', now: T0 + 120 * MINUUT })
  }

  const tik = (t: Tournament, index: number, now: number) =>
    reduce(t, { type: 'playerOut', index, now })

  /** De eindstand zoals hij aan tafel ingevuld wordt: de kleinste stack eerst. */
  function ingevuld(): Tournament {
    return tik(tik(totDeTijdOm(), 2, T0 + 125 * MINUUT), 1, T0 + 130 * MINUUT)
  }

  it('wacht op de eindstand zodra de tijd om is met meerderen aan tafel', () => {
    expect(wachtOpEindstand(totDeTijdOm())).toBe(true)
  })

  it('wacht nergens op zolang er gespeeld wordt', () => {
    expect(wachtOpEindstand(maak())).toBe(false)
  })

  it('wacht nergens op als het toernooi is uitgespeeld', () => {
    expect(wachtOpEindstand(totDeWinnaar(maak()))).toBe(false)
  })

  it('laat de overgeblevenen alsnog aftikken', () => {
    expect(playersLeft(tik(totDeTijdOm(), 2, T0 + 125 * MINUUT))).toBe(2)
  })

  it('wijst de laatste die overblijft aan als winnaar', () => {
    const t = ingevuld()
    expect(winnaar(t)?.name).toBe('Max')
    expect(wachtOpEindstand(t)).toBe(false)
  })

  it('zet de afgetikten boven wie er onderweg al uit lag', () => {
    expect(uitslag(ingevuld()).map((p) => p.name)).toEqual(['Max', 'Ilse', 'Joost', 'Sam'])
  })

  it('rekent het chips tellen niet mee als speeltijd', () => {
    // De avond was om toen de klok afliep; wat daarna gebeurt is opruimen.
    const om = totDeTijdOm()
    const t = ingevuld()
    expect(playersLeft(t)).toBe(1)
    expect(speelduurMs(t, T0 + 99 * MINUUT)).toBe(speelduurMs(om, T0 + 99 * MINUUT))
  })

  it('blijft afgelopen terwijl de eindstand ingevuld wordt', () => {
    expect(isAfgelopen(tik(totDeTijdOm(), 2, T0 + 125 * MINUUT))).toBe(true)
  })

  it('is terug te draaien, voor als er verkeerd geteld is', () => {
    const t = tik(totDeTijdOm(), 2, T0 + 125 * MINUUT)
    const terug = reduce(t, { type: 'undo', now: T0 + 126 * MINUUT })
    expect(wachtOpEindstand(terug)).toBe(true)
    expect(playersLeft(terug)).toBe(3)
  })

  it('laat de winnaar daarna niet alsnog aftikken', () => {
    const t = ingevuld()
    expect(winnaar(t)?.name).toBe('Max')
    expect(tik(t, 3, T0 + 135 * MINUUT)).toBe(t)
  })
})

describe('de levels raken niet op', () => {
  /** Tikt door tot voorbij het laatste gegenereerde level. */
  function voorbijDeReeks(t: Tournament): Tournament {
    const gegenereerd = t.levels.length
    for (let i = 0; i < gegenereerd; i += 1) {
      t = reduce(t, { type: 'advanceLevel', now: T0 })
      t = reduce(t, { type: 'bevestigLevel', now: T0 })
    }
    return t
  }

  it('maakt er een bij als de reeks op is', () => {
    // Een avond van vier minuten kreeg een handvol levels, maar met acht
    // spelers kun je zeven keer aftikken. Dan stond je bovenaan vast.
    const t = maak({ durationMinutes: 4, levelMinutes: 2 })
    const gegenereerd = t.levels.length
    const door = voorbijDeReeks(t)
    expect(door.levelIndex).toBe(gegenereerd)
    expect(door.levels.length).toBeGreaterThan(gegenereerd)
  })

  it('verdubbelt het vorige bedrag', () => {
    // Kan zonder de pokerdoos, en dat is precies waarom het hier kan: een
    // verdubbeld betaalbaar bedrag is weer betaalbaar.
    const t = maak({ durationMinutes: 4, levelMinutes: 2 })
    const laatste = t.levels[t.levels.length - 1]
    const door = voorbijDeReeks(t)
    const erbij = door.levels[door.levelIndex]
    expect(erbij.bigBlind).toBe(laatste.bigBlind * 2)
    expect(erbij.smallBlind).toBe(laatste.smallBlind * 2)
  })

  it('kent geen laatste level meer', () => {
    expect(isLastLevel(naarLaatsteLevel(maak()))).toBe(false)
  })

  it('kondigt de volgende blinds aan, ook voorbij de reeks', () => {
    const t = naarLaatsteLevel(maak())
    const huidig = currentLevel(t)!
    expect(nextLevel(t)?.bigBlind).toBe(huidig.bigBlind * 2)
  })

  it('groeit niet bij een eigen lijst met bedragen', () => {
    // Die gaf de gebruiker zelf op; daar verzinnen we niets bij.
    const t = naarLaatsteLevel(maak({ structure: 'manual', manualBigBlinds: [2, 4] }))
    expect(isLastLevel(t)).toBe(true)
    expect(reduce(t, { type: 'advanceLevel', now: T0 })).toBe(t)
  })
})
