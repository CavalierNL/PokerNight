import { afterEach, describe, expect, it, vi } from 'vitest'
import { hoeGeopend, staatOpStartscherm } from './useInstallPrompt'

/** Zet een window neer met de media-queries die matchen, en verder niets. */
function nepVenster(matchend: string[], iosVlag?: boolean) {
  vi.stubGlobal('window', {
    matchMedia: (vraag: string) => ({ matches: matchend.includes(vraag) }),
    navigator: iosVlag === undefined ? {} : { standalone: iosVlag },
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('staatOpStartscherm', () => {
  it('herkent een app die fullscreen geopend is', () => {
    nepVenster(['(display-mode: fullscreen)'])
    expect(staatOpStartscherm()).toBe(true)
  })

  it('herkent standalone, de terugval uit het manifest', () => {
    nepVenster(['(display-mode: standalone)'])
    expect(staatOpStartscherm()).toBe(true)
  })

  it('herkent de eigen vlag van Safari', () => {
    // Safari kent display-mode niet en zet dit op navigator.
    nepVenster([], true)
    expect(staatOpStartscherm()).toBe(true)
  })

  it('zegt nee in een gewone browsertab', () => {
    nepVenster([], false)
    expect(staatOpStartscherm()).toBe(false)
  })

  it('zegt nee als de browser geen van beide kent', () => {
    vi.stubGlobal('window', { navigator: {} })
    expect(staatOpStartscherm()).toBe(false)
  })
})

describe('hoeGeopend', () => {
  it('noemt de modus waarin de app draait', () => {
    nepVenster(['(display-mode: standalone)'])
    expect(hoeGeopend()).toBe('standalone')

    nepVenster(['(display-mode: fullscreen)'])
    expect(hoeGeopend()).toBe('fullscreen')
  })

  it('noemt een snelkoppeling gewoon een browser', () => {
    // Een snelkoppeling op je startscherm opent een tabblad; die ziet er
    // hetzelfde uit maar is geen app.
    nepVenster([], false)
    expect(hoeGeopend()).toBe('browser')
  })

  it('herkent de vlag van Safari', () => {
    nepVenster([], true)
    expect(hoeGeopend()).toBe('standalone')
  })
})
