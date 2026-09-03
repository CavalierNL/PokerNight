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
import { STANDARD_500, TOERNOOI_DOOS } from './domain/chipset'
import { prepareSetup } from './domain/setup'
import { KLEINE_DOOS } from './domain/testdozen'

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
  chipsetId: KLEINE_DOOS.id,
}

/** Zet een toernooi in de opslag, in dezelfde vorm als de app zelf schrijft. */
function bewaarToernooi(overrides: Partial<Settings> = {}, chipset = KLEINE_DOOS) {
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
  it('biedt altijd aan om de app op het startscherm te zetten', () => {
    // De browser meldt zelden zelf dat hij kan installeren — Firefox en Safari
    // doen het nooit — dus de knop mag daar niet van afhangen.
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('Op je startscherm zetten')
  })

  it('opent op het startscherm en toont nog geen formulier', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('PokerNight')
    expect(html).toContain('Toernooi')
    expect(html).toContain('Pokerdozen')
    expect(html).toContain('Instellingen')
    // De instellingen van het toernooi komen pas na "Nieuw toernooi".
    expect(html).not.toContain('Blindstructuur')
    expect(html).not.toContain('Namen, één per regel')
  })

  it('toont de blindstructuur en de chips', () => {
    const html = opgezetScherm()
    expect(html).toContain('Blindstructuur')
    expect(html).toContain('Chips per speler')
  })

  it('begint met acht genummerde spelers', () => {
    const html = opgezetScherm()
    expect(html).toContain('Speler 1')
    expect(html).toContain('Speler 8')
    expect(html).not.toContain('Speler 9')
  })

  it('begint op de kleinste chip van de doos', () => {
    // De toernooidoos begint bij 25, en het startstack-voorstel is zo gekozen
    // dat de blinds daar ook echt beginnen.
    const html = opgezetScherm()
    for (const paar of ['25 / 50', '50 / 100', '125 / 250']) {
      expect(html, paar).toContain(paar)
    }
  })

  it('vult de startstack met het voorstel voor deze doos', () => {
    const html = opgezetScherm()
    expect(html).toContain('Voorstel voor deze doos met 8 spelers')
    // 90 minuten in levels van 15 is zes levels; die diepte is daarvoor nodig.
    expect(html).toContain('value="12500"')
  })

  it('biedt alleen levellengtes aan die de duur precies vullen', () => {
    const html = opgezetScherm()
    for (const optie of ['9 levels van 10 minuten', '6 levels van 15 minuten', '3 levels van 30 minuten']) {
      expect(html, optie).toContain(optie)
    }
    // 20 minuten past niet in 90 en hoort er dus niet bij.
    expect(html).not.toContain('van 20 minuten')
  })

  it('laat kiezen tussen een eindtijd en last man standing', () => {
    const html = opgezetScherm()
    expect(html).toContain('Aan het einde van de speelduur')
    expect(html).toContain('Last man standing')
  })

  it('biedt de color-up aan bij een doos met genoeg waardes', () => {
    const html = opgezetScherm()
    expect(html).toContain('Color-up: de kleinste kleur gaat onderweg uit het spel')
    // De standaardset staat voorgeselecteerd en heeft vijf waardes.
    expect(html).not.toContain('er zijn maar twee waardes')
    // De color-up regel onder de blindstructuur: "Level N: chip voor chip".
    expect(html).toContain('colorup-regel')
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
    expect(html).toContain('Toernooi')
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
    // Small en big staan als benoemde bedragen, niet als "1 / 2".
    expect(html).toContain('>Small<')
    expect(html).toContain('>1<')
    expect(html).toContain('>Big<')
    expect(html).toContain('>2<')
    expect(html).toContain('Volgende blinds 2 / 4')
    expect(html).toContain('Sam')
    expect(html).toContain('Pauze')
  })

  it('toont de color-up als chips, niet als kleurnamen', () => {
    // Grote startstack met de 500-set: de kleinste kleur is meteen op level 0
    // overbodig, dus de melding staat er vanaf het begin.
    bewaarToernooi({ startingStack: 10_000, chipsetId: STANDARD_500.id }, STANDARD_500)
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <TournamentScreen />
      </AppStateProvider>,
    )
    expect(html).toContain('Color-up:')
    // De chips die uit het spel gaan, als svg met hun eigen kleur.
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
    expect(html).toContain('Klaar rond')
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
    // De knop was hier uitgeschakeld: de app eiste honderden kleine chips per
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
    expect(html).toContain('Waarde per chip')
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

describe('de huisregel op het setupscherm', () => {
  it('biedt hem aan bij elke doos', () => {
    const html = opgezetScherm()
    expect(html).toContain('Huisregel: één kleur is 5, de rest is 1')
  })

  it('toont de kleurkeuze pas als de regel aan staat', () => {
    const html = opgezetScherm()
    expect(html).not.toContain('Welke kleur is 5')
  })

  it('rekent met de platgeslagen doos zodra de regel aan staat', () => {
    const paars = STANDARD_500.chips[4].color
    const instellingen: Settings = {
      ...settings,
      chipsetId: STANDARD_500.id,
      houseRuleFiveColor: paars,
      structure: 'ladder',
    }
    const setup = prepareSetup(instellingen, STANDARD_500)

    // Twee waardes betekent geen color-up en blinds die op 1 en 5 te leggen zijn.
    expect(setup.structure.colorUps).toEqual([])
    expect(setup.structure.levels[0].bigBlind).toBe(2)
  })
})

describe('de kleurkeuze bij de huisregel', () => {
  /** Rendert het setupscherm met de huisregel al aan, zodat de keuze zichtbaar is. */
  function metHuisregelAan() {
    opslag.set(
      'pokernight.settings',
      JSON.stringify({
        version: OPSLAG_VERSIE,
        data: {
          ...settings,
          chipsetId: TOERNOOI_DOOS.id,
          houseRuleFiveColor: TOERNOOI_DOOS.chips[0].color,
        },
      }),
    )
    return renderToStaticMarkup(
      <AppStateProvider>
        <SetupScreen onTerug={() => {}} onGestart={() => {}} />
      </AppStateProvider>,
    )
  }

  it('zet de kleur met de meeste chips vooraan', () => {
    const html = metHuisregelAan()
    const getoond = [...html.matchAll(/huisregel__aantal">(\d+)</g)].map((m) => Number(m[1]))

    expect(getoond).toEqual([...TOERNOOI_DOOS.chips.map((c) => c.count)].sort((a, b) => b - a))
  })

  it('toont bij elke kleur hoeveel chips je ervan hebt', () => {
    const html = metHuisregelAan()
    for (const chip of TOERNOOI_DOOS.chips) {
      expect(html, `${chip.color}`).toContain(`huisregel__aantal">${chip.count}<`)
    }
  })
})

describe('het tafelscherm tijdens een pauze', () => {
  function tafel() {
    return renderToStaticMarkup(
      <AppStateProvider>
        <TournamentScreen />
      </AppStateProvider>,
    )
  }

  it('toont small en big als benoemde bedragen', () => {
    bewaarToernooi()
    const html = tafel()
    expect(html).toContain('Small')
    expect(html).toContain('Big')
  })

  it('laat alleen hervatten toe zodra er gepauzeerd is', () => {
    bewaarToernooi()
    const lopend = tafel()
    // Zonder pauze is er niets uitgeschakeld behalve spelers die al uit zijn.
    expect(lopend).toContain('Pauze')
    expect(lopend).not.toContain('GEPAUZEERD')
  })
})

describe('het scherm bij een levelovergang', () => {
  it('verschijnt zodra een level omgaat en houdt de klok stil', () => {
    bewaarToernooi()
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <TournamentScreen />
      </AppStateProvider>,
    )
    // Bij de start is er niets te bevestigen.
    expect(html).not.toContain('De klok mag lopen')
  })
})

describe('chips per speler bij de huisregel', () => {
  it('toont de 1-waardes als één chip in alle kleuren', () => {
    opslag.set(
      'pokernight.settings',
      JSON.stringify({
        version: OPSLAG_VERSIE,
        data: {
          ...settings,
          chipsetId: TOERNOOI_DOOS.id,
          houseRuleFiveColor: TOERNOOI_DOOS.chips[0].color,
        },
      }),
    )
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <SetupScreen onTerug={() => {}} onGestart={() => {}} />
      </AppStateProvider>,
    )
    // Eén chip die voor meerdere kleuren staat, in plaats van een regel per kleur.
    expect(html).toContain('in meerdere kleuren')
  })

  it('houdt zonder huisregel een regel per kleur', () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <SetupScreen onTerug={() => {}} onGestart={() => {}} />
      </AppStateProvider>,
    )
    expect(html).not.toContain('in meerdere kleuren')
  })
})

describe('de startstack bij een opgeslagen opzet', () => {
  /** Slaat een opzet op en rendert het setupscherm zoals de app dat doet. */
  function metOpgeslagen(overrides: Partial<Settings>) {
    opslag.set(
      'pokernight.settings',
      JSON.stringify({
        version: OPSLAG_VERSIE,
        data: { ...settings, chipsetId: TOERNOOI_DOOS.id, structure: 'ladder', ...overrides },
      }),
    )
    return renderToStaticMarkup(
      <AppStateProvider>
        <SetupScreen onTerug={() => {}} onGestart={() => {}} />
      </AppStateProvider>,
    )
  }

  it('neemt het opgeslagen bedrag over als dat het voorstel was', () => {
    // Zes levels van vijftien minuten vragen 12500; dat stond er dus in omdat de
    // app het voorstelde, niet omdat iemand het koos.
    const html = metOpgeslagen({ durationMinutes: 90, levelMinutes: 15, startingStack: 12_500 })
    // Het veld staat op hetzelfde bedrag als het voorstel eronder.
    expect(html).toContain('<strong>12500</strong>')
    expect(html).toContain('value="12500"')
  })

  it('herkent een afwijkend bedrag als een eigen keuze', () => {
    // Drie levels van dertig minuten vragen 2500; 12500 is dan geen voorstel maar
    // een keuze, en die blijft staan.
    const html = metOpgeslagen({ durationMinutes: 90, levelMinutes: 30, startingStack: 12_500 })
    // Het voorstel staat op 2500, het veld houdt de eigen 12500 vast.
    expect(html).toContain('<strong>2500</strong>')
    expect(html).toContain('value="12500"')
  })

  it('houdt een bedrag dat iemand zelf heeft ingevuld', () => {
    const html = metOpgeslagen({ durationMinutes: 90, levelMinutes: 15, startingStack: 7777 })
    expect(html).toContain('value="7777"')
  })
})
