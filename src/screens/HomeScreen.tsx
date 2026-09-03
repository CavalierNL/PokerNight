import { useState } from 'react'
import { Button } from '../components/Button'
import { Kop } from '../components/Kop'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import './SetupScreen.css'

/**
 * De voordeur. Het setupscherm toonde bij het openen meteen alle instellingen,
 * blindstructuur en chips; de meeste avonden wil je alleen op start drukken.
 * Kiezen wat je gaat doen komt nu eerst.
 */
export function HomeScreen({
  onNieuw,
  onChipsets,
  onInstellingen,
}: {
  onNieuw: () => void
  onChipsets: () => void
  onInstellingen: () => void
}) {
  const { installeer, alGeinstalleerd } = useInstallPrompt()
  const [uitleg, setUitleg] = useState(false)

  return (
    <div className="setup setup--home">
      <Kop>PokerNight</Kop>

      <div className="home__knoppen">
        <Button onClick={onNieuw}>Toernooi</Button>
        <Button variant="ghost" onClick={onChipsets}>
          Pokerdozen
        </Button>
        <Button variant="ghost" onClick={onInstellingen}>
          Instellingen
        </Button>
      </div>

      {!alGeinstalleerd && (
        <footer className="home__voet">
          <Button variant="ghost" onClick={installeer ?? (() => setUitleg((aan) => !aan))}>
            Op je beginscherm zetten
          </Button>
          {uitleg && (
            <p className="uitleg home__uitleg">
              Deze browser biedt het niet zelf aan. Op een iPhone gaat het via Deel → Zet op
              beginscherm, op Android via het menu van je browser → Toevoegen aan startscherm. De
              app opent dan zonder browserbalken.
            </p>
          )}
        </footer>
      )}
    </div>
  )
}
