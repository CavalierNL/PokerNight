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
    // Twee keer winnen weegt zwaarder dan twee keer tweede: het is een
    // pokeravond, niet een aanwezigheidslijst.
    //
    // Bob en Ann komen allebei op 7 punten uit, maar Bob won twee keer en Ann
    // één keer. Op naam alleen zou Ann bovenaan staan, dus deze opzet meet echt
    // de overwinningen-tiebreak en niet die op naam.
    const regels = klassement([
      avond(1, 3, ['Bob', 'Ann', 'Cem']),
      avond(2, 10, ['Bob', 'Cem', 'Ann']),
      avond(3, 17, ['Ann', 'Cem', 'Dirk', 'Bob']),
    ])
    expect(regels.map((r) => [r.naam, r.punten, r.overwinningen])).toEqual([
      ['Bob', 7, 2],
      ['Ann', 7, 1],
      ['Cem', 6, 0],
      ['Dirk', 2, 0],
    ])
  })

  it('laat de naam beslissen als punten én overwinningen gelijk zijn', () => {
    // Bob komt als eerste in de telling voor, dus zonder de tiebreak op naam
    // zou hij bovenaan blijven staan.
    const regels = klassement([avond(1, 3, ['Bob', 'Ann']), avond(2, 10, ['Ann', 'Bob'])])
    expect(regels.map((r) => [r.naam, r.punten, r.overwinningen])).toEqual([
      ['Ann', 3, 1],
      ['Bob', 3, 1],
    ])
  })

  it('telt dezelfde naam binnen één avond maar één keer', () => {
    // Het setupscherm dedupliceert niet en een laatkomer krijgt een vrij getypte
    // naam, dus twee keer "Ann" aan tafel kan echt. Zonder deze regel kreeg zij
    // 3 + 1 punten voor één avond — meer dan een avond met drie spelers
    // maximaal kan opleveren — en telde die avond dubbel mee.
    const regels = klassement([avond(1, 3, ['Ann', 'Bob', 'Ann'])])
    expect(regels.find((r) => r.naam === 'Ann')).toEqual({
      naam: 'Ann',
      punten: 3,
      avonden: 1,
      overwinningen: 1,
    })
  })

  it('geeft dezelfde stand ongeacht de volgorde van de avonden', () => {
    const drie = [
      avond(1, 3, ['Ann', 'Bob']),
      avond(2, 10, ['Bob', 'Ann']),
      avond(3, 17, ['Ann', 'Bob']),
    ]
    expect(klassement([drie[2], drie[0], drie[1]])).toEqual(klassement(drie))
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
    // Een afgerond toernooi blijft in de opslag staan tot er op Klaar gedrukt
    // wordt, dus na een refresh komt het opnieuw langs.
    const bestaand = [avond(1, 3, ['Ann', 'Bob'])]
    const opnieuw = metAvond(bestaand, avond(1, 3, ['Ann', 'Bob']))
    expect(opnieuw).toBe(bestaand)
  })

  it('vervangt de uitslag als die na ongedaan maken anders is', () => {
    // De verkeerde speler afgetikt, ongedaan gemaakt, en daarna goed uitgespeeld:
    // zelfde toernooi, dus zelfde id, maar een andere winnaar. Zou de eerste
    // blijven staan, dan gaf het klassement stil iemand anders de zege terwijl
    // het eindscherm de goede winnaar toont.
    const fout = [avond(1, 3, ['Ann', 'Bob'])]
    const goed = metAvond(fout, avond(1, 3, ['Bob', 'Ann']))
    expect(goed).toHaveLength(1)
    expect(goed[0].uitslag).toEqual(['Bob', 'Ann'])
  })

  it('sleutelt op id en niet op datum', () => {
    // Twee toernooien op één avond: een korte tweede na de eerste. Die hoort
    // gewoon apart mee te tellen.
    const uit = metAvond([avond(1, 3, ['Ann', 'Bob'])], avond(2, 3, ['Bob', 'Ann']))
    expect(uit.map((a) => a.id)).toEqual([1, 2])
  })

  it('sleutelt op id en niet op de uitslag', () => {
    // Dezelfde vaste groep die twee avonden op dezelfde volgorde eindigt is niet
    // zeldzaam; dat zijn twee avonden.
    const uit = metAvond([avond(1, 3, ['Ann', 'Bob'])], avond(2, 10, ['Ann', 'Bob']))
    expect(uit).toHaveLength(2)
  })

  it('houdt de avonden op volgorde van datum', () => {
    const uit = metAvond([avond(2, 17, ['Bob'])], avond(1, 3, ['Ann']))
    expect(uit.map((a) => a.id)).toEqual([1, 2])
  })
})
