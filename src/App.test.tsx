import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from './App'
import { AppStateProvider } from './state/AppState'
import { TournamentScreen } from './screens/TournamentScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { createTournament, type Settings } from './domain/tournament'
import { HOUSE_RULES, STANDARD_500 } from './domain/chipset'

/**
 * Rendert de app zonder browser. Vangt geen klikgedrag af — daarvoor is de
 * rekenkern getest — maar wel de fout die je aan tafel het minst kunt gebruiken:
 * een scherm dat crasht in plaats van laadt.
 */

const opslag = new Map<string, string>()

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
  playerNames: ['Sam', 'Ilse', 'Joost', 'Max'],
  buyIn: 10,
  startingStack: 100,
  levelMinutes: 15,
  durationMinutes: 180,
  structure: 'doubling',
  trigger: 'both',
  chipsetId: HOUSE_RULES.id,
}

/** Zet een toernooi in de opslag, in dezelfde vorm als de app zelf schrijft. */
function bewaarToernooi(overrides: Partial<Settings> = {}, chipset = HOUSE_RULES) {
  const { history: _h, ...core } = createTournament(
    { ...settings, ...overrides },
    chipset,
    Date.now(),
  )
  opslag.set('pokernight.tournament', JSON.stringify({ version: 1, data: core }))
}

describe('App', () => {
  it('toont de setup als er geen toernooi loopt', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('PokerNight')
    expect(html).toContain('Start het toernooi')
  })

  it('toont de blindstructuur, de fiches en de prijzenpot', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('Blindstructuur')
    expect(html).toContain('Fiches per speler')
    expect(html).toContain('Prijzenpot')
  })

  it('vraagt om te hervatten als er een toernooi in de opslag staat', () => {
    bewaarToernooi()
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('Er loopt nog een toernooi')
    expect(html).toContain('Hervatten')
  })

  it('valt terug op de setup bij een onbruikbaar opgeslagen toernooi', () => {
    // Een oud opslagformaat crashte het tafelscherm, en omdat het record bleef
    // staan gaf elke volgende refresh opnieuw een wit scherm.
    opslag.set('pokernight.tournament', JSON.stringify({ version: 1, data: { levels: [] } }))
    const html = renderToStaticMarkup(<App />)
    expect(html).not.toContain('Er loopt nog een toernooi')
    expect(html).toContain('Start het toernooi')
  })
})

describe('tafelscherm', () => {
  it('toont klok, blinds, spelers en de pauzeknop', () => {
    bewaarToernooi()
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <TournamentScreen />
      </AppStateProvider>,
    )
    expect(html).toContain('15:00')
    expect(html).toContain('1 / 2')
    expect(html).toContain('volgende 2 / 4')
    expect(html).toContain('Sam')
    expect(html).toContain('Pauze')
    expect(html).toContain('Pot € 40')
  })

  it('toont wanneer het toernooi naar verwachting klaar is', () => {
    bewaarToernooi({ trigger: 'time' })
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <TournamentScreen />
      </AppStateProvider>,
    )
    expect(html).toContain('klaar rond')
  })

  it('laat de eindtijd weg als alleen eliminaties de blinds verhogen', () => {
    bewaarToernooi({ trigger: 'elimination' })
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <TournamentScreen />
      </AppStateProvider>,
    )
    expect(html).not.toContain('klaar rond')
  })
})

describe('setup met een grotere startstack', () => {
  it('is startbaar met de standaardset', () => {
    // De knop was hier uitgeschakeld: de app eiste honderden kleine fiches per
    // speler en meldde een tekort dat niet op te lossen was.
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <SetupMetInstellingen />
      </AppStateProvider>,
    )
    expect(html).not.toContain('disabled')
  })
})

function SetupMetInstellingen() {
  opslag.set(
    'pokernight.settings',
    JSON.stringify({
      version: 1,
      data: { ...settings, startingStack: 2000, chipsetId: STANDARD_500.id },
    }),
  )
  return <App />
}

describe('instellingen', () => {
  it('toont de chipset-editor en de schakelaars', () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <SettingsScreen onClose={() => {}} />
      </AppStateProvider>,
    )
    expect(html).toContain('Chipset')
    expect(html).toContain('Geluid bij een blindverhoging')
    expect(html).toContain('Scherm aan houden tijdens het toernooi')
  })
})
