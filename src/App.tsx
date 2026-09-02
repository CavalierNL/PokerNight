import { useState } from 'react'
import { AppStateProvider, useAppState } from './state/AppState'
import { TournamentScreen } from './screens/TournamentScreen'
import { HomeScreen } from './screens/HomeScreen'
import { SetupScreen } from './screens/SetupScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { ChipsetScreen } from './screens/ChipsetScreen'
import { ResumePrompt } from './screens/ResumePrompt'

type Scherm = 'home' | 'nieuw' | 'chipsets' | 'instellingen'

function Inhoud() {
  const { tournament, discard } = useAppState()
  // Alleen bij het openen van de app vragen, niet nadat je zelf gestart bent.
  const [moetVragen, setMoetVragen] = useState(() => tournament !== null)
  const [scherm, setScherm] = useState<Scherm>('home')

  if (tournament && moetVragen) {
    return (
      <ResumePrompt
        startedAt={tournament.startedAt}
        onResume={() => setMoetVragen(false)}
        onDiscard={() => {
          discard()
          setMoetVragen(false)
        }}
      />
    )
  }

  if (tournament) return <TournamentScreen />

  const naarHome = () => setScherm('home')

  switch (scherm) {
    case 'nieuw':
      // Na de start staat het toernooi bovenaan; terugvallen op de setup zou
      // betekenen dat je na "Stoppen" opnieuw in het formulier belandt.
      return <SetupScreen onTerug={naarHome} onGestart={naarHome} />
    case 'chipsets':
      return <ChipsetScreen onClose={naarHome} />
    case 'instellingen':
      return <SettingsScreen onClose={naarHome} />
    default:
      return (
        <HomeScreen
          onNieuw={() => setScherm('nieuw')}
          onChipsets={() => setScherm('chipsets')}
          onInstellingen={() => setScherm('instellingen')}
        />
      )
  }
}

export default function App() {
  return (
    <AppStateProvider>
      <Inhoud />
    </AppStateProvider>
  )
}
