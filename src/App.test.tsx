import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from './App'
import { AppStateProvider } from './state/AppState'
import { OPSLAG_VERSIE } from './state/storage'
import { TournamentScreen } from './screens/TournamentScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { ChipsetScreen } from './screens/ChipsetScreen'
import { SetupScreen } from './screens/SetupScreen'
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
  startingStack: 100,
  levelMinutes: 15,
  durationMinutes: 180,
  structure: 'doubling',
  trigger: 'both',
  colorUp: true,
  chipsetId: HOUSE_RULES.id,
}

/** Zet een toernooi in de opslag, in dezelfde vorm als de app zelf schrijft. */
function bewaarToernooi(overrides: Partial<Settings> = {}, chipset = HOUSE_RULES) {
  const { history: _h, ...core } = createTournament(
    { ...settings, ...overrides },
    chipset,
    Date.now(),
  )
  opslag.set('pokernight.tournament', JSON.stringify({ version: OPSLAG_VERSIE, data: core }))
}

function opgezetScherm() {
  return renderToStaticMarkup(
    <AppStateProvider>
      <SetupScreen onTerug={() => {}} onGestart={() => {}} />
    </AppStateProvider>,
  )
}

describe('App', () => {
  it('opent op het startscherm en toont nog geen formulier', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('PokerNight')
    expect(html).toContain('Nieuw toernooi')
    expect(html).toContain('Pokerdozen')
    expect(html).toContain('Instellingen')
    // De instellingen van het toernooi komen pas na "Nieuw toernooi".
    expect(html).not.toContain('Blindstructuur')
    expect(html).not.toContain('Namen, één per regel')
  })

  it('toont de blindstructuur en de fiches', () => {
    const html = opgezetScherm()
    expect(html).toContain('Blindstructuur')
    expect(html).toContain('Fiches per speler')
  })

  it('begint met acht genummerde spelers', () => {
    const html = opgezetScherm()
    expect(html).toContain('Speler 1')
    expect(html).toContain('Speler 8')
    expect(html).not.toContain('Speler 9')
  })

  it('begint op de 1-2-5 reeks', () => {
    const html = opgezetScherm()
    for (const paar of ['1 / 2', '2 / 4', '5 / 10', '10 / 20']) {
      expect(html, paar).toContain(paar)
    }
  })

  it('biedt de color-up aan, maar niet bij een doos met twee waardes', () => {
    const html = opgezetScherm()
    expect(html).toContain('Color-up: de kleinste kleur gaat onderweg uit het spel')
    // De huisregel staat voorgeselecteerd en heeft er maar twee.
    expect(html).toContain('disabled')
    expect(html).toContain('er zijn maar twee waardes')
  })

  it('doet bij de huisregel geen color-up', () => {
    const html = opgezetScherm()
    // De melding onder de blindstructuur begint met "Vanaf level N:".
    expect(html).not.toContain('Vanaf level')
  })

  it('vraagt om te hervatten als er een toernooi in de opslag staat', () => {
    bewaarToernooi()
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('Er loopt nog een toernooi')
    expect(html).toContain('Hervatten')
  })

  it('valt terug op het startscherm bij een onbruikbaar opgeslagen toernooi', () => {
    // Een oud opslagformaat crashte het tafelscherm, en omdat het record bleef
    // staan gaf elke volgende refresh opnieuw een wit scherm.
    opslag.set(
      'pokernight.tournament',
      JSON.stringify({ version: OPSLAG_VERSIE, data: { levels: [] } }),
    )
    const html = renderToStaticMarkup(<App />)
    expect(html).not.toContain('Er loopt nog een toernooi')
    expect(html).toContain('Nieuw toernooi')
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
  })

  it('toont de color-up als fiches, niet als kleurnamen', () => {
    // Grote startstack met de 500-set: de kleinste kleur is meteen op level 0
    // overbodig, dus de melding staat er vanaf het begin.
    bewaarToernooi({ startingStack: 10_000, chipsetId: STANDARD_500.id }, STANDARD_500)
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <TournamentScreen />
      </AppStateProvider>,
    )
    expect(html).toContain('Color-up: haal')
    // De fiches die uit het spel gaan, als svg met hun eigen kleur.
    expect(html).toContain(STANDARD_500.chips[0].color)
    for (const kleurnaam of ['wit', 'rood', 'groen', 'zwart', 'paars']) {
      expect(html, kleurnaam).not.toContain(`>${kleurnaam}<`)
    }
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
      version: OPSLAG_VERSIE,
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
    expect(html).toContain('Geluid bij een blindverhoging')
    expect(html).toContain('Scherm aan houden tijdens het toernooi')
  })

  it('benoemt welk getal de waarde is en welk het aantal', () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <ChipsetScreen onClose={() => {}} />
      </AppStateProvider>,
    )
    expect(html).toContain('Waarde per fiche')
    expect(html).toContain('Aantal in de doos')
  })

  it('heeft een knop om de blindtoon te beluisteren', () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <SettingsScreen onClose={() => {}} />
      </AppStateProvider>,
    )
    expect(html).toContain('Beluister')
  })

  it('laat de doos hernoemen en beheren', () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <ChipsetScreen onClose={() => {}} />
      </AppStateProvider>,
    )
    expect(html).toContain('Naam van deze doos')
    expect(html).toContain('Doos kopiëren')
    expect(html).toContain('Nieuwe doos')
    expect(html).toContain('Doos verwijderen')
  })

})
