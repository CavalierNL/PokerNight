import { naamlozePlaatsen, positiesBij, type PositieNaam } from '../domain/posities'
import { Button } from './Button'

/**
 * Wat een plaats doet, in een paar woorden. Geen uitleg van waar hij zit: dat
 * zegt de volgorde van de lijst al, en heads-up zou "links van de button" bij de
 * small blind gewoon niet kloppen. De cut-off is de uitzondering: die heeft geen
 * eigen taak, en vanaf zes spelers slaat de lijst de stoelen ervoor over.
 */
const ROL: Record<PositieNaam, string> = {
  Button: 'deelt, na de flop als laatste aan de beurt',
  'Small blind': 'legt de small blind',
  'Big blind': 'legt de big blind',
  'Under the gun': 'voor de flop als eerste aan de beurt',
  'Cut-off': 'rechts van de button',
}

/**
 * De procedure zoals de toernooiregels van de TDA (versie 2026) hem kennen; het
 * nummer in het commentaar boven elk punt is de regel waar het uit komt. Die
 * nummers verschuiven per uitgave, dus leg ze naast die van 2026 en niet naast
 * een nieuwere. Eén punt per discussie die aan tafel gevoerd wordt, in de
 * woorden van de tafel en niet van het reglement.
 *
 * Dat de eerste inzet minstens de big blind is staat niet letterlijk in de TDA:
 * die laat het minimum aan de structuur van het toernooi, en dat is hier de big
 * blind.
 */
const PROCEDURE: { kop: string; tekst: string }[] = [
  {
    // TDA 45
    kop: 'Minimum raise',
    tekst:
      'Een raise is minstens zo groot als de grootste volle inzet of raise van die ronde. ' +
      'Na een inzet van 100 en een raise naar 300 is de volgende dus minstens naar 500. ' +
      'De eerste inzet is minstens de big blind.',
  },
  {
    // TDA 49
    kop: 'All-in voor minder',
    tekst:
      'Een all-in die kleiner is dan een volle raise heropent het bieden niet voor wie al ' +
      'gehandeld heeft: die mag callen of folden. Tellen meerdere van zulke all-ins samen ' +
      'op tot een volle raise, dan wel.',
  },
  {
    // TDA 17 en 18
    kop: 'Showdown',
    tekst:
      'Is iemand all-in en valt er niets meer te bieden, dan gaan alle kaarten meteen open. ' +
      'Anders toont eerst wie in de laatste ronde het laatst heeft ingezet of geraised. ' +
      'Is er in die ronde niet ingezet, dan de eerste speler links van de button.',
  },
  {
    // TDA 36-C
    kop: 'Heads-up',
    tekst:
      'De button is small blind, krijgt de laatste kaart en is voor de flop als eerste ' +
      'aan de beurt, daarna als laatste.',
  },
  {
    // TDA 40
    kop: 'Burn-kaart',
    // "Vóór het delen van": elders in dit venster betekent "voor de flop" de
    // eerste biedronde, en dat is hier niet bedoeld.
    tekst:
      'Vóór het delen van de flop, de turn en de river gaat er één kaart dicht weg. ' +
      'Altijd één.',
  },
  {
    // TDA 21
    kop: 'Split pot',
    tekst:
      'Wissel de rest eerst naar de kleinste chip aan tafel. Wat er dan overblijft gaat ' +
      'per chip naar de winnaars, te beginnen bij wie het eerst links van de button zit.',
  },
  {
    // TDA 23
    kop: 'Side pots',
    tekst:
      'Elke side pot wordt apart verdeeld. Wie waar recht op heeft rekent het venster ' +
      'Side pots uit.',
  },
]

/**
 * De procedure waar een thuistafel op vastloopt, en de namen van de plaatsen
 * bij het aantal spelers dat er nu nog zit. De handrangorde staat hier bewust
 * niet bij: die heeft haar eigen venster, en dit is wat je opzoekt als de
 * kaarten al duidelijk zijn en de ruzie ergens anders over gaat.
 */
export function RegelVenster({
  aantalSpelers,
  onSluiten,
}: {
  aantalSpelers: number
  onSluiten: () => void
}) {
  const posities = positiesBij(aantalSpelers)
  const naamloos = naamlozePlaatsen(aantalSpelers)

  return (
    <div className="levelscherm">
      <button
        type="button"
        className="schema__achtergrond"
        aria-label="Sluiten"
        onClick={onSluiten}
      />
      <div className="levelscherm__kaart schema">
        <span className="levelscherm__kop">Regels</span>
        <div className="schema__lijst regels">
          {/* Met één speler over is er geen tafel meer om plaatsen aan te geven;
              dan blijft alleen de procedure staan. */}
          {posities.length > 0 && (
            <section className="regels__deel">
              <h2 className="regels__kop">
                Posities met {aantalSpelers} spelers, met de klok mee
              </h2>
              <ol className="posities">
                {posities.map((positie) => (
                  <li key={positie.plaats} className="posities__regel">
                    <span className="posities__naam">{positie.namen.join(' / ')}</span>
                    <span className="posities__rol">
                      {positie.namen.map((naam) => ROL[naam]).join(' · ')}
                    </span>
                  </li>
                ))}
              </ol>
              {naamloos > 0 && (
                <p className="uitleg">
                  {naamloos === 1
                    ? 'Tussen under the gun en de cut-off zit nog 1 speler zonder vaste naam.'
                    : `Tussen under the gun en de cut-off zitten nog ${naamloos} spelers zonder vaste naam.`}
                </p>
              )}
            </section>
          )}
          <section className="regels__deel">
            <h2 className="regels__kop">Procedure</h2>
            <dl className="procedure">
              {PROCEDURE.map((punt) => (
                <div key={punt.kop} className="procedure__punt">
                  <dt className="procedure__kop">{punt.kop}</dt>
                  <dd className="procedure__tekst">{punt.tekst}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
        <Button onClick={onSluiten}>Sluiten</Button>
      </div>
    </div>
  )
}
