import { useState } from 'react'
import { AppStateProvider, useAppState } from './state/AppState'
import { TournamentScreen } from './screens/TournamentScreen'
import { HomeScreen } from './screens/HomeScreen'
import { SetupScreen } from './screens/SetupScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { ChipsetScreen } from './screens/ChipsetScreen'
import { ResumePrompt } from './screens/ResumePrompt'
import { useScherm } from './hooks/useScherm'

function Inhoud() {
  const { tournament, discard } = useAppState()
  // Alleen bij het openen van de app vragen, niet nadat je zelf gestart bent.
  const [moetVragen, setMoetVragen] = useState(() => tournament !== null)
  const { scherm, ga, terug, vergeetStap } = useScherm()

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

  switch (scherm) {
    case 'nieuw':
      // Na de start staat het toernooi bovenaan; de stap wordt vervangen zodat
      // terug je niet in het formulier van een lopend toernooi terugzet.
      return <SetupScreen onTerug={terug} onGestart={vergeetStap} />
    case 'chipsets':
      return <ChipsetScreen onClose={terug} />
    case 'instellingen':
      return <SettingsScreen onClose={terug} />
    default:
      return (
        <HomeScreen
          onNieuw={() => ga('nieuw')}
          onChipsets={() => ga('chipsets')}
          onInstellingen={() => ga('instellingen')}
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
