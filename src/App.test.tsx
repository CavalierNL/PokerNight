import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from './App'
import { AppStateProvider } from './state/AppState'
import { TournamentScreen } from './screens/TournamentScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { createTournament, type Settings } from './domain/tournament'
import { HOUSE_RULES } from './domain/chipset'

/**
 * Rendert de app zonder browser. Vangt geen gedrag af — daarvoor is de rekenkern
 * getest — maar wel de fout die je aan tafel het minst kunt gebruiken: een scherm
 * dat crasht in plaats van laadt.
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

describe('App', () => {
  it('toont de setup als er geen toernooi loopt', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('PokerNight')
    expect(html).toContain('Start het toernooi')
  })

  it('toont de blindstructuur en de fiches per speler in de setup', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('Blindstructuur')
    expect(html).toContain('Fiches per speler')
    expect(html).toContain('Prijzenpot')
  })

  it('vraagt om te hervatten als er een toernooi in de opslag staat', () => {
    const toernooi = createTournament(settings, HOUSE_RULES, Date.now())
    opslag.set('pokernight.tournament', JSON.stringify(toernooi))
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('Er loopt nog een toernooi')
    expect(html).toContain('Hervatten')
  })
})

describe('tafelscherm', () => {
  it('toont klok, blinds, spelers en de pauzeknop', () => {
    const toernooi = createTournament(settings, HOUSE_RULES, Date.now())
    opslag.set('pokernight.tournament', JSON.stringify(toernooi))

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
})

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
