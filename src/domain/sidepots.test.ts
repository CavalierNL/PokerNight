import { describe, expect, it } from 'vitest'
import { verdeelPotten, type Inzet } from './sidepots'

/** Korter opschrijven dan het objectliteraal, want er staan er hier veel. */
function inzet(naam: string, bedrag: number, gefold = false): Inzet {
  return { naam, bedrag, gefold }
}

describe('verdeelPotten', () => {
  it('maakt één pot als iedereen evenveel inlegt', () => {
    const { potten, terug } = verdeelPotten([inzet('Ann', 100), inzet('Bob', 100)])
    expect(potten).toEqual([{ bedrag: 200, kanshebbers: ['Ann', 'Bob'] }])
    expect(terug).toBeUndefined()
  })

  it('splitst een all-in met een kleinere stack in een hoofdpot en een side pot', () => {
    // Het geval waarvoor dit bestaat: Cem kan maar 50 mee, de andere twee gaan
    // door tot 200. Cem speelt om 150, de rest om de 300 die daarboven ligt.
    const { potten } = verdeelPotten([inzet('Ann', 200), inzet('Bob', 200), inzet('Cem', 50)])
    expect(potten).toEqual([
      { bedrag: 150, kanshebbers: ['Ann', 'Bob', 'Cem'] },
      { bedrag: 300, kanshebbers: ['Ann', 'Bob'] },
    ])
  })

  it('laat wie gefold heeft wel meebetalen maar niet meedingen', () => {
    // Gefolde chips blijven in de pot liggen; dat is het hele punt van folden na
    // een inzet. Ze tellen dus mee in het bedrag en niet in de kanshebbers.
    const { potten } = verdeelPotten([
      inzet('Ann', 100),
      inzet('Bob', 100),
      inzet('Cem', 40, true),
    ])
    expect(potten).toEqual([
      { bedrag: 120, kanshebbers: ['Ann', 'Bob'] },
      { bedrag: 120, kanshebbers: ['Ann', 'Bob'] },
    ])
  })

  it('geeft terug wat niemand kon volgen', () => {
    // Ann zet 500 terwijl Bob maar 200 heeft. Die laatste 300 heeft geen
    // tegenpartij: dat is geen pot om te winnen maar wisselgeld.
    const { potten, terug } = verdeelPotten([inzet('Ann', 500), inzet('Bob', 200)])
    expect(potten).toEqual([{ bedrag: 400, kanshebbers: ['Ann', 'Bob'] }])
    expect(terug).toEqual({ naam: 'Ann', bedrag: 300 })
  })

  it('maakt van een gelijke overinzet wél een side pot', () => {
    // Twee spelers boven de all-in: hun overschot is wél betwist, dus een pot en
    // geen wisselgeld. Het onderscheid zit in hoeveel spelers op dat niveau
    // zitten, niet in de bedragen.
    const { potten, terug } = verdeelPotten([
      inzet('Ann', 500),
      inzet('Bob', 500),
      inzet('Cem', 200),
    ])
    expect(potten).toEqual([
      { bedrag: 600, kanshebbers: ['Ann', 'Bob', 'Cem'] },
      { bedrag: 600, kanshebbers: ['Ann', 'Bob'] },
    ])
    expect(terug).toBeUndefined()
  })

  it('stapelt meerdere all-ins op verschillende hoogtes', () => {
    const { potten } = verdeelPotten([
      inzet('Ann', 300),
      inzet('Bob', 200),
      inzet('Cem', 100),
      inzet('Dana', 300),
    ])
    expect(potten).toEqual([
      { bedrag: 400, kanshebbers: ['Ann', 'Bob', 'Cem', 'Dana'] },
      { bedrag: 300, kanshebbers: ['Ann', 'Bob', 'Dana'] },
      { bedrag: 200, kanshebbers: ['Ann', 'Dana'] },
    ])
  })

  it('geeft een pot waar niemand meer om speelt terug aan wie hem vulde', () => {
    // Bob gaat over Ann heen en folt daarna zelf. Niemand kan die bovenste laag
    // winnen; hij hoort terug naar Bob in plaats van bij de hoofdpot te komen.
    const { potten, terug } = verdeelPotten([inzet('Ann', 100), inzet('Bob', 250, true)])
    expect(potten).toEqual([{ bedrag: 200, kanshebbers: ['Ann'] }])
    expect(terug).toEqual({ naam: 'Bob', bedrag: 150 })
  })

  it('houdt de volgorde van de kanshebbers gelijk aan die van de invoer', () => {
    // Aan tafel lees je de namen voor; dan helpt het als ze in dezelfde volgorde
    // staan als de spelers zitten, niet alfabetisch of op bedrag.
    const { potten } = verdeelPotten([inzet('Zoë', 100), inzet('Ann', 100)])
    expect(potten[0].kanshebbers).toEqual(['Zoë', 'Ann'])
  })

  it('negeert spelers die niets in de pot hebben', () => {
    // Wie meteen folt op de big blind heeft nul ingelegd en hoort nergens in
    // voor te komen — ook niet als kanshebber op een pot waar hij niet aan
    // meebetaald heeft.
    const { potten } = verdeelPotten([inzet('Ann', 100), inzet('Bob', 100), inzet('Cem', 0, true)])
    expect(potten).toEqual([{ bedrag: 200, kanshebbers: ['Ann', 'Bob'] }])
  })

  it('geeft geen potten terug als er niets ingelegd is', () => {
    expect(verdeelPotten([])).toEqual({ potten: [] })
    expect(verdeelPotten([inzet('Ann', 0)])).toEqual({ potten: [] })
  })

  it('telt alle chips die erin gingen ook weer uit', () => {
    // De controle die aan tafel telt: er mag geen chip verdwijnen of bijkomen.
    const inzetten = [
      inzet('Ann', 725),
      inzet('Bob', 240, true),
      inzet('Cem', 1000),
      inzet('Dana', 725),
      inzet('Eef', 15, true),
    ]
    const { potten, terug } = verdeelPotten(inzetten)
    const uit = potten.reduce((som, p) => som + p.bedrag, 0) + (terug?.bedrag ?? 0)
    expect(uit).toBe(inzetten.reduce((som, i) => som + i.bedrag, 0))
  })
})
