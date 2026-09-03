import { describe, expect, it } from 'vitest'
import {
  buildStructure,
  groeiPerLevel,
  levelCount,
  levelOpties,
  targetEndBigBlind,
  LEVELS_ZONDER_DUUR,
} from './blinds'
import { denominations, kanColorUp, STANDARD_500 } from './chipset'
import type { StructureInput } from './blinds'
import { KLEINE_DOOS } from './testdozen'

const huisregel: StructureInput = {
  kind: 'doubling',
  colorUp: true,
  players: 6,
  startingStack: 100,
  durationMinutes: 180,
  levelMinutes: 15,
}

describe('levelCount', () => {
  it('deelt de duur door de levellengte', () => {
    expect(levelCount(180, 15)).toBe(12)
  })

  it('rondt naar beneden af', () => {
    expect(levelCount(100, 15)).toBe(6)
  })

  it('geeft minstens twee levels', () => {
    expect(levelCount(10, 15)).toBe(2)
    expect(levelCount(0, 0)).toBe(2)
  })
})

describe('targetEndBigBlind', () => {
  it('mikt op tien big blinds gemiddeld bij drie spelers over', () => {
    // 8 spelers x 10000 chips = 80000, over drie spelers is 26667, daarvan een tiende
    expect(targetEndBigBlind(8, 10000)).toBeCloseTo(2666.67, 1)
  })
})

describe('buildStructure — verdubbelend', () => {
  const structuur = buildStructure(huisregel, KLEINE_DOOS)

  it('verdubbelt de big blind per level', () => {
    expect(structuur.levels.slice(0, 4).map((l) => l.bigBlind)).toEqual([2, 4, 8, 16])
  })

  it('begint op honderd big blinds diep, met een big blind van minstens twee chips', () => {
    expect(structuur.levels[0].bigBlind).toBe(2)
    expect(structuur.levels[0].smallBlind).toBe(1)
  })

  it('nummert de levels vanaf 0', () => {
    expect(structuur.levels.map((l) => l.index)).toEqual(structuur.levels.map((_, i) => i))
  })
})

describe('buildStructure — berekend', () => {
  it('loopt strikt op en houdt de kleine blind onder de big blind', () => {
    for (const startingStack of [10, 100, 1000, 10_000, 100_000]) {
      for (const chipset of [KLEINE_DOOS, STANDARD_500]) {
        const structuur = buildStructure(
          { ...huisregel, kind: 'calculated', players: 8, startingStack, durationMinutes: 240 },
          chipset,
        )
        for (let i = 0; i < structuur.levels.length; i++) {
          const level = structuur.levels[i]
          expect(level.smallBlind).toBeLessThan(level.bigBlind)
          if (i > 0) {
            expect(level.bigBlind).toBeGreaterThan(structuur.levels[i - 1].bigBlind)
          }
        }
      }
    }
  })

  it('schiet zijn eigen eindpunt niet ver voorbij', () => {
    // Bij een kleine startstack nadert de groeifactor 1 en duwde de afronding de
    // reeks elke keer een volle stap omhoog; de structuur eindigde dan tot 60x
    // boven het doel waar hij op mikte.
    for (const [players, startingStack] of [
      [6, 100],
      [4, 10],
      [2, 20],
      [8, 10_000],
    ] as const) {
      const structuur = buildStructure(
        { ...huisregel, kind: 'calculated', players, startingStack, durationMinutes: 240 },
        KLEINE_DOOS,
      )
      const doel = targetEndBigBlind(players, startingStack)
      const eind = structuur.levels[structuur.levels.length - 1].bigBlind
      expect(eind, `${players} spelers, stack ${startingStack}`).toBeLessThanOrEqual(
        Math.max(doel * 2.5, 4),
      )
    }
  })

  it('gebruikt de startstack: een grotere stack geeft grotere blinds', () => {
    const klein = buildStructure(
      { ...huisregel, kind: 'calculated', startingStack: 100 },
      STANDARD_500,
    )
    const groot = buildStructure(
      { ...huisregel, kind: 'calculated', startingStack: 10_000 },
      STANDARD_500,
    )
    const laatste = (s: typeof klein) => s.levels[s.levels.length - 1].bigBlind
    expect(laatste(groot)).toBeGreaterThan(laatste(klein))
  })
})

describe('buildStructure — betaalbaarheid', () => {
  it('geeft blinds die met de aanwezige chips te leggen zijn', () => {
    const eigenaardig = {
      id: 'eigenaardig',
      name: 'Doos met vreemde waardes',
      chips: [
        { color: '#111', value: 3, count: 200 },
        { color: '#222', value: 20, count: 200 },
      ],
    }
    for (const chipset of [KLEINE_DOOS, STANDARD_500, eigenaardig]) {
      const denoms = denominations(chipset)
      for (const kind of ['doubling', 'calculated'] as const) {
        const structuur = buildStructure(
          { ...huisregel, kind, players: 8, startingStack: 100_000, durationMinutes: 240 },
          chipset,
        )
        for (const level of structuur.levels) {
          // Bij elk level is er een denominatie waarmee beide blinds te leggen zijn.
          const past = denoms.some(
            (d) => level.bigBlind % d === 0 && level.smallBlind % d === 0,
          )
          expect(past, `${level.smallBlind}/${level.bigBlind} in ${chipset.name}`).toBe(true)
        }
      }
    }
  })

  it('houdt de big blind het dubbele van de kleine blind', () => {
    // Brak eerder bij chipwaardes van 2, 20 of 200: de afrondstap kwam dan boven
    // twee chipwaardes uit zonder er een veelvoud van te zijn, en 740/1500 is
    // geen blindpaar.
    const vreemd = {
      id: 'vreemd',
      name: 'Vreemde waardes',
      chips: [
        { color: '#111', value: 1, count: 200 },
        { color: '#222', value: 5, count: 200 },
        { color: '#333', value: 20, count: 200 },
      ],
    }
    for (const chipset of [KLEINE_DOOS, STANDARD_500, vreemd]) {
      for (const kind of ['doubling', 'calculated'] as const) {
        for (const startingStack of [100, 5_000, 100_000]) {
          const structuur = buildStructure(
            { ...huisregel, kind, players: 8, startingStack, durationMinutes: 240 },
            chipset,
          )
          for (const level of structuur.levels) {
            expect(
              level.bigBlind,
              `${chipset.name}, ${kind}, stack ${startingStack}`,
            ).toBe(level.smallBlind * 2)
          }
        }
      }
    }
  })
})

describe('buildStructure — handmatig', () => {
  it('gebruikt de opgegeven big blinds', () => {
    const structuur = buildStructure(
      { ...huisregel, kind: 'manual', manualBigBlinds: [2, 6, 20] },
      KLEINE_DOOS,
    )
    expect(structuur.levels.map((l) => l.bigBlind)).toEqual([2, 6, 20])
  })

  it('dwingt een dalende reeks omhoog in plaats van hem te accepteren', () => {
    const structuur = buildStructure(
      { ...huisregel, kind: 'manual', manualBigBlinds: [100, 50] },
      KLEINE_DOOS,
    )
    expect(structuur.levels[1].bigBlind).toBeGreaterThan(structuur.levels[0].bigBlind)
  })

  it('valt terug op verdubbelen bij een lege lijst', () => {
    const structuur = buildStructure(
      { ...huisregel, kind: 'manual', manualBigBlinds: [] },
      KLEINE_DOOS,
    )
    expect(structuur.levels.length).toBeGreaterThan(1)
  })
})

describe('color-up', () => {
  // De huisregel heeft maar twee waardes en doet dus nooit een color-up. Voor
  // deze regels is een doos met drie waardes nodig; 1 naar 5 blijft te volgen.
  const metColorUp = {
    ...KLEINE_DOOS,
    chips: [...KLEINE_DOOS.chips, { color: '#6b4fa0', value: 25, count: 50 }],
  }

  it('haalt de kleinste denominatie eruit zodra de kleine blind tien keer zo groot is', () => {
    const structuur = buildStructure(huisregel, metColorUp)
    const eerste = structuur.colorUps[0]
    expect(eerste).toBeDefined()
    expect(eerste.retiredValue).toBe(1)
    expect(eerste.nextValue).toBe(5)
    expect(structuur.levels[eerste.levelIndex].smallBlind).toBeGreaterThanOrEqual(10)
  })

  it('draagt de kleuren mee die uit het spel gaan en wat ervoor terugkomt', () => {
    const structuur = buildStructure(huisregel, metColorUp)
    expect(structuur.colorUps[0].retiredColors).toEqual(['#f2efe6', '#c0392b', '#2e6da4'])
    expect(structuur.colorUps[0].nextColors).toEqual(['#2e8b57'])
  })

  it('doet geen color-up als de hoogste denominatie bereikt is', () => {
    const structuur = buildStructure(
      { ...huisregel, kind: 'manual', manualBigBlinds: [2, 4] },
      KLEINE_DOOS,
    )
    expect(structuur.colorUps).toEqual([])
  })

  it('meldt welke chipwaarde op level 0 nog meedoet', () => {
    const klein = buildStructure(huisregel, STANDARD_500)
    expect(klein.startDenomination).toBe(1)

    // Bij een grote startstack beginnen de blinds zo hoog dat de kleinste kleur
    // meteen overbodig is; die hoort de chipverdeling dan niet uit te delen.
    const groot = buildStructure({ ...huisregel, startingStack: 10_000 }, STANDARD_500)
    expect(groot.colorUps[0]?.levelIndex).toBe(0)
    expect(groot.startDenomination).toBeGreaterThan(1)
  })
})

describe('buildStructure — de 1-2-5 ladder', () => {
  const structuur = buildStructure({ ...huisregel, kind: 'ladder' }, KLEINE_DOOS)

  it('geeft de reeks die je met chips van 1 en 5 kunt leggen', () => {
    const paren = structuur.levels.slice(0, 7).map((l) => `${l.smallBlind}/${l.bigBlind}`)
    expect(paren).toEqual(['1/2', '2/4', '5/10', '10/20', '20/40', '50/100', '100/200'])
  })

  it('houdt de big blind exact het dubbele van de kleine blind', () => {
    for (const level of structuur.levels) {
      expect(level.bigBlind).toBe(level.smallBlind * 2)
    }
  })

  it('schaalt mee met de kleinste chipwaarde', () => {
    const grofeDoos = {
      id: 'grof',
      name: 'Grof',
      chips: [
        { color: '#0f0', value: 25, count: 100 },
        { color: '#000', value: 100, count: 100 },
        { color: '#a0f', value: 500, count: 50 },
      ],
    }
    const grof = buildStructure(
      { ...huisregel, kind: 'ladder', startingStack: 2500 },
      grofeDoos,
    )
    expect(grof.levels.slice(0, 4).map((l) => `${l.smallBlind}/${l.bigBlind}`)).toEqual([
      '25/50',
      '50/100',
      '125/250',
      '250/500',
    ])
  })

  it('loopt altijd omhoog', () => {
    for (const [i, level] of structuur.levels.entries()) {
      if (i === 0) continue
      expect(level.bigBlind).toBeGreaterThan(structuur.levels[i - 1].bigBlind)
    }
  })
})

describe('color-up is een keuze per toernooi', () => {
  it('doet geen color-up als het toernooi hem uit heeft staan', () => {
    const structuur = buildStructure(
      { ...huisregel, kind: 'ladder', colorUp: false },
      STANDARD_500,
    )
    expect(structuur.colorUps).toEqual([])
  })

  it('doet hem wel als het toernooi hem aan heeft staan', () => {
    const structuur = buildStructure({ ...huisregel, kind: 'ladder', colorUp: true }, STANDARD_500)
    expect(structuur.colorUps.length).toBeGreaterThan(0)
  })

  it('slaat hem over bij een doos met maar twee waardes, ook als je hem aanzet', () => {
    // Bij 5 en 1 hou je na een color-up één soort chip over: niets te wisselen.
    expect(kanColorUp(KLEINE_DOOS)).toBe(false)
    const structuur = buildStructure({ ...huisregel, kind: 'ladder', colorUp: true }, KLEINE_DOOS)
    expect(structuur.colorUps).toEqual([])
    expect(structuur.startDenomination).toBe(denominations(KLEINE_DOOS)[0])
  })

  it('staat hem toe vanaf drie waardes', () => {
    expect(kanColorUp(STANDARD_500)).toBe(true)
  })
})

describe('een toernooi zonder eindtijd', () => {
  it('loopt door tot het toernooi beslist is en niet verder', () => {
    const zonderDuur = buildStructure(
      { ...huisregel, kind: 'ladder', durationMinutes: undefined, startingStack: 200 },
      STANDARD_500,
    )
    const doel = targetEndBigBlind(huisregel.players, 200)
    const laatste = zonderDuur.levels[zonderDuur.levels.length - 1]

    expect(laatste.bigBlind).toBeGreaterThanOrEqual(doel)
    expect(zonderDuur.levels.length).toBeLessThan(LEVELS_ZONDER_DUUR)
  })

  it('stopt ook bij verdubbelen, dat anders eindeloos doortelt', () => {
    const structuur = buildStructure(
      { ...huisregel, kind: 'doubling', durationMinutes: undefined },
      STANDARD_500,
    )
    expect(structuur.levels.length).toBeLessThan(LEVELS_ZONDER_DUUR)
  })
})

describe('groeiPerLevel', () => {
  it('geeft de vaste factor van de reeksen die er een hebben', () => {
    // Drie stappen op de ladder is een factor tien: 1, 2, 5, 10.
    expect(groeiPerLevel('ladder')! ** 3).toBeCloseTo(10, 6)
    expect(groeiPerLevel('doubling')).toBe(2)
  })

  it('zwijgt bij reeksen die hun factor aanpassen of zelf opgegeven worden', () => {
    expect(groeiPerLevel('calculated')).toBeUndefined()
    expect(groeiPerLevel('manual')).toBeUndefined()
  })
})

describe('levelOpties', () => {
  it('geeft alleen lengtes die de duur precies vullen', () => {
    for (const duur of [60, 90, 120, 150, 180]) {
      for (const optie of levelOpties(duur)) {
        expect(optie.levels * optie.levelMinutes, `${duur} min`).toBe(duur)
      }
    }
  })

  it('houdt het bij lengtes die aan tafel prettig spelen', () => {
    expect(levelOpties(90).map((o) => o.levelMinutes)).toEqual([10, 15, 18, 30])
  })

  it('vraagt altijd minstens twee levels', () => {
    for (const optie of levelOpties(60)) {
      expect(optie.levels).toBeGreaterThanOrEqual(2)
    }
  })

  it('verruimt het bereik als er in de prettige lengtes niets past', () => {
    // 91 is 7 x 13: binnen 10 tot 30 valt alleen 13, dus daar blijft het bij.
    expect(levelOpties(91).map((o) => o.levelMinutes)).toEqual([13])
    // 64 heeft binnen 10 tot 30 alleen 16 en 32; buiten dat bereik komen er meer.
    expect(levelOpties(64).length).toBeGreaterThan(0)
  })

  it('geeft niets terug bij een duur die niet te verdelen is', () => {
    // Een priemduur kan niet in gelijke levels; het scherm moet dat opvangen in
    // plaats van dat de rekenkern een onzinnige verdeling verzint.
    expect(levelOpties(37)).toEqual([])
  })
})
