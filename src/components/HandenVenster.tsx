import { Button } from './Button'
import type { Kaart } from './PlayingCard'

/**
 * De handen van sterk naar zwak. Bij elke hand een voorbeeld in plaats van een
 * uitleg: aan tafel kijk je hier hooguit vijf seconden naar, en vijf kaarten
 * zeggen in die tijd meer dan een zin.
 */
const HANDEN: { naam: string; kaarten: string }[] = [
  { naam: 'Royal flush', kaarten: 'A♥ K♥ Q♥ J♥ 10♥' },
  { naam: 'Straight flush', kaarten: '9♠ 8♠ 7♠ 6♠ 5♠' },
  { naam: 'Four of a kind', kaarten: 'K♠ K♥ K♦ K♣ 3♥' },
  { naam: 'Full house', kaarten: '8♠ 8♥ 8♦ Q♣ Q♥' },
  { naam: 'Flush', kaarten: 'A♦ J♦ 8♦ 5♦ 2♦' },
  { naam: 'Straat', kaarten: '9♥ 8♠ 7♦ 6♣ 5♥' },
  { naam: 'Three of a kind', kaarten: '7♠ 7♥ 7♦ K♣ 4♥' },
  { naam: 'Twee paar', kaarten: 'J♠ J♥ 4♦ 4♣ 9♥' },
  { naam: 'Paar', kaarten: '10♠ 10♥ A♦ 7♣ 3♥' },
  { naam: 'Hoge kaart', kaarten: 'A♠ Q♥ 9♦ 6♣ 3♥' },
]

/** "10♥" wordt `{ waarde: '10', kleur: '♥' }`. */
function lees(kaart: string): Kaart {
  return { waarde: kaart.slice(0, -1), kleur: kaart.slice(-1) }
}

/**
 * Een kaart als tekst in de vorm van een kaartje. Geen SVG zoals elders: tien
 * handen van vijf kaarten zijn vijftig tekeningen, en dan past er op een telefoon
 * niets meer naast de naam van de hand.
 */
function KaartTekst({ kaart }: { kaart: string }) {
  const { waarde, kleur } = lees(kaart)
  const rood = kleur === '♥' || kleur === '♦'
  return (
    <span className={`minikaart${rood ? ' minikaart--rood' : ''}`}>
      {waarde}
      {kleur}
    </span>
  )
}

/**
 * De rangorde van de handen, op te zoeken tijdens het spelen. Staat los van het
 * schema en aan de andere kant van het scherm: het zijn twee dingen die je om
 * heel verschillende redenen opzoekt, en naast elkaar tik je de verkeerde.
 */
export function HandenVenster({ onSluiten }: { onSluiten: () => void }) {
  return (
    <div className="levelscherm">
      <button
        type="button"
        className="schema__achtergrond"
        aria-label="Sluiten"
        onClick={onSluiten}
      />
      <div className="levelscherm__kaart schema">
        <span className="levelscherm__kop">Wat wint</span>
        <ol className="handen">
          {HANDEN.map((hand) => (
            <li key={hand.naam} className="handen__regel">
              <span className="handen__naam">{hand.naam}</span>
              <span className="handen__kaarten">
                {hand.kaarten.split(' ').map((kaart) => (
                  <KaartTekst key={kaart} kaart={kaart} />
                ))}
              </span>
            </li>
          ))}
        </ol>
        <p className="uitleg">Bij dezelfde hand wint de hoogste kaart.</p>
        <Button onClick={onSluiten}>Sluiten</Button>
      </div>
    </div>
  )
}
