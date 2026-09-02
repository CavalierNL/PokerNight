import { Button } from '../components/Button'
import { Kop } from '../components/Kop'
import './SetupScreen.css'

/**
 * De voordeur. Het setupscherm toonde bij het openen meteen alle instellingen,
 * blindstructuur en fiches; de meeste avonden wil je alleen op start drukken.
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
  return (
    <div className="setup setup--home">
      <Kop>PokerNight</Kop>

      <div className="home__knoppen">
        <Button onClick={onNieuw}>Nieuw toernooi</Button>
        <Button variant="ghost" onClick={onChipsets}>
          Pokerdozen
        </Button>
        <Button variant="ghost" onClick={onInstellingen}>
          Instellingen
        </Button>
      </div>
    </div>
  )
}
