import { describe, expect, it } from 'vitest'
import { buildStructure, levelCount, targetEndBigBlind } from './blinds'
import { HOUSE_RULES, STANDARD_500 } from './chipset'
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
  })
})

describe('targetEndBigBlind', () => {
  it('mikt op tien big blinds gemiddeld bij drie spelers over', () => {
    expect(targetEndBigBlind(8, 10000)).toBeCloseTo(2666.67, 1)
  })
})

describe('buildStructure — verdubbelend', () => {
  const structuur = buildStructure(huisregel, HOUSE_RULES)

  it('verdubbelt de big blind per level', () => {
    const bbs = structuur.levels.slice(0, 4).map((l) => l.bigBlind)
    expect(bbs).toEqual([2, 4, 8, 16])
  })

  it('begint op honderd big blinds diep, met een big blind van minstens twee fiches', () => {
    expect(structuur.levels[0].bigBlind).toBe(2)
    expect(structuur.levels[0].smallBlind).toBe(1)
  })

  it('nummert de levels vanaf 0', () => {
    expect(structuur.levels[0].index).toBe(0)
    expect(structuur.levels[1].index).toBe(1)
  })
})

describe('buildStructure — berekend', () => {
  const structuur = buildStructure(
    {
      ...huisregel,
      kind: 'calculated',
      players: 8,
      startingStack: 10000,
      levelMinutes: 15,
      durationMinutes: 240,
    },
    STANDARD_500,
  )

  it('loopt strikt op', () => {
    for (let i = 1; i < structuur.levels.length; i++) {
      expect(structuur.levels[i].bigBlind).toBeGreaterThan(structuur.levels[i - 1].bigBlind)
    }
  })

  it('groeit langzamer dan verdubbelen', () => {
    const eerste = structuur.levels[0].bigBlind
    const tweede = structuur.levels[1].bigBlind
    expect(tweede).toBeLessThan(eerste * 2.5)
  })

  it('houdt de kleine blind altijd onder de big blind', () => {
    for (const level of structuur.levels) {
      expect(level.smallBlind).toBeLessThan(level.bigBlind)
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
})

describe('color-up', () => {
  it('haalt de kleinste denominatie eruit zodra de kleine blind tien keer zo groot is', () => {
    const structuur = buildStructure(huisregel, HOUSE_RULES)
    const eerste = structuur.colorUps[0]
    expect(eerste).toBeDefined()
    expect(eerste.retiredValue).toBe(1)
    expect(eerste.nextValue).toBe(5)
    const level = structuur.levels[eerste.levelIndex]
    expect(level.smallBlind).toBeGreaterThanOrEqual(10)
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
})
