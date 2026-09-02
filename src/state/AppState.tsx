import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createTournament,
  reduce,
  type Action,
  type Settings,
  type Tournament,
} from '../domain/tournament'
import type { Chipset } from '../domain/chipset'
import {
  loadChipsets,
  loadPreferences,
  loadSettings,
  loadTournament,
  saveChipsets,
  savePreferences,
  saveSettings,
  saveTournament,
  type Preferences,
} from './storage'

type AppState = {
  tournament: Tournament | null
  settings: Settings | null
  chipsets: Chipset[]
  preferences: Preferences
  start: (settings: Settings, chipset: Chipset) => void
  dispatch: (action: Action) => void
  discard: () => void
  setChipsets: (chipsets: Chipset[]) => void
  setPreferences: (preferences: Preferences) => void
}

const Context = createContext<AppState | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [tournament, setTournament] = useState<Tournament | null>(() => loadTournament())
  const [settings, setSettingsState] = useState<Settings | null>(() => loadSettings())
  const [chipsets, setChipsetsState] = useState<Chipset[]>(() => loadChipsets())
  const [preferences, setPreferencesState] = useState<Preferences>(() => loadPreferences())

  useEffect(() => saveTournament(tournament), [tournament])
  useEffect(() => saveChipsets(chipsets), [chipsets])
  useEffect(() => savePreferences(preferences), [preferences])

  const start = useCallback((nieuwe: Settings, chipset: Chipset) => {
    setSettingsState(nieuwe)
    saveSettings(nieuwe)
    setTournament(createTournament(nieuwe, chipset, Date.now()))
  }, [])

  const dispatch = useCallback((action: Action) => {
    setTournament((huidig) => (huidig ? reduce(huidig, action) : huidig))
  }, [])

  const discard = useCallback(() => setTournament(null), [])

  const waarde = useMemo<AppState>(
    () => ({
      tournament,
      settings,
      chipsets,
      preferences,
      start,
      dispatch,
      discard,
      setChipsets: setChipsetsState,
      setPreferences: setPreferencesState,
    }),
    [tournament, settings, chipsets, preferences, start, dispatch, discard],
  )

  return <Context.Provider value={waarde}>{children}</Context.Provider>
}

export function useAppState(): AppState {
  const waarde = useContext(Context)
  if (!waarde) throw new Error('useAppState moet binnen AppStateProvider gebruikt worden')
  return waarde
}
