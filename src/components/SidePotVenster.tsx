import { useState } from 'react'
import { Button } from './Button'
import { verdeelPotten, type Inzet } from '../domain/sidepots'

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
  // De ingetikte tekst en niet het getal, zodat een veld leeg mag zijn terwijl
  // je typt in plaats van meteen op 0 te springen.
  const [bedragen, setBedragen] = useState<Record<string, string>>({})
  const [gefold, setGefold] = useState<Record<string, boolean>>({})

  const inzetten: Inzet[] = spelers.map((naam) => {
    const getal = Number(bedragen[naam])
    return {
      naam,
      bedrag: Number.isFinite(getal) && getal > 0 ? Math.floor(getal) : 0,
      gefold: gefold[naam] === true,
    }
  })

  const { potten, terug } = verdeelPotten(inzetten)
  const totaal = inzetten.reduce((som, inzet) => som + inzet.bedrag, 0)

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
            {spelers.map((naam) => (
              <li key={naam} className="potinvoer__regel">
                <span className="potinvoer__naam">{naam}</span>
                <input
                  className="potinvoer__bedrag"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  aria-label={`Inzet van ${naam}`}
                  value={bedragen[naam] ?? ''}
                  onChange={(e) => setBedragen((vorig) => ({ ...vorig, [naam]: e.target.value }))}
                />
                {/* Een schakelaar en geen vinkje: aan tafel tik je hier met een
                    duim op, en een vinkje van 14 pixels raak je dan niet. */}
                <button
                  type="button"
                  className={`potinvoer__fold${gefold[naam] ? ' potinvoer__fold--aan' : ''}`}
                  aria-label={`Fold voor ${naam}`}
                  aria-pressed={gefold[naam] === true}
                  onClick={() => setGefold((vorig) => ({ ...vorig, [naam]: !vorig[naam] }))}
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
            {potten.map((pot, index) => (
              <li key={index} className="potten__regel">
                <span className="potten__naam">
                  {index === 0 ? 'Hoofdpot' : `Side pot ${index}`}
                </span>
                <span className="potten__bedrag">{pot.bedrag}</span>
                <span className="potten__spelers">
                  {pot.kanshebbers.length > 0 ? pot.kanshebbers.join(', ') : 'niemand'}
                </span>
              </li>
            ))}
            {terug && (
              <li className="potten__regel potten__regel--terug">
                <span className="potten__naam">Terug</span>
                <span className="potten__bedrag">{terug.bedrag}</span>
                <span className="potten__spelers">{terug.naam}</span>
              </li>
            )}
          </ol>
        )}

        <Button onClick={onSluiten}>Sluiten</Button>
      </div>
    </div>
  )
}
