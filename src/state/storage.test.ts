import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadChipsets, loadPreferences, saveChipsets, savePreferences } from './storage'
import { PRESETS } from '../domain/chipset'

// Vitest draait standaard zonder DOM, dus localStorage bestaat hier niet.
beforeEach(() => {
  const opslag = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => opslag.get(k) ?? null,
    setItem: (k: string, v: string) => void opslag.set(k, v),
    removeItem: (k: string) => void opslag.delete(k),
    clear: () => opslag.clear(),
    key: () => null,
    length: 0,
  })
})

describe('chipsets', () => {
  it('geeft de presets terug als er niets is opgeslagen', () => {
    expect(loadChipsets()).toEqual(PRESETS)
  })

  it('bewaart en leest chipsets terug', () => {
    const eigen = [
      {
        id: 'x',
        name: 'Mijn doos',
        chips: [{ name: 'wit', color: '#fff', value: 1, count: 10 }],
      },
    ]
    saveChipsets(eigen)
    expect(loadChipsets()).toEqual(eigen)
  })

  it('valt terug op de presets bij kapotte opslag', () => {
    localStorage.setItem('pokernight.chipsets', '{niet-geldig')
    expect(loadChipsets()).toEqual(PRESETS)
  })
})

describe('voorkeuren', () => {
  it('heeft geluid en wake lock standaard aan', () => {
    expect(loadPreferences()).toEqual({ sound: true, wakeLock: true })
  })

  it('bewaart een wijziging', () => {
    savePreferences({ sound: false, wakeLock: true })
    expect(loadPreferences().sound).toBe(false)
  })
})
