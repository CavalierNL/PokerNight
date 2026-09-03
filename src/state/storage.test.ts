import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadChipsets,
  OPSLAG_VERSIE,
  loadPreferences,
  loadTournament,
  saveChipsets,
  savePreferences,
  saveTournament,
} from './storage'
import { PRESETS } from '../domain/chipset'
import { createTournament, reduce, type Settings } from '../domain/tournament'
import { KLEINE_DOOS } from '../domain/testdozen'

const opslag = new Map<string, string>()

// Vitest draait standaard zonder DOM, dus localStorage bestaat hier niet.
beforeEach(() => {
  opslag.clear()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => opslag.get(k) ?? null,
    setItem: (k: string, v: string) => void opslag.set(k, v),
    removeItem: (k: string) => void opslag.delete(k),
    clear: () => opslag.clear(),
    key: () => null,
    length: 0,
  })
})

const settings: Settings = {
  playerNames: ['Sam', 'Ilse', 'Joost'],
  startingStack: 100,
  levelMinutes: 15,
  durationMinutes: 180,
  structure: 'doubling',
  trigger: 'both',
  colorUp: true,
  chipsetId: KLEINE_DOOS.id,
}

describe('chipsets', () => {
  it('geeft de presets terug als er niets is opgeslagen', () => {
    expect(loadChipsets()).toEqual(PRESETS)
  })

  it('bewaart en leest chipsets terug', () => {
    const eigen = [
      {
        id: 'x',
        name: 'Mijn doos',
        chips: [{ color: '#fff', value: 1, count: 10 }],
      },
    ]
    saveChipsets(eigen)
    expect(loadChipsets()).toEqual(eigen)
  })

  it('valt terug op de presets bij kapotte opslag', () => {
    opslag.set('pokernight.chipsets', '{niet-geldig')
    expect(loadChipsets()).toEqual(PRESETS)
  })

  it('negeert opslag van een andere versie', () => {
    opslag.set('pokernight.chipsets', JSON.stringify({ version: OPSLAG_VERSIE + 1, data: [{ id: 'oud' }] }))
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

  it('negeert waardes van het verkeerde type', () => {
    opslag.set(
      'pokernight.preferences',
      JSON.stringify({ version: OPSLAG_VERSIE, data: { sound: 'ja', wakeLock: false } }),
    )
    expect(loadPreferences()).toEqual({ sound: true, wakeLock: false })
  })
})

describe('toernooi', () => {
  it('overleeft een rondje opslaan en inlezen', () => {
    const t = createTournament(settings, KLEINE_DOOS, 1_000_000)
    saveTournament(t)
    const terug = loadTournament()
    expect(terug?.levelIndex).toBe(0)
    expect(terug?.players).toHaveLength(3)
    expect(terug?.clock).toEqual(t.clock)
  })

  it('bewaart de undo-geschiedenis niet', () => {
    // Die hoeft een refresh niet te overleven, en meeschrijven betekende twintig
    // kopieën van dezelfde blindstructuur bij elke wijziging.
    let t = createTournament(settings, KLEINE_DOOS, 1_000_000)
    t = reduce(t, { type: 'playerOut', index: 0, now: 1_000_000 })
    expect(t.history.length).toBeGreaterThan(0)

    saveTournament(t)
    expect(loadTournament()?.history).toEqual([])
    expect(opslag.get('pokernight.tournament')).not.toContain('"history"')
  })

  it('verwijdert de sleutel bij opslaan van null', () => {
    saveTournament(createTournament(settings, KLEINE_DOOS, 1_000_000))
    saveTournament(null)
    expect(loadTournament()).toBeNull()
  })

  it('weigert een toernooi met een onbruikbare vorm', () => {
    // Zonder deze controle crashte het tafelscherm op de eerste render, en bleef
    // het kapotte record staan — dus gaf elke volgende refresh een wit scherm.
    const onzin = [
      {},
      { levels: [], levelIndex: 0, players: [], settings: {}, clock: { state: 'running' } },
      { levels: [{}], levelIndex: 5, players: [], settings: {}, clock: { state: 'running', endsAt: 1 } },
      { levels: [{}], levelIndex: 0, players: [], settings: {}, clock: { state: 'onzin' } },
      { levels: [{}], levelIndex: 0, players: [], settings: {}, clock: { state: 'paused' } },
      'hallo',
      [],
    ]
    for (const waarde of onzin) {
      opslag.set('pokernight.tournament', JSON.stringify({ version: OPSLAG_VERSIE, data: waarde }))
      expect(loadTournament(), JSON.stringify(waarde)).toBeNull()
    }
  })

  it('negeert een toernooi uit een oudere versie van de app', () => {
    const t = createTournament(settings, KLEINE_DOOS, 1_000_000)
    opslag.set('pokernight.tournament', JSON.stringify({ version: OPSLAG_VERSIE - 1, data: t }))
    expect(loadTournament()).toBeNull()
  })
})

describe('mislukte opslag', () => {
  it('meldt het in plaats van stil door te gaan', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('vol', 'QuotaExceededError')
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    })
    expect(saveChipsets(PRESETS)).toBe('mislukt')
    expect(saveTournament(createTournament(settings, KLEINE_DOOS, 1))).toBe('mislukt')
  })
})
