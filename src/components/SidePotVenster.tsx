import { useState } from 'react'
import { Button } from './Button'
import { totaalUit, verdeelPotten, type Inzet } from '../domain/sidepots'

/**
 * Rekent uit wie waar recht op heeft na een hand met all-ins op verschillende
 * hoogtes. Dat is het moment waarop een huistoernooi stilvalt: iedereen weet dat
 * er side pots zijn, niemand weet precies hoe ze lopen.
 *
 * De namen komen uit het lopende toernooi, dus je tikt alleen bedragen in. Dat
 * telwerk gebeurt aan tafel toch al — bij een all-in met ongelijke stacks moet
 * iemand de chips tellen, met of zonder app. Dit venster voegt er geen werk aan
 * toe, alleen het optellen.
 */
export function SidePotVenster({
  spelers,
  onSluiten,
}: {
  spelers: string[]
  onSluiten: () => void
}) {
  /*
   * Op plaats aan tafel gesleuteld en niet op naam. Namen zijn niet uniek — het
   * setupscherm trimt ze alleen — en met twee spelers die Jan heten zouden beide
   * velden aan één waarde hangen: je tikt bij de ene Jan 50 in en de andere
   * springt mee, met een pot die twee keer zo groot is als hij hoort. Een naam
   * als "constructor" zou bovendien een eigenschap van Object.prototype lezen.
   *
   * De tekst en niet het getal, zodat een veld leeg mag zijn terwijl je typt in
   * plaats van meteen op 0 te springen.
   */
  const [bedragen, setBedragen] = useState<string[]>(() => spelers.map(() => ''))
  const [gefold, setGefold] = useState<boolean[]>(() => spelers.map(() => false))

  function zet<T>(lijst: T[], index: number, waarde: T): T[] {
    return lijst.map((eerder, i) => (i === index ? waarde : eerder))
  }

  // Het afronden en het wegfilteren van onbruikbare bedragen gebeurt in
  // verdeelPotten, zodat de regel op de getestte plek staat.
  const inzetten: Inzet[] = spelers.map((naam, index) => ({
    naam,
    bedrag: Number(bedragen[index]),
    gefold: gefold[index],
  }))

  const verdeling = verdeelPotten(inzetten)
  const totaal = totaalUit(verdeling)

  return (
    <div className="levelscherm">
      <button
        type="button"
        className="schema__achtergrond"
        aria-label="Sluiten"
        onClick={onSluiten}
      />
      <div className="levelscherm__kaart schema">
        <span className="levelscherm__kop">Side pots</span>

        <div className="schema__lijst">
          <ul className="potinvoer">
            {spelers.map((naam, index) => (
              <li key={`${naam}-${index}`} className="potinvoer__regel">
                <span className="potinvoer__naam">{naam}</span>
                <input
                  className="potinvoer__bedrag"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  aria-label={`Inzet van ${naam}`}
                  value={bedragen[index]}
                  onChange={(e) => setBedragen((vorig) => zet(vorig, index, e.target.value))}
                />
                {/* Een schakelaar en geen vinkje: aan tafel tik je hier met een
                    duim op, en een vinkje van 14 pixels raak je dan niet. */}
                <button
                  type="button"
                  className={`potinvoer__fold${gefold[index] ? ' potinvoer__fold--aan' : ''}`}
                  aria-label={`Fold voor ${naam}`}
                  aria-pressed={gefold[index]}
                  onClick={() => setGefold((vorig) => zet(vorig, index, !vorig[index]))}
                >
                  fold
                </button>
              </li>
            ))}
          </ul>
        </div>

        {totaal === 0 ? (
          <p className="uitleg">
            Vul in wat iedereen deze hand ingelegd heeft. Wie gefold heeft betaalt
            mee maar dingt niet mee.
          </p>
        ) : (
          <ol className="potten">
            {verdeling.potten.map((pot, index) => (
              <li key={index} className="potten__regel">
                <span className="potten__naam">
                  {index === 0 ? 'Hoofdpot' : `Side pot ${index}`}
                </span>
                <span className="potten__bedrag">{pot.bedrag}</span>
                {/* "niemand" is geen vangnet maar het contract uit
                    verdeelPotten: een pot zonder kanshebbers betekent verkeerde
                    invoer en hoort zichtbaar te blijven, niet verborgen. */}
                <span className="potten__spelers">
                  {pot.kanshebbers.length > 0 ? pot.kanshebbers.join(', ') : 'niemand'}
                </span>
              </li>
            ))}
            {verdeling.terug && (
              <li className="potten__regel potten__regel--terug">
                <span className="potten__naam">Terug</span>
                <span className="potten__bedrag">{verdeling.terug.bedrag}</span>
                <span className="potten__spelers">{verdeling.terug.naam}</span>
              </li>
            )}
            {/* De controle die aan tafel telt: klopt dit met wat er in het midden
                ligt? Zonder dit totaal is een vertikte min of een half fiche —
                allebei genegeerd door de rekenkern — nergens aan te zien. */}
            <li className="potten__regel potten__regel--totaal">
              <span className="potten__naam">Totaal</span>
              <span className="potten__bedrag">{totaal}</span>
              <span className="potten__spelers">in het midden</span>
            </li>
          </ol>
        )}

        <Button onClick={onSluiten}>Sluiten</Button>
      </div>
    </div>
  )
}
