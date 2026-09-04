import { describe, expect, it } from 'vitest'
import { HANDEN_TOT_FLOP, HANDEN_TOT_RIVER, HAND_KANSEN, formatteerKans } from './handkansen'

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
