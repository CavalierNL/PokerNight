import { HAND_KANSEN, HANDEN_TOT_FLOP, HANDEN_TOT_RIVER, formatteerKans } from '../domain/handkansen'
import type { HandNaam } from '../domain/handkansen'
import { Button } from './Button'
import type { Kaart } from './PlayingCard'

/**
 * Bij elke hand een voorbeeld in plaats van een uitleg: aan tafel kijk je hier
 * hooguit vijf seconden naar, en kaarten zeggen in die tijd meer dan een zin.
 *
 * Alleen de kaarten die de hand máken. De bijkaarten die een pokerhand tot vijf
 * aanvullen doen hier niets: ze staan naast een paar net zo hard op tafel als
 * naast een straat, en met vijf kaarten op elke regel lijkt elke hand even
 * groot. Zo is de lengte van de rij zelf het verschil.
 *
 * De volgorde en de namen komen uit `HAND_KANSEN`; dit is alleen het plaatje
 * erbij. Vergeet je er een, dan klopt het type niet meer.
 */
const VOORBEELDEN: Record<HandNaam, string> = {
  'Royal flush': 'A♥ K♥ Q♥ J♥ 10♥',
  'Straight flush': '9♠ 8♠ 7♠ 6♠ 5♠',
  'Four of a kind': 'K♠ K♥ K♦ K♣',
  'Full house': '8♠ 8♥ 8♦ Q♣ Q♥',
  Flush: 'A♦ J♦ 8♦ 5♦ 2♦',
  Straight: '9♥ 8♠ 7♦ 6♣ 5♥',
  'Three of a kind': '7♠ 7♥ 7♦',
  'Two pair': 'J♠ J♥ 4♦ 4♣',
  'One pair': '10♠ 10♥',
  'High card': 'A♠',
}

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
      <span>{waarde}</span>
      <span>{kleur}</span>
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
        {/* In liggend scherm past de hele lijst niet; dan scrollt hij, net als
            de blindstructuur in het venster ernaast. */}
        <div className="schema__lijst">
          <ol className="handen">
            {HAND_KANSEN.map((hand) => (
              <li key={hand.naam} className="handen__regel">
                {/* Naam en kansen onder elkaar in één kolom. Naast elkaar zou
                    het passen moeten, maar dit venster is ook op een telefoon
                    maar zo'n driehonderd pixels breed: dan valt de vijfde kaart
                    van de royal flush eraf. Onder de naam is de ruimte gratis,
                    want de kaartjes ernaast zijn toch al hoger dan een regel. */}
                <span className="handen__tekst">
                  <span className="handen__naam">{hand.naam}</span>
                  <span className="handen__kansen">
                    <span className="handen__kans">
                      {formatteerKans(hand.flop, HANDEN_TOT_FLOP)}
                    </span>
                    <span className="handen__pijl">→</span>
                    <span className="handen__kans">
                      {formatteerKans(hand.river, HANDEN_TOT_RIVER)}
                    </span>
                  </span>
                </span>
                <span className="handen__kaarten">
                  {VOORBEELDEN[hand.naam].split(' ').map((kaart) => (
                    <KaartTekst key={kaart} kaart={kaart} />
                  ))}
                </span>
              </li>
            ))}
          </ol>
        </div>
        {/* De pijl staat ook in de zin, zodat hij niet uitgelegd hoeft te
            worden: hij is hetzelfde teken als in elke regel hierboven. */}
        <p className="uitleg">
          Onder elke hand de kans erop: flop → river. Hebben twee spelers dezelfde
          hand, dan beslist de hoogste kaart daarin.
        </p>
        <Button onClick={onSluiten}>Sluiten</Button>
      </div>
    </div>
  )
}
