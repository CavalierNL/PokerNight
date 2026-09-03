import { describe, expect, it } from 'vitest'
import { schud, type Toeval } from './loting'

/** Een bron die de opgegeven getallen op volgorde teruggeeft en dan herhaalt. */
function reeks(...getallen: number[]): Toeval {
  let i = 0
  return () => getallen[i++ % getallen.length]
}

describe('schud', () => {
  it('houdt iedereen aan tafel', () => {
    const namen = ['Sam', 'Ilse', 'Joost', 'Max', 'Nour']
    expect([...schud(namen, reeks(0.1, 0.7, 0.3, 0.9))].sort()).toEqual([...namen].sort())
  })

  it('laat de oorspronkelijke lijst met rust', () => {
    const namen = ['Sam', 'Ilse', 'Joost']
    schud(namen, reeks(0.5))
    expect(namen).toEqual(['Sam', 'Ilse', 'Joost'])
  })

  it('verplaatst werkelijk iemand', () => {
    expect(schud(['Sam', 'Ilse'], reeks(0))).toEqual(['Ilse', 'Sam'])
  })

  it('blijft binnen de tafel als de bron precies 1 geeft', () => {
    // Math.random() geeft dat nooit, maar een test of een andere bron wel, en
    // een index buiten de lijst maakt er stilletjes `undefined` van.
    const namen = ['Sam', 'Ilse', 'Joost']
    expect(schud(namen, reeks(1)).filter(Boolean)).toHaveLength(3)
  })
})

