import { useState } from 'react'
import {
  DRAWS,
  HAND_KANSEN,
  HANDEN_TOT_FLOP,
  HANDEN_TOT_RIVER,
  KAARTEN_NA_FLOP,
  MATCHUPS,
  VOLGORDES_TURN_EN_RIVER,
  formatteerKans,
  matchupProcenten,
  raakOpTurnOfRiver,
} from '../domain/handkansen'
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

/** Een rijtje kaartjes uit "A♠ K♥". */
function Kaarten({ rij }: { rij: string }) {
  return (
    <span className="handen__kaarten">
      {rij.split(' ').map((kaart) => (
        <KaartTekst key={kaart} kaart={kaart} />
      ))}
    </span>
  )
}

/** De tien handen van sterk naar zwak, met de kans op elk. */
function Rangorde() {
  return (
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
              <span className="handen__kans">{formatteerKans(hand.flop, HANDEN_TOT_FLOP)}</span>
              <span className="handen__pijl">→</span>
              <span className="handen__kans">{formatteerKans(hand.river, HANDEN_TOT_RIVER)}</span>
            </span>
          </span>
          <Kaarten rij={VOORBEELDEN[hand.naam]} />
        </li>
      ))}
    </ol>
  )
}

/**
 * De twee vragen die aan tafel op "wat wint" volgen: hoe stond ik ervoor toen
 * we all-in gingen, en komt mijn draw nog aan. Dezelfde vorm als de rangorde --
 * links een naam, rechts kaarten -- zodat je het tweede tabblad niet opnieuw
 * hoeft te leren lezen.
 */
function Kansen() {
  return (
    <>
      <h3 className="kansen__kop">All-in voor de flop</h3>
      <ul className="handen handen--breed">
        {MATCHUPS.map((matchup) => {
          const [hand, tegen] = matchupProcenten(matchup)
          return (
            <li key={matchup.situatie} className="handen__regel">
              <span className="handen__naam">{matchup.situatie}</span>
              {/* Elk percentage onder zijn eigen kaarten. Als "86 – 14" naast
                  de naam moet je terugzoeken welke kant de 86 was. */}
              <span className="matchup">
                <span className="matchup__kant">
                  <Kaarten rij={matchup.hand} />
                  <span className="matchup__kans">{hand}%</span>
                </span>
                <span className="matchup__kant">
                  <Kaarten rij={matchup.tegen} />
                  <span className="matchup__kans">{tegen}%</span>
                </span>
              </span>
            </li>
          )
        })}
      </ul>
      <p className="uitleg kansen__uitleg">
        Het deel van de pot dat elke hand op den duur wint. Andere kleuren of een andere bijkaart
        schuiven het een paar procent op.
      </p>

      <h3 className="kansen__kop">Outs op de flop</h3>
      <ul className="handen handen--breed">
        {DRAWS.map((draw) => (
          <li key={draw.naam} className="handen__regel">
            <span className="handen__tekst">
              <span className="handen__naam">{draw.naam}</span>
              <span className="handen__kansen">
                <span className="kansen__outs">{draw.outs} outs</span>
                {/* De twee kansen blijven bij elkaar: past de regel niet, dan
                    breekt hij na de outs af en niet midden in "17% → 31%". */}
                <span className="kansen__paar">
                  <span>{formatteerKans(draw.outs, KAARTEN_NA_FLOP)}</span>
                  <span className="handen__pijl">→</span>
                  <span>{formatteerKans(raakOpTurnOfRiver(draw), VOLGORDES_TURN_EN_RIVER)}</span>
                </span>
              </span>
            </span>
            {/* Je eigen twee los van de flop: zo zie je op de tafel voor je
                terug wat hier staat. */}
            <span className="draw">
              <Kaarten rij={draw.hand} />
              <Kaarten rij={draw.flop} />
            </span>
          </li>
        ))}
      </ul>
      <p className="uitleg kansen__uitleg">
        Outs zijn de kaarten die je hand afmaken. Erachter de kans dat er een komt: op de turn → op
        turn of river. Uit het hoofd: outs × 2 + 1 voor één kaart, outs × 4 − 1 voor twee. De set
        doet het beter dan dat, want een turn die mist geeft er drie outs bij.
      </p>
    </>
  )
}

const TABBLADEN = [
  { id: 'rangorde', naam: 'Wat wint' },
  { id: 'kansen', naam: 'Kansen' },
] as const

type Tabblad = (typeof TABBLADEN)[number]['id']

/**
 * Wat je over de handen opzoekt tijdens het spelen: de rangorde, en op een
 * tweede tabblad de kansen bij een all-in en een draw. Staat los van het schema
 * en aan de andere kant van het scherm: het zijn twee dingen die je om heel
 * verschillende redenen opzoekt, en naast elkaar tik je de verkeerde.
 *
 * Het venster opent altijd op de rangorde. De link ernaartoe heet "Wat wint?",
 * en wie daarop tikt wil dat antwoord zonder eerst te kijken waar hij de vorige
 * keer gebleven was.
 */
export function HandenVenster({ onSluiten }: { onSluiten: () => void }) {
  const [tabblad, setTabblad] = useState<Tabblad>('rangorde')

  return (
    <div className="levelscherm">
      <button
        type="button"
        className="schema__achtergrond"
        aria-label="Sluiten"
        onClick={onSluiten}
      />
      <div className="levelscherm__kaart schema">
        <div className="tabbladen" role="tablist">
          {TABBLADEN.map(({ id, naam }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`handen-tab-${id}`}
              aria-selected={tabblad === id}
              aria-controls="handen-paneel"
              className="tabbladen__tab"
              onClick={() => setTabblad(id)}
            >
              {naam}
            </button>
          ))}
        </div>
        {/* In liggend scherm past de hele lijst niet; dan scrollt hij, net als
            de blindstructuur in het venster ernaast. De key zet hem bij het
            wisselen weer bovenaan: anders begin je het andere tabblad halverwege. */}
        <div
          key={tabblad}
          className="schema__lijst"
          role="tabpanel"
          id="handen-paneel"
          aria-labelledby={`handen-tab-${tabblad}`}
        >
          {tabblad === 'rangorde' ? <Rangorde /> : <Kansen />}
        </div>
        {/* De pijl staat ook in de zin, zodat hij niet uitgelegd hoeft te
            worden: hij is hetzelfde teken als in elke regel hierboven. */}
        {tabblad === 'rangorde' && (
          <p className="uitleg">
            Onder elke hand de kans erop: flop → river. Hebben twee spelers dezelfde
            hand, dan beslist de hoogste kaart daarin.
          </p>
        )}
        <Button onClick={onSluiten}>Sluiten</Button>
      </div>
    </div>
  )
}
