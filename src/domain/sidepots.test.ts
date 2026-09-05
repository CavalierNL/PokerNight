import { describe, expect, it } from 'vitest'
import { totaalUit, verdeelPotten, type Inzet } from './sidepots'

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
    //
    // En het blijft één pot. Cem legde 30 in, dus er ligt een niveaugrens op 30,
    // maar boven én onder die grens spelen dezelfde twee mensen. Twee regels
    // tonen die naar dezelfde mensen gaan nodigt aan tafel uit tot twee keer
    // uitbetalen.
    const { potten } = verdeelPotten([
      inzet('Ann', 100),
      inzet('Bob', 100),
      inzet('Cem', 30, true),
    ])
    expect(potten).toEqual([{ bedrag: 230, kanshebbers: ['Ann', 'Bob'] }])
  })

  it('houdt lagen wél apart als er een andere speler om meespeelt', () => {
    // Zelfde vorm als hierboven, maar nu folt Cem niet. Dan verschillen de
    // kanshebbers per laag en zijn het echt twee potten.
    const { potten } = verdeelPotten([inzet('Ann', 100), inzet('Bob', 100), inzet('Cem', 30)])
    expect(potten).toEqual([
      { bedrag: 90, kanshebbers: ['Ann', 'Bob', 'Cem'] },
      { bedrag: 140, kanshebbers: ['Ann', 'Bob'] },
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
      inzet('Cem', 100),
    ])
    expect(potten).toEqual([
      { bedrag: 300, kanshebbers: ['Ann', 'Bob', 'Cem'] },
      { bedrag: 800, kanshebbers: ['Ann', 'Bob'] },
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

  it('stapelt vier lagen met wisselgeld erbovenop', () => {
    // Het geval waarin de bandbreedte per laag en het wisselgeld allebei moeten
    // kloppen: drie all-ins onder één speler die er ruim overheen ging.
    const { potten, terug } = verdeelPotten([
      inzet('Ann', 50),
      inzet('Bob', 150),
      inzet('Cem', 400),
      inzet('Dana', 900),
    ])
    expect(potten).toEqual([
      { bedrag: 200, kanshebbers: ['Ann', 'Bob', 'Cem', 'Dana'] },
      { bedrag: 300, kanshebbers: ['Bob', 'Cem', 'Dana'] },
      { bedrag: 500, kanshebbers: ['Cem', 'Dana'] },
    ])
    expect(terug).toEqual({ naam: 'Dana', bedrag: 500 })
  })

  it('rekent een all-in voor minder dan de blind gewoon mee', () => {
    const { potten } = verdeelPotten([inzet('Ann', 10), inzet('Bob', 50), inzet('Cem', 50)])
    expect(potten).toEqual([
      { bedrag: 30, kanshebbers: ['Ann', 'Bob', 'Cem'] },
      { bedrag: 80, kanshebbers: ['Bob', 'Cem'] },
    ])
  })

  it('geeft bij een walk de pot én het wisselgeld aan dezelfde speler', () => {
    // Bob folt zijn small blind, Ann is big blind en krijgt de pot. Het deel van
    // haar blind dat niemand callde gaat terug. Zij staat dus in beide.
    const { potten, terug } = verdeelPotten([inzet('Ann', 50), inzet('Bob', 25, true)])
    expect(potten).toEqual([{ bedrag: 50, kanshebbers: ['Ann'] }])
    expect(terug).toEqual({ naam: 'Ann', bedrag: 25 })
  })

  it('kan wisselgeld opleveren zonder ook maar één pot', () => {
    // Iedereen folt voor de big blind.
    expect(verdeelPotten([inzet('Ann', 50), inzet('Bob', 0, true)])).toEqual({
      potten: [],
      terug: { naam: 'Ann', bedrag: 50 },
    })
  })

  it('geeft een pot waar niemand meer om speelt terug aan wie hem vulde', () => {
    // Deze invoer kan aan een echte tafel niet ontstaan: een ongecallde inzet
    // gaat terug vóór er gefold kan worden, dus Bob kan niet én het hoogst
    // ingelegd hebben én gefold zijn. Vastgelegd omdat de functie er hoe dan ook
    // een antwoord op moet geven — dit is de val-uit van de "één betaler"-regel,
    // geen pokerregel.
    const { potten, terug } = verdeelPotten([inzet('Ann', 100), inzet('Bob', 250, true)])
    expect(potten).toEqual([{ bedrag: 200, kanshebbers: ['Ann'] }])
    expect(terug).toEqual({ naam: 'Bob', bedrag: 150 })
  })

  it('laat een pot zonder kanshebbers staan in plaats van hem weg te rekenen', () => {
    // Ook dit kan in een echte hand niet: iemand moet de laatste inzet gevolgd
    // hebben. Het is dus een teken van verkeerde invoer, en dan hoort er iets
    // zichtbaars uit te komen — wegrekenen zou de chips laten verdwijnen.
    const { potten } = verdeelPotten([
      inzet('Ann', 100),
      inzet('Bob', 300, true),
      inzet('Cem', 300, true),
    ])
    expect(potten).toEqual([
      { bedrag: 300, kanshebbers: ['Ann'] },
      { bedrag: 400, kanshebbers: [] },
    ])
  })

  it('laat ook een volledig gefolde hand zichtbaar zonder winnaar', () => {
    expect(verdeelPotten([inzet('Ann', 100, true), inzet('Bob', 100, true)])).toEqual({
      potten: [{ bedrag: 200, kanshebbers: [] }],
    })
  })

  it('houdt de volgorde van de kanshebbers gelijk aan die van de invoer', () => {
    // Aan tafel lees je de namen voor; dan helpt het als ze in dezelfde volgorde
    // staan als de spelers zitten, niet alfabetisch of op bedrag.
    const { potten } = verdeelPotten([inzet('Zoë', 100), inzet('Ann', 300), inzet('Bob', 100)])
    expect(potten[0].kanshebbers).toEqual(['Zoë', 'Ann', 'Bob'])
  })

  it('negeert spelers die niets in de pot hebben', () => {
    // Wie meteen folt op de big blind heeft nul ingelegd en hoort nergens in
    // voor te komen — ook niet als kanshebber op een pot waar hij niet aan
    // meebetaald heeft.
    const { potten } = verdeelPotten([inzet('Ann', 100), inzet('Bob', 100), inzet('Cem', 0, true)])
    expect(potten).toEqual([{ bedrag: 200, kanshebbers: ['Ann', 'Bob'] }])
  })

  it('telt onbruikbare bedragen niet mee', () => {
    // Een negatief bedrag zou anders een negatief eerste niveau opleveren en dus
    // negatieve potten; NaN zou stil door de vergelijkingen glippen. Allebei
    // vallen ze op dezelfde regel af als een inzet van nul.
    const { potten } = verdeelPotten([
      inzet('Ann', 100),
      inzet('Bob', 100),
      inzet('Cem', -50),
      inzet('Dana', Number.NaN),
    ])
    expect(potten).toEqual([{ bedrag: 200, kanshebbers: ['Ann', 'Bob'] }])
  })

  it('rekent met hele chips', () => {
    // Een half fiche bestaat niet. Naar beneden, zodat de potten samen nooit
    // meer worden dan wat er werkelijk in het midden ligt.
    const { potten } = verdeelPotten([inzet('Ann', 100.7), inzet('Bob', 100.2)])
    expect(potten).toEqual([{ bedrag: 200, kanshebbers: ['Ann', 'Bob'] }])
  })

  it('geeft geen potten terug als er niets ingelegd is', () => {
    expect(verdeelPotten([])).toEqual({ potten: [] })
    expect(verdeelPotten([inzet('Ann', 0)])).toEqual({ potten: [] })
  })

  it('telt alle chips die erin gingen ook weer uit', () => {
    // De controle die aan tafel telt: er mag geen chip verdwijnen of bijkomen.
    // De verdeling zelf staat er ook, want een implementatie die alles op één
    // hoop gooit haalt de somcontrole net zo goed.
    const inzetten = [
      inzet('Ann', 725),
      inzet('Bob', 240, true),
      inzet('Cem', 1000),
      inzet('Dana', 725),
      inzet('Eef', 15, true),
    ]
    const verdeling = verdeelPotten(inzetten)
    // Eén pot, en dat is precies goed: Ann en Dana zitten er allebei voor 725 in
    // en Bob en Eef zijn gefold, dus er is geen laag waar een ánder om speelt.
    // Alleen Cems 275 boven de rest heeft geen tegenpartij.
    expect(verdeling.potten).toEqual([{ bedrag: 2430, kanshebbers: ['Ann', 'Cem', 'Dana'] }])
    expect(verdeling.terug).toEqual({ naam: 'Cem', bedrag: 275 })
    expect(totaalUit(verdeling)).toBe(inzetten.reduce((som, i) => som + i.bedrag, 0))
  })
})

describe('totaalUit', () => {
  it('telt het wisselgeld mee', () => {
    const verdeling = verdeelPotten([inzet('Ann', 500), inzet('Bob', 200)])
    // 400 in de pot plus 300 terug; alleen de potten optellen geeft 400.
    expect(totaalUit(verdeling)).toBe(700)
  })

  it('is nul als er niets ingelegd is', () => {
    expect(totaalUit(verdeelPotten([]))).toBe(0)
  })
})
