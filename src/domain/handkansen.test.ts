import { describe, expect, it } from 'vitest'
import {
  BOARDS_PER_MATCHUP,
  DRAWS,
  HANDEN_TOT_FLOP,
  HANDEN_TOT_RIVER,
  HAND_KANSEN,
  KAARTEN_NA_FLOP,
  MATCHUPS,
  VOLGORDES_TURN_EN_RIVER,
  formatteerKans,
  matchupProcenten,
  raakOpTurnOfRiver,
} from './handkansen'
import type { Draw } from './handkansen'
import { AANTAL_KAARTEN, SOORTEN, handwaarde, leesKaarten, soortVan } from './handwaarde'
import type { Soort } from './handwaarde'

/** Het spel zonder de kaarten die al ergens liggen. */
function rest(...weg: number[][]): number[] {
  const bezet = new Set(weg.flat())
  return Array.from({ length: AANTAL_KAARTEN }, (_, kaart) => kaart).filter(
    (kaart) => !bezet.has(kaart),
  )
}

describe('HAND_KANSEN', () => {
  it('telt op tot alle handen die er zijn', () => {
    // De echte controle op de tabel: elke mogelijke greep van vijf uit
    // tweeenvijftig valt in precies een van deze tien vakjes, en die van zeven
    // ook. Een typefout in welk getal dan ook laat een van deze twee sommen
    // afwijken.
    const flop = HAND_KANSEN.reduce((som, hand) => som + hand.flop, 0)
    const river = HAND_KANSEN.reduce((som, hand) => som + hand.river, 0)
    expect(flop).toBe(HANDEN_TOT_FLOP)
    expect(river).toBe(HANDEN_TOT_RIVER)
  })

  it('staat op de flop van zeldzaam naar gewoon', () => {
    // Dit is waar de rangorde vandaan komt: met vijf kaarten wint de zeldzamere
    // hand, zonder uitzondering. Op de river geldt dat niet meer -- daar is
    // hoge kaart zeldzamer dan een paar -- dus die kolom hoort hier niet bij.
    const aantallen = HAND_KANSEN.map((hand) => hand.flop)
    expect(aantallen).toStrictEqual([...aantallen].sort((a, b) => a - b))
  })
})

describe('formatteerKans', () => {
  it('houdt twee cijfers over, hoe groot de kans ook is', () => {
    expect(formatteerKans(1_302_540, HANDEN_TOT_FLOP)).toBe('50%')
    expect(formatteerKans(58_627_800, HANDEN_TOT_RIVER)).toBe('44%')
    expect(formatteerKans(6_461_620, HANDEN_TOT_RIVER)).toBe('4,8%')
    expect(formatteerKans(4_047_644, HANDEN_TOT_RIVER)).toBe('3,0%')
    expect(formatteerKans(10_200, HANDEN_TOT_FLOP)).toBe('0,39%')
    expect(formatteerKans(624, HANDEN_TOT_FLOP)).toBe('0,024%')
  })

  it('vat alles onder een honderdste procent samen', () => {
    // Anders wordt de kolom twee tekens breder voor een royal flush die je toch
    // nooit krijgt.
    expect(formatteerKans(4, HANDEN_TOT_FLOP)).toBe('<0,01%')
    expect(formatteerKans(4_324, HANDEN_TOT_RIVER)).toBe('<0,01%')
  })
})

describe('MATCHUPS', () => {
  it('telt per matchup op tot alle boards die er zijn', () => {
    for (const matchup of MATCHUPS) {
      expect(matchup.wint + matchup.deelt + matchup.verliest, matchup.situatie).toBe(
        BOARDS_PER_MATCHUP,
      )
    }
  })

  // Elke matchup is 1,7 miljoen boards: samen een paar seconden, en op een
  // trage machine meer dan de vijf die een test standaard krijgt.
  it('klopt met wat je krijgt als je elk board uitdeelt', { timeout: 60_000 }, () => {
    for (const matchup of MATCHUPS) {
      const hand = leesKaarten(matchup.hand)
      const tegen = leesKaarten(matchup.tegen)
      const stapel = rest(hand, tegen)
      const zeven = [...hand, 0, 0, 0, 0, 0]
      const zevenTegen = [...tegen, 0, 0, 0, 0, 0]
      const geteld = { wint: 0, deelt: 0, verliest: 0 }

      for (let a = 0; a < stapel.length; a++)
        for (let b = a + 1; b < stapel.length; b++)
          for (let c = b + 1; c < stapel.length; c++)
            for (let d = c + 1; d < stapel.length; d++)
              for (let e = d + 1; e < stapel.length; e++) {
                zeven[2] = zevenTegen[2] = stapel[a]
                zeven[3] = zevenTegen[3] = stapel[b]
                zeven[4] = zevenTegen[4] = stapel[c]
                zeven[5] = zevenTegen[5] = stapel[d]
                zeven[6] = zevenTegen[6] = stapel[e]
                const verschil = handwaarde(zeven) - handwaarde(zevenTegen)
                if (verschil > 0) geteld.wint++
                else if (verschil < 0) geteld.verliest++
                else geteld.deelt++
              }

      expect(geteld, matchup.situatie).toStrictEqual({
        wint: matchup.wint,
        deelt: matchup.deelt,
        verliest: matchup.verliest,
      })
    }
  })

  it('gebruikt geen kaart twee keer', () => {
    for (const matchup of MATCHUPS) {
      const kaarten = leesKaarten(`${matchup.hand} ${matchup.tegen}`)
      expect(new Set(kaarten).size, matchup.situatie).toBe(4)
    }
  })

  it('geeft elke kaart een eigen kleur, behalve waar de situatie suited zegt', () => {
    // Een gedeelde kleur verschuift de uitkomst een paar procent. Het voorbeeld
    // moet dus het geval zijn dat de naam belooft, anders klopt het getal wel
    // maar staat het bij de verkeerde situatie.
    const kleuren = (kaarten: string) => new Set(leesKaarten(kaarten).map((kaart) => kaart % 4)).size
    for (const matchup of MATCHUPS) {
      const suited = matchup.situatie.startsWith('Suited')
      expect(kleuren(matchup.hand), matchup.situatie).toBe(suited ? 1 : 2)
      expect(kleuren(`${matchup.hand} ${matchup.tegen}`), matchup.situatie).toBe(suited ? 3 : 4)
    }
  })
})

describe('matchupProcenten', () => {
  it('geeft de zes matchups zoals ze in het venster staan', () => {
    expect(MATCHUPS.map(matchupProcenten)).toStrictEqual([
      [86, 14],
      [81, 19],
      [47, 53],
      [74, 26],
      [67, 33],
      [23, 77],
    ])
  })

  it('telt een gedeelde pot voor de helft', () => {
    const alles = BOARDS_PER_MATCHUP
    expect(matchupProcenten({ wint: 0, deelt: alles })).toStrictEqual([50, 50])
    expect(matchupProcenten({ wint: alles / 2, deelt: alles / 2 })).toStrictEqual([75, 25])
  })

  it('komt samen altijd op honderd, ook precies op de helft van een procent', () => {
    // 50,5 tegen 49,5: los afgerond zou dat 51 – 50 worden. De eerste hand
    // krijgt de afronding, de tweede wat overblijft.
    expect(matchupProcenten({ wint: BOARDS_PER_MATCHUP * 0.505, deelt: 0 })).toStrictEqual([51, 49])
  })
})

/** Vanaf welke hand de draw is aangekomen. Beter mag ook: dat is niet mis. */
const DOEL: Record<Draw['naam'], Soort> = {
  'Flush draw': 'Flush',
  'Straat, open aan twee kanten': 'Straight',
  'Set naar full house of four of a kind': 'Full house',
  'Straat, gat in het midden': 'Straight',
}

/** De voorbeeldhand van een draw op de flop: wat er nog te delen is, en of het raak is. */
function uitgedeeld(draw: Draw) {
  const kaarten = leesKaarten(`${draw.hand} ${draw.flop}`)
  const doel = SOORTEN.indexOf(DOEL[draw.naam])
  const raak = (...erbij: number[]) =>
    SOORTEN.indexOf(soortVan(handwaarde([...kaarten, ...erbij]))) >= doel
  return { stapel: rest(kaarten), raak }
}

describe('DRAWS', () => {
  it('heeft op de flop de draw nog niet binnen', () => {
    for (const draw of DRAWS) {
      expect(uitgedeeld(draw).raak(), draw.naam).toBe(false)
    }
  })

  it('heeft op de turn precies zoveel outs als er staat', () => {
    for (const draw of DRAWS) {
      const { stapel, raak } = uitgedeeld(draw)
      expect(stapel).toHaveLength(KAARTEN_NA_FLOP)
      expect(stapel.filter((turn) => raak(turn)), draw.naam).toHaveLength(draw.outs)
    }
  })

  it('krijgt er na een gemiste turn alleen bij de set outs bij, welke turn het ook was', () => {
    for (const draw of DRAWS) {
      const { stapel, raak } = uitgedeeld(draw)
      for (const turn of stapel.filter((kaart) => !raak(kaart))) {
        const rivers = stapel.filter((river) => river !== turn && raak(turn, river))
        expect(rivers, `${draw.naam}, turn ${turn}`).toHaveLength(draw.outs + draw.erbijOpRiver)
      }
    }
  })
})

describe('raakOpTurnOfRiver', () => {
  it('klopt met wat je krijgt als je elke turn en river uitdeelt', () => {
    for (const draw of DRAWS) {
      const { stapel, raak } = uitgedeeld(draw)
      let geteld = 0
      for (const turn of stapel)
        for (const river of stapel) if (river !== turn && raak(turn, river)) geteld++

      expect(raakOpTurnOfRiver(draw), draw.naam).toBe(geteld)
    }
  })

  it('telt bij negen outs 756 van de 2162 volgordes', () => {
    // De turn mist 38 keer, de river daarna 37 keer: 1406 missers.
    expect(VOLGORDES_TURN_EN_RIVER).toBe(2_162)
    expect(raakOpTurnOfRiver({ outs: 9, erbijOpRiver: 0 })).toBe(756)
  })

  it('geeft de vier draws zoals ze in het venster staan', () => {
    const regels = DRAWS.map(
      (draw) =>
        `${formatteerKans(draw.outs, KAARTEN_NA_FLOP)} → ` +
        formatteerKans(raakOpTurnOfRiver(draw), VOLGORDES_TURN_EN_RIVER),
    )
    expect(regels).toStrictEqual(['19% → 35%', '17% → 31%', '15% → 33%', '8,5% → 16%'])
  })

  it('ligt zonder outs op nul en met alleen maar outs op alles', () => {
    expect(raakOpTurnOfRiver({ outs: 0, erbijOpRiver: 0 })).toBe(0)
    expect(raakOpTurnOfRiver({ outs: KAARTEN_NA_FLOP, erbijOpRiver: 0 })).toBe(
      VOLGORDES_TURN_EN_RIVER,
    )
  })
})
