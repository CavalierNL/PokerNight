import { describe, expect, it } from 'vitest'
import { boog, taartpunt } from './MultiChip'

describe('taartpunt', () => {
  it('begint en eindigt in het midden, zodat de punt gevuld kan worden', () => {
    const pad = taartpunt(0, 90, 18)
    expect(pad.startsWith('M 20 20 L')).toBe(true)
    expect(pad.endsWith('Z')).toBe(true)
  })

  it('zet de vlag voor de grote boog om zodra de punt meer dan een halve cirkel is', () => {
    expect(taartpunt(0, 180, 18)).toContain(' 0 0 1 ')
    expect(taartpunt(0, 270, 18)).toContain(' 0 1 1 ')
  })
})

describe('boog', () => {
  it('gaat niet langs het midden en sluit zichzelf niet', () => {
    // Een sluiting zou hier een koorde dwars over de chip trekken.
    const pad = boog(0, 90, 16.3)
    expect(pad).not.toContain('20 20 L')
    expect(pad).not.toContain('Z')
  })

  it('loopt over de opgegeven straal', () => {
    expect(boog(0, 90, 16.3)).toContain('A 16.3 16.3')
  })
})
