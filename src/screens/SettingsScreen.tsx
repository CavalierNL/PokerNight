import { Button } from '../components/Button'
import { Panel } from '../components/Panel'
import { useAppState } from '../state/AppState'
import { speelBlindToon } from '../audio/blindToon'
import { SoundIcon } from '../components/SoundIcon'
import './SetupScreen.css'

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const { preferences, setPreferences } = useAppState()

  return (
    <div className="setup">
      <h1 className="setup__titel">Instellingen</h1>

      <Panel title="Aan tafel">
        <div className="schakelaar-rij">
          <label className="veld veld--schakelaar">
            <input
              type="checkbox"
              checked={preferences.sound}
              onChange={(e) => setPreferences({ ...preferences, sound: e.target.checked })}
            />
            <span>Geluid bij een blindverhoging</span>
          </label>
          {/* Ook bruikbaar met het vinkje uit: juist dan wil je horen wat je aanzet.
              Speelt de toon één keer; aan tafel herhaalt hij tot iemand reageert. */}
          <Button variant="ghost" onClick={speelBlindToon} title="Beluister de toon">
            <SoundIcon />
            <span className="alleen-schermlezer">Beluister de toon</span>
          </Button>
        </div>
        <label className="veld veld--schakelaar">
          <input
            type="checkbox"
            checked={preferences.wakeLock}
            onChange={(e) => setPreferences({ ...preferences, wakeLock: e.target.checked })}
          />
          <span>Scherm aan houden tijdens het toernooi</span>
        </label>
      </Panel>

      <Button onClick={onClose}>Terug</Button>
    </div>
  )
}
