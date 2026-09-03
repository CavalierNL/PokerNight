import { describe, expect, it } from 'vitest'
import { schermUitState } from './useScherm'

describe('schermUitState', () => {
  it('leest een geldig scherm uit de history-state', () => {
    expect(schermUitState({ scherm: 'chipsets' })).toBe('chipsets')
    expect(schermUitState({ scherm: 'nieuw' })).toBe('nieuw')
  })

  it('valt terug op de voordeur bij alles wat niet klopt', () => {
    // Deze waarde komt uit de browser: een oude versie van de app, een andere
    // pagina op hetzelfde adres, of gewoon niets.
    for (const rommel of [null, undefined, {}, { scherm: 'onzin' }, 'home', 42, []]) {
      expect(schermUitState(rommel), JSON.stringify(rommel) ?? 'undefined').toBe('home')
    }
  })
})
