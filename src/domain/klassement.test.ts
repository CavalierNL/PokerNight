import { describe, expect, it } from 'vitest'
import { hallOfFame, klassement, metAvond, puntenVoor, type Avond } from './klassement'

/** 3 maart 2026, 4 maart, enzovoort — alleen de volgorde doet ertoe. */
function datum(dag: number): number {
  return Date.UTC(2026, 2, dag)
}

function avond(id: number, dag: number, uitslag: string[]): Avond {
  return { id, datum: datum(dag), uitslag }
}

describe('puntenVoor', () => {
  it('geeft de winnaar zoveel punten als er spelers waren', () => {
    // Zo weegt een avond met acht mensen zwaarder dan een avond met drie, en
    // dat klopt: acht verslaan is meer dan twee verslaan.
    expect(puntenVoor(0, 8)).toBe(8)
    expect(puntenVoor(0, 3)).toBe(3)
  })

  it('geeft wie als laatste eindigde één punt', () => {
    // Niet nul: meedoen telt, anders levert een avond waarop je vroeg uitvalt
    // precies evenveel op als een avond waarop je er niet was.
    expect(puntenVoor(7, 8)).toBe(1)
    expect(puntenVoor(2, 3)).toBe(1)
  })

  it('loopt er netjes tussenin af', () => {
    expect([0, 1, 2, 3].map((plaats) => puntenVoor(plaats, 4))).toEqual([4, 3, 2, 1])
  })
})

describe('klassement', () => {
  it('telt de punten van alle avonden bij elkaar op', () => {
    const regels = klassement([
      avond(1, 3, ['Ann', 'Bob', 'Cem']),
      avond(2, 10, ['Bob', 'Ann', 'Cem']),
    ])
    // Ann 3 + 2, Bob 2 + 3, Cem 1 + 1.
    expect(regels.map((r) => [r.naam, r.punten])).toEqual([
      ['Ann', 5],
      ['Bob', 5],
      ['Cem', 2],
    ])
  })

  it('telt avonden en overwinningen apart mee', () => {
    const regels = klassement([
      avond(1, 3, ['Ann', 'Bob']),
      avond(2, 10, ['Ann', 'Bob']),
      avond(3, 17, ['Bob', 'Ann']),
    ])
    const ann = regels.find((r) => r.naam === 'Ann')
    expect(ann).toEqual({ naam: 'Ann', punten: 5, avonden: 3, overwinningen: 2 })
  })

  it('zet bij gelijke punten wie vaker won bovenaan', () => {
    // Twee keer winnen en twee keer laatst worden is meer waard dan vier keer
    // middenmoot: het is een pokeravond, niet een aanwezigheidslijst.
    const regels = klassement([
      avond(1, 3, ['Ann', 'Bob', 'Cem']),
      avond(2, 10, ['Cem', 'Ann', 'Bob']),
      avond(3, 17, ['Bob', 'Cem', 'Ann']),
    ])
    expect(regels.map((r) => r.punten)).toEqual([6, 6, 6])
    // Alle drie precies één keer gewonnen, dus dan beslist de naam — een vaste
    // volgorde is beter dan een volgorde die per keer verschilt.
    expect(regels.map((r) => r.naam)).toEqual(['Ann', 'Bob', 'Cem'])
  })

  it('kent een speler die er één keer bij was gewoon zijn punten toe', () => {
    const regels = klassement([avond(1, 3, ['Ann', 'Bob']), avond(2, 10, ['Ann', 'Zoë'])])
    expect(regels.find((r) => r.naam === 'Zoë')).toEqual({
      naam: 'Zoë',
      punten: 1,
      avonden: 1,
      overwinningen: 0,
    })
  })

  it('is leeg als er nog niets gespeeld is', () => {
    expect(klassement([])).toEqual([])
  })

  it('slaat een avond zonder uitslag over', () => {
    // Een gestopt toernooi zonder winnaar hoort niemand punten te geven.
    expect(klassement([avond(1, 3, [])])).toEqual([])
  })
})

describe('hallOfFame', () => {
  it('geeft elke overwinning met datum, de nieuwste eerst', () => {
    const lijst = hallOfFame([
      avond(1, 3, ['Ann', 'Bob']),
      avond(2, 17, ['Bob', 'Ann']),
      avond(3, 10, ['Ann', 'Bob']),
    ])
    expect(lijst).toEqual([
      { naam: 'Bob', datum: datum(17) },
      { naam: 'Ann', datum: datum(10) },
      { naam: 'Ann', datum: datum(3) },
    ])
  })

  it('laat een avond zonder winnaar weg', () => {
    expect(hallOfFame([avond(1, 3, [])])).toEqual([])
  })
})

describe('metAvond', () => {
  it('zet een nieuwe avond erbij', () => {
    const bestaand = [avond(1, 3, ['Ann', 'Bob'])]
    expect(metAvond(bestaand, avond(2, 10, ['Bob', 'Ann']))).toHaveLength(2)
  })

  it('voegt dezelfde avond niet twee keer toe', () => {
    // Het eindscherm rendert vaker dan één keer, dus zonder dit zou één avond
    // bij elke render opnieuw in het klassement belanden.
    const bestaand = [avond(1, 3, ['Ann', 'Bob'])]
    const opnieuw = metAvond(bestaand, avond(1, 3, ['Ann', 'Bob']))
    expect(opnieuw).toBe(bestaand)
  })

  it('houdt de avonden op volgorde van datum', () => {
    const uit = metAvond([avond(2, 17, ['Bob'])], avond(1, 3, ['Ann']))
    expect(uit.map((a) => a.id)).toEqual([1, 2])
  })
})
