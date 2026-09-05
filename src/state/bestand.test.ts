import { describe, expect, it } from 'vitest'
import { bestandsnaam } from './bestand'

describe('bestandsnaam', () => {
  it('zet de datum erin zodat twee exports op datum sorteren', () => {
    // Lokale tijd, want de naam hoort te kloppen met de dag waarop je speelde.
    expect(bestandsnaam(new Date(2026, 8, 5, 22, 30).getTime())).toBe(
      'pokernight-klassement-2026-09-05.json',
    )
  })

  it('vult maand en dag aan tot twee cijfers', () => {
    // Zonder dat sorteert '2026-9-5' na '2026-10-1' in een bestandslijst.
    expect(bestandsnaam(new Date(2026, 0, 3, 12, 0).getTime())).toBe(
      'pokernight-klassement-2026-01-03.json',
    )
  })
})
