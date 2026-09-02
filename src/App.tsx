import { useState } from 'react'
import { AppStateProvider, useAppState } from './state/AppState'
import { TournamentScreen } from './screens/TournamentScreen'
import { SetupScreen } from './screens/SetupScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { ResumePrompt } from './screens/ResumePrompt'

function Inhoud() {
  const { tournament, discard } = useAppState()
  // Alleen bij het openen van de app vragen, niet nadat je zelf gestart bent.
  const [moetVragen, setMoetVragen] = useState(() => tournament !== null)
  const [instellingen, setInstellingen] = useState(false)

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

  if (instellingen) return <SettingsScreen onClose={() => setInstellingen(false)} />
  if (tournament) return <TournamentScreen />
  return <SetupScreen onOpenSettings={() => setInstellingen(true)} />
}

export default function App() {
  return (
    <AppStateProvider>
      <Inhoud />
    </AppStateProvider>
  )
}
