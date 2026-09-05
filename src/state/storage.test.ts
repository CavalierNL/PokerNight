import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  KLASSEMENT_VERSIE,
  loadAvonden,
  loadChipsets,
  OPSLAG_VERSIE,
  loadPreferences,
  loadTournament,
  loadSpelers,
  naamruimte,
  saveAvonden,
  saveChipsets,
  savePreferences,
  saveSpelers,
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

describe('naamruimte', () => {
  it('houdt de gewone site op pokernight', () => {
    // Deze namen staan al in de browsers van iedereen die de app gebruikt; een
    // wijziging hier maakt hun lopende toernooi onvindbaar.
    expect(naamruimte('/')).toBe('pokernight')
    expect(naamruimte('/PokerNight/')).toBe('pokernight')
  })

  it('geeft elke PR-preview een eigen hoek', () => {
    expect(naamruimte('/PokerNight/pr-preview/pr-3/')).toBe('pokernight.pr-3')
    expect(naamruimte('/PokerNight/pr-preview/pr-12/')).toBe('pokernight.pr-12')
  })

  it('herkent een base zonder afsluitende slash', () => {
    // Vite normaliseert import.meta.env.BASE_URL niet, dus dit pad kan er echt
    // uitkomen. Zou de regex een slash eisen, dan viel de preview terug op de
    // productienaam en schreef hij over een lopend toernooi heen.
    expect(naamruimte('/PokerNight/pr-preview/pr-12')).toBe('pokernight.pr-12')
  })

  it('trapt niet in een pad dat er alleen op lijkt', () => {
    // De regex moet precies het patroon vangen dat preview.yml als PAGES_BASE
    // zet, en niets wat daar toevallig op lijkt — anders bepaalt een tikfout in
    // de workflow stilzwijgend welke opslag een preview gebruikt.
    expect(naamruimte('/PokerNight/pr-preview/')).toBe('pokernight')
    expect(naamruimte('/PokerNight/pr-previews/pr-12/')).toBe('pokernight')
    expect(naamruimte('/PokerNight/pr-preview/pr-abc/')).toBe('pokernight')
  })
})

/**
 * De tests hierboven dekken de functie, niet de bedrading. Zonder onderstaande
 * kan elke sleutel losraken van `naamruimte` zonder dat er iets omvalt: de
 * overige tests prikken op letterlijke productienamen, en die blijven kloppen
 * als een sleutel de naamruimte helemaal overslaat.
 *
 * Vandaar `resetModules` plus een verse import: de naamruimte wordt één keer bij
 * het laden van de module bepaald, dus een andere BASE_URL vraagt om een andere
 * modulelading.
 */
describe('opslag van een preview', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  async function laadOnder(basisPad: string) {
    vi.stubEnv('BASE_URL', basisPad)
    vi.resetModules()
    return import('./storage')
  }

  it('schrijft elke sleutel onder de naamruimte van de preview', async () => {
    const opslagModule = await laadOnder('/PokerNight/pr-preview/pr-12/')
    opslagModule.saveTournament(createTournament(settings, KLEINE_DOOS, 1))
    opslagModule.saveChipsets(PRESETS)
    opslagModule.saveSettings(settings)
    opslagModule.savePreferences({ sound: false, wakeLock: true })
    opslagModule.saveSpelers(['Ann'])
    opslagModule.saveAvonden([{ id: 1, datum: 2, uitslag: ['Ann'] }])

    // Allemaal, want één vergeten sleutel is precies de fout die niemand ziet.
    // Komt er een sleutel bij, dan hoort hij hier ook bij te staan.
    expect([...opslag.keys()].sort()).toEqual([
      'pokernight.pr-12.avonden',
      'pokernight.pr-12.chipsets',
      'pokernight.pr-12.preferences',
      'pokernight.pr-12.settings',
      'pokernight.pr-12.spelers',
      'pokernight.pr-12.tournament',
    ])
  })

  it('laat het toernooi van de echte site met rust', async () => {
    const echt = await laadOnder('/PokerNight/')
    const toernooi = createTournament(settings, KLEINE_DOOS, 1)
    echt.saveTournament(toernooi)

    // De preview ziet het toernooi van de echte site niet...
    const preview = await laadOnder('/PokerNight/pr-preview/pr-12/')
    expect(preview.loadTournament()).toBeNull()
    preview.saveTournament(createTournament({ ...settings, startingStack: 999 }, KLEINE_DOOS, 1))

    // ...en heeft het na afloop ook niet aangeraakt. Dit is de helft die telt:
    // hij vangt een preview die niet alleen leest maar ook overschrijft.
    const opnieuw = await laadOnder('/PokerNight/')
    expect(opnieuw.loadTournament()?.settings.startingStack).toBe(settings.startingStack)
  })
})

describe('vaste spelers', () => {
  it('begint leeg', () => {
    expect(loadSpelers()).toEqual([])
  })

  it('bewaart en leest de lijst terug', () => {
    saveSpelers(['Ann', 'Bob'])
    expect(loadSpelers()).toEqual(['Ann', 'Bob'])
  })

  it('gooit onbruikbare namen eruit in plaats van de hele lijst', () => {
    // Eén kapot element hoort niet de vaste spelers van een heel seizoen te
    // kosten.
    opslag.set(
      'pokernight.spelers',
      JSON.stringify({ version: KLASSEMENT_VERSIE, data: ['Ann', 42, '', '  ', 'Bob'] }),
    )
    expect(loadSpelers()).toEqual(['Ann', 'Bob'])
  })
})

describe('avonden', () => {
  const avond = { id: 1, datum: 2, uitslag: ['Ann', 'Bob'] }

  it('begint leeg', () => {
    expect(loadAvonden()).toEqual([])
  })

  it('bewaart en leest avonden terug', () => {
    saveAvonden([avond])
    expect(loadAvonden()).toEqual([avond])
  })

  it('weigert een record op elke ontbrekende voorwaarde apart', () => {
    // Per voorwaarde één record, elk met precies één mankement. Records die op
    // meerdere gronden tegelijk afvallen bewijzen niet dat elke controle nog
    // werkt: dan is er altijd een tweede die hem opvangt.
    const kapot = [
      { datum: 2, uitslag: ['Ann'] }, // geen id
      { id: 1, uitslag: ['Ann'] }, // geen datum
      { id: 1, datum: 2 }, // geen uitslag
      { id: Number.NaN, datum: 2, uitslag: ['Ann'] }, // NaN komt door typeof heen
      { id: 1, datum: Number.NaN, uitslag: ['Ann'] },
      { id: 1, datum: 2, uitslag: ['Ann', 7] }, // niet elk element een naam
      { id: 1, datum: 2, uitslag: [] }, // een avond zonder uitslag is geen avond
      null,
    ]
    for (const record of kapot) {
      opslag.set(
        'pokernight.avonden',
        JSON.stringify({ version: KLASSEMENT_VERSIE, data: [avond, record] }),
      )
      expect(loadAvonden(), JSON.stringify(record)).toEqual([avond])
    }
  })

  it('geeft de avonden op datum terug, ook als de opslag ze door elkaar heeft', () => {
    // De opslag garandeert geen volgorde; alleen wat via metAvond binnenkwam
    // staat gesorteerd.
    const later = { id: 9, datum: 99, uitslag: ['Bob'] }
    opslag.set(
      'pokernight.avonden',
      JSON.stringify({ version: KLASSEMENT_VERSIE, data: [later, avond] }),
    )
    expect(loadAvonden().map((a) => a.id)).toEqual([1, 9])
  })

  it('negeert avonden uit een oudere klassementversie', () => {
    opslag.set(
      'pokernight.avonden',
      JSON.stringify({ version: KLASSEMENT_VERSIE - 1, data: [avond] }),
    )
    expect(loadAvonden()).toEqual([])
  })

  it('overleeft een bump van OPSLAG_VERSIE', () => {
    // Dit is de hele reden dat het klassement een eigen versie heeft. Een bump
    // van OPSLAG_VERSIE hoort bij de vorm van een toernooi, en die gooit met
    // opzet weg — maar het klassement gaat jaren mee en mag daar niet in
    // meegesleept worden.
    saveAvonden([avond])
    saveSpelers(['Ann'])
    const opgeslagen = JSON.parse(opslag.get('pokernight.avonden') as string)
    expect(opgeslagen.version).toBe(KLASSEMENT_VERSIE)
    expect(opgeslagen.version).not.toBe(OPSLAG_VERSIE)
    expect(loadAvonden()).toEqual([avond])
    expect(loadSpelers()).toEqual(['Ann'])
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
    // Ook het klassement: dat is de enige onherstelbare data in de app, dus als
    // er íets moet melden dat de opslag vol zit is het dit.
    expect(saveAvonden([{ id: 1, datum: 2, uitslag: ['Ann'] }])).toBe('mislukt')
    expect(saveSpelers(['Ann'])).toBe('mislukt')
  })
})
