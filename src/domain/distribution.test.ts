import { describe, expect, it } from 'vitest'
import { distributeChips } from './distribution'
import { buildStructure } from './blinds'
import { STANDARD_500, type Chipset, TOERNOOI_DOOS } from './chipset'
import { KLEINE_DOOS } from './testdozen'

const kleineDoos: Chipset = {
  id: 'klein',
  name: 'Kleine doos',
  chips: [
    { color: '#fff', value: 1, count: 40 },
    { color: '#0a0', value: 5, count: 20 },
  ],
}

describe('distributeChips — huisregel', () => {
  const verdeling = distributeChips(KLEINE_DOOS, 6, 100, 1, 1)

  it('haalt de gewenste startstack', () => {
    expect(verdeling.stackValue).toBe(100)
    expect(verdeling.shortages).toEqual([])
  })

  it('geeft elke speler genoeg kleine chips voor de eerste levels', () => {
    const kleine = verdeling.perPlayer
      .filter((a) => a.value === 1)
      .reduce((som, a) => som + a.count, 0)
    expect(kleine).toBeGreaterThanOrEqual(20)
  })

  it('deelt nooit meer chips uit dan er in de doos zitten', () => {
    for (const allocatie of verdeling.perPlayer) {
      const chip = KLEINE_DOOS.chips.find((c) => c.color === allocatie.color)!
      expect(allocatie.count * 6).toBeLessThanOrEqual(chip.count)
    }
  })

  it('meldt geen tekorten bij zes spelers', () => {
    expect(verdeling.maxPlayers).toBe(6)
  })
})

describe('distributeChips — invariant', () => {
  it('stackValue is altijd de som van de uitgedeelde chips', () => {
    for (const chipset of [KLEINE_DOOS, STANDARD_500, kleineDoos]) {
      for (const spelers of [1, 2, 6, 9, 12]) {
        for (const stack of [50, 100, 2000]) {
          const v = distributeChips(chipset, spelers, stack, 1, 1)
          const som = v.perPlayer.reduce((s, a) => s + a.value * a.count, 0)
          expect(som).toBe(v.stackValue)
        }
      }
    }
  })

  it('telt afrondverlies over kleuren mee in de tekortmelding', () => {
    // Twee kleuren van 5 chips à 1 en 2 spelers: per kleur past er 2 per speler,
    // samen 4 — niet de 5 die de som zou suggereren. Dat verschil moet gemeld.
    const twee: Chipset = {
      id: 'twee',
      name: 'Twee kleuren',
      chips: [
        { color: '#111', value: 1, count: 5 },
        { color: '#222', value: 1, count: 5 },
      ],
    }
    const v = distributeChips(twee, 2, 100, 1, 1)
    const uitgedeeld = v.perPlayer.reduce((s, a) => s + a.count, 0)
    const gemeld = v.shortages.find((s) => s.kind === 'weinigKleineFiches')
    expect(gemeld).toBeDefined()
    if (gemeld?.kind === 'weinigKleineFiches') expect(gemeld.perSpeler).toBe(uitgedeeld)
  })
})

describe('distributeChips — tekorten', () => {
  it('meldt dat de startstack niet gehaald wordt, met het aantal spelers dat wel past', () => {
    const verdeling = distributeChips(kleineDoos, 10, 100, 1, 1)
    expect(verdeling.shortages.some((s) => s.kind === 'startstackNietGehaald')).toBe(true)
    expect(verdeling.maxPlayers).toBeLessThan(10)
    expect(verdeling.maxPlayers).toBeGreaterThan(0)
  })

  it('geeft maxPlayers gelijk aan het gevraagde aantal als het gewoon lukt', () => {
    expect(distributeChips(KLEINE_DOOS, 8, 100, 1, 1).maxPlayers).toBe(8)
  })

  it('meldt een lege chipset', () => {
    const leeg: Chipset = { id: 'leeg', name: 'Leeg', chips: [] }
    expect(distributeChips(leeg, 4, 100, 1, 1).shortages).toEqual([{ kind: 'geenFiches' }])
  })
})

describe('distributeChips — samen met de blindstructuur', () => {
  it('reserveert geen chips die op level 0 al door een color-up van tafel gaan', () => {
    // Standaardset met een grote startstack: de blinds beginnen op 50/100, dus
    // chips van 1 zijn meteen overbodig. Zonder de startDenomination vroeg de
    // app 1000 witte chips per speler en blokkeerde hij de start.
    const structuur = buildStructure(
      {
        kind: 'doubling',
        colorUp: true,
        players: 8,
        startingStack: 10_000,
        durationMinutes: 180,
        levelMinutes: 15,
      },
      STANDARD_500,
    )
    expect(structuur.startDenomination).toBeGreaterThan(1)

    const verdeling = distributeChips(
      STANDARD_500,
      8,
      10_000,
      structuur.levels[0].smallBlind,
      structuur.startDenomination,
    )
    expect(verdeling.perPlayer.every((a) => a.value >= structuur.startDenomination)).toBe(true)
  })

  it('haalt een realistische startstack met de standaardset', () => {
    const structuur = buildStructure(
      {
        kind: 'calculated',
        colorUp: true,
        players: 8,
        startingStack: 2000,
        durationMinutes: 240,
        levelMinutes: 15,
      },
      STANDARD_500,
    )
    const verdeling = distributeChips(
      STANDARD_500,
      8,
      2000,
      structuur.levels[0].smallBlind,
      structuur.startDenomination,
    )
    expect(verdeling.shortages.filter((s) => s.kind === 'startstackNietGehaald')).toEqual([])
    expect(verdeling.stackValue).toBeGreaterThanOrEqual(1800)
  })
})

describe('de stapel wordt van onderaf opgebouwd', () => {
  it('gebruikt geen chip die de halve stack waard is', () => {
    // Bij 12500 leverde de oude verdeling een chip van 10000 op: die moet je bij
    // blinds van 25/50 meteen wisselen en speelt de hele avond niet mee.
    const verdeling = distributeChips(TOERNOOI_DOOS, 8, 12_500, 25, 25)
    for (const allocatie of verdeling.perPlayer) {
      expect(allocatie.value, `${allocatie.value}`).toBeLessThanOrEqual(12_500 / 2)
    }
    expect(verdeling.perPlayer.some((a) => a.value === 10_000)).toBe(false)
  })

  it('geeft van elke waarde onderaan een handvol chips', () => {
    const verdeling = distributeChips(TOERNOOI_DOOS, 8, 12_500, 25, 25)
    const perWaarde = new Map(verdeling.perPlayer.map((a) => [a.value, a.count]))

    for (const waarde of [25, 50, 100, 500]) {
      expect(perWaarde.get(waarde) ?? 0, `${waarde}`).toBeGreaterThanOrEqual(5)
    }
  })

  it('zet de kleinste waarde vooraan en telt elke waarde één keer', () => {
    const verdeling = distributeChips(TOERNOOI_DOOS, 8, 50_000, 25, 25)
    const waardes = verdeling.perPlayer.map((a) => a.value)

    expect(waardes).toEqual([...waardes].sort((a, b) => a - b))
    expect(new Set(waardes).size).toBe(waardes.length)
  })

  it('grijpt bij een diepe stack alsnog naar de grote chips', () => {
    // Van onderaf beginnen mag niet betekenen dat een diepe stack onbereikbaar
    // wordt; de doos heeft de hoge waardes daar juist voor.
    const verdeling = distributeChips(TOERNOOI_DOOS, 8, 50_000, 25, 25)
    expect(verdeling.perPlayer.some((a) => a.value >= 5000)).toBe(true)
  })
})
