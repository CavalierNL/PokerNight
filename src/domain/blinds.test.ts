import { describe, expect, it } from 'vitest'
import { buildStructure, levelCount, targetEndBigBlind } from './blinds'
import { denominations, HOUSE_RULES, STANDARD_500 } from './chipset'
import type { StructureInput } from './blinds'

const huisregel: StructureInput = {
  kind: 'doubling',
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
    // 8 spelers x 10000 fiches = 80000, over drie spelers is 26667, daarvan een tiende
    expect(targetEndBigBlind(8, 10000)).toBeCloseTo(2666.67, 1)
  })
})

describe('buildStructure — verdubbelend', () => {
  const structuur = buildStructure(huisregel, HOUSE_RULES)

  it('verdubbelt de big blind per level', () => {
    expect(structuur.levels.slice(0, 4).map((l) => l.bigBlind)).toEqual([2, 4, 8, 16])
  })

  it('begint op honderd big blinds diep, met een big blind van minstens twee fiches', () => {
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
      for (const chipset of [HOUSE_RULES, STANDARD_500]) {
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
        HOUSE_RULES,
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
  it('geeft blinds die met de aanwezige fiches te leggen zijn', () => {
    const eigenaardig = {
      id: 'eigenaardig',
      name: 'Doos met vreemde waardes',
      chips: [
        { name: 'a', color: '#111', value: 3, count: 200 },
        { name: 'b', color: '#222', value: 20, count: 200 },
      ],
    }
    for (const chipset of [HOUSE_RULES, STANDARD_500, eigenaardig]) {
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
    // Brak eerder bij fichewaardes van 2, 20 of 200: de afrondstap kwam dan boven
    // twee fichewaardes uit zonder er een veelvoud van te zijn, en 740/1500 is
    // geen blindpaar.
    const vreemd = {
      id: 'vreemd',
      name: 'Vreemde waardes',
      chips: [
        { name: 'a', color: '#111', value: 1, count: 200 },
        { name: 'b', color: '#222', value: 5, count: 200 },
        { name: 'c', color: '#333', value: 20, count: 200 },
      ],
    }
    for (const chipset of [HOUSE_RULES, STANDARD_500, vreemd]) {
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
      HOUSE_RULES,
    )
    expect(structuur.levels.map((l) => l.bigBlind)).toEqual([2, 6, 20])
  })

  it('dwingt een dalende reeks omhoog in plaats van hem te accepteren', () => {
    const structuur = buildStructure(
      { ...huisregel, kind: 'manual', manualBigBlinds: [100, 50] },
      HOUSE_RULES,
    )
    expect(structuur.levels[1].bigBlind).toBeGreaterThan(structuur.levels[0].bigBlind)
  })

  it('valt terug op verdubbelen bij een lege lijst', () => {
    const structuur = buildStructure(
      { ...huisregel, kind: 'manual', manualBigBlinds: [] },
      HOUSE_RULES,
    )
    expect(structuur.levels.length).toBeGreaterThan(1)
  })
})

describe('color-up', () => {
  it('haalt de kleinste denominatie eruit zodra de kleine blind tien keer zo groot is', () => {
    const structuur = buildStructure(huisregel, HOUSE_RULES)
    const eerste = structuur.colorUps[0]
    expect(eerste).toBeDefined()
    expect(eerste.retiredValue).toBe(1)
    expect(eerste.nextValue).toBe(5)
    expect(structuur.levels[eerste.levelIndex].smallBlind).toBeGreaterThanOrEqual(10)
  })

  it('noemt de kleuren die uit het spel gaan', () => {
    const structuur = buildStructure(huisregel, HOUSE_RULES)
    expect(structuur.colorUps[0].retiredColors).toEqual(
      expect.arrayContaining(['wit', 'rood', 'blauw']),
    )
  })

  it('doet geen color-up als de hoogste denominatie bereikt is', () => {
    const structuur = buildStructure(
      { ...huisregel, kind: 'manual', manualBigBlinds: [2, 4] },
      HOUSE_RULES,
    )
    expect(structuur.colorUps).toEqual([])
  })

  it('meldt welke fichewaarde op level 0 nog meedoet', () => {
    const klein = buildStructure(huisregel, STANDARD_500)
    expect(klein.startDenomination).toBe(1)

    // Bij een grote startstack beginnen de blinds zo hoog dat de kleinste kleur
    // meteen overbodig is; die hoort de chipverdeling dan niet uit te delen.
    const groot = buildStructure({ ...huisregel, startingStack: 10_000 }, STANDARD_500)
    expect(groot.colorUps[0]?.levelIndex).toBe(0)
    expect(groot.startDenomination).toBeGreaterThan(1)
  })
})
