import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createTournament,
  isAfgelopen,
  reduce,
  uitslag,
  winnaar,
  type Action,
  type Settings,
  type Tournament,
} from '../domain/tournament'
import { metAvond, type Avond } from '../domain/klassement'
import type { Chipset } from '../domain/chipset'
import {
  loadAvonden,
  loadChipsets,
  loadPreferences,
  loadSettings,
  loadSpelers,
  loadTournament,
  saveAvonden,
  saveChipsets,
  savePreferences,
  saveSettings,
  saveSpelers,
  saveTournament,
  type OpslagStatus,
  type Preferences,
} from './storage'

type AppState = {
  tournament: Tournament | null
  settings: Settings | null
  chipsets: Chipset[]
  preferences: Preferences
  /** De vaste spelers van de groep, waaruit het setupscherm laat kiezen. */
  spelers: string[]
  /** Elke afgeronde avond, oplopend op datum. Voedt het klassement. */
  avonden: Avond[]
  /** `false` zodra opslaan een keer mislukt is; het scherm waarschuwt dan. */
  storageOk: boolean
  start: (settings: Settings, chipset: Chipset) => void
  dispatch: (action: Action) => void
  discard: () => void
  setChipsets: (chipsets: Chipset[]) => void
  setPreferences: (preferences: Preferences) => void
  setSpelers: (spelers: string[]) => void
}

const Context = createContext<AppState | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [tournament, setTournament] = useState<Tournament | null>(() => loadTournament())
  const [settings, setSettingsState] = useState<Settings | null>(() => loadSettings())
  const [chipsets, setChipsetsState] = useState<Chipset[]>(() => loadChipsets())
  const [preferences, setPreferencesState] = useState<Preferences>(() => loadPreferences())
  const [spelers, setSpelersState] = useState<string[]>(() => loadSpelers())
  const [avonden, setAvonden] = useState<Avond[]>(() => loadAvonden())
  const [storageOk, setStorageOk] = useState(true)

  const meld = useCallback((status: OpslagStatus) => {
    if (status === 'mislukt') setStorageOk(false)
  }, [])

  useEffect(() => meld(saveTournament(tournament)), [tournament, meld])

  // Chipsets en voorkeuren worden pas na een echte wijziging geschreven. Schrijven
  // bij het opstarten zou een onleesbaar opgeslagen chipset meteen overschrijven
  // met de presets, en dan is de eigen doos van de gebruiker definitief weg.
  const eersteRender = useRef(true)
  useEffect(() => {
    if (eersteRender.current) {
      eersteRender.current = false
      return
    }
    meld(saveChipsets(chipsets))
    meld(savePreferences(preferences))
    meld(saveSpelers(spelers))
    meld(saveAvonden(avonden))
  }, [chipsets, preferences, spelers, avonden, meld])

  /**
   * Schrijft een afgeronde avond bij in het klassement.
   *
   * Alleen als er één winnaar is. Loopt een toernooi af op de klok met meerdere
   * spelers over, dan is de bovenkant van `uitslag` gewoon de zitvolgorde, en
   * daar punten aan hangen zou iemand een overwinning geven die hij niet
   * gespeeld heeft.
   *
   * `metAvond` is idempotent op het starttijdstip, dus dit effect mag zo vaak
   * lopen als het wil zonder dezelfde avond twee keer bij te schrijven.
   */
  useEffect(() => {
    if (!tournament || !isAfgelopen(tournament) || !winnaar(tournament)) return
    const avond: Avond = {
      id: tournament.startedAt,
      datum: tournament.finishedAt ?? tournament.startedAt,
      uitslag: uitslag(tournament).map((speler) => speler.name),
    }
    setAvonden((huidig) => metAvond(huidig, avond))
  }, [tournament])

  const start = useCallback(
    (nieuwe: Settings, chipset: Chipset) => {
      meld(saveSettings(nieuwe))
      setSettingsState(nieuwe)
      setTournament(createTournament(nieuwe, chipset, Date.now()))
    },
    [meld],
  )

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
      spelers,
      avonden,
      storageOk,
      start,
      dispatch,
      discard,
      setChipsets: setChipsetsState,
      setPreferences: setPreferencesState,
      setSpelers: setSpelersState,
    }),
    [
      tournament,
      settings,
      chipsets,
      preferences,
      spelers,
      avonden,
      storageOk,
      start,
      dispatch,
      discard,
    ],
  )

  return <Context.Provider value={waarde}>{children}</Context.Provider>
}

export function useAppState(): AppState {
  const waarde = useContext(Context)
  if (!waarde) throw new Error('useAppState moet binnen AppStateProvider gebruikt worden')
  return waarde
}
