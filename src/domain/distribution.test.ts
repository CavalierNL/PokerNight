import { describe, expect, it } from 'vitest'
import { distributeChips } from './distribution'
import { HOUSE_RULES, STANDARD_500 } from './chipset'

describe('distributeChips — huisregel', () => {
  const verdeling = distributeChips(HOUSE_RULES, 6, 100, 1)

  it('komt uit op ongeveer de gewenste startstack', () => {
    expect(verdeling.stackValue).toBeLessThanOrEqual(100)
    expect(verdeling.stackValue).toBeGreaterThan(80)
  })

  it('geeft elke speler genoeg kleine fiches voor de eerste levels', () => {
    const kleine = verdeling.perPlayer
      .filter((a) => a.value === 1)
      .reduce((som, a) => som + a.count, 0)
    expect(kleine).toBeGreaterThanOrEqual(20)
  })

  it('deelt nooit meer fiches uit dan er in de doos zitten', () => {
    for (const allocatie of verdeling.perPlayer) {
      const chip = HOUSE_RULES.chips.find((c) => c.name === allocatie.name)!
      expect(allocatie.count * 6).toBeLessThanOrEqual(chip.count)
    }
  })

  it('meldt geen tekorten bij zes spelers', () => {
    expect(verdeling.shortages).toEqual([])
  })
})

describe('distributeChips — tekorten', () => {
  it('meldt een tekort en het maximale aantal spelers', () => {
    const kleineDoos = {
      id: 'klein',
      name: 'Kleine doos',
      chips: [
        { name: 'wit', color: '#fff', value: 1, count: 40 },
        { name: 'groen', color: '#0a0', value: 5, count: 20 },
      ],
    }
    const verdeling = distributeChips(kleineDoos, 10, 100, 1)
    expect(verdeling.shortages.length).toBeGreaterThan(0)
    expect(verdeling.maxPlayers).toBeLessThan(10)
  })
})

describe('distributeChips — standaardset', () => {
  const verdeling = distributeChips(STANDARD_500, 8, 10000, 50)

  it('gebruikt ook de hoge denominaties', () => {
    const hoog = verdeling.perPlayer.filter((a) => a.value >= 100 && a.count > 0)
    expect(hoog.length).toBeGreaterThan(0)
  })

  it('blijft binnen de gewenste startstack', () => {
    expect(verdeling.stackValue).toBeLessThanOrEqual(10000)
  })
})
