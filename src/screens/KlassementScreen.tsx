import { useState } from 'react'
import { Button } from '../components/Button'
import { Kop } from '../components/Kop'
import { Panel } from '../components/Panel'
import { TrashIcon } from '../components/TrashIcon'
import { useAppState } from '../state/AppState'
import { hallOfFame, klassement } from '../domain/klassement'
import './SetupScreen.css'
import './KlassementScreen.css'

function datumTekst(ms: number): string {
  return new Date(ms).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * De hall of fame, de stand over alle gespeelde avonden, en de lijst met vaste
 * spelers waar het setupscherm uit laat kiezen.
 *
 * De overwinningen staan bovenaan omdat dat de vraag is waarmee je dit scherm
 * opent: wie won er ook alweer vorige keer. De stand is het naslagwerk daarnaast.
 * Op een telefoon vallen de panelen onder elkaar, dus deze volgorde bepaalt daar
 * wat je zonder scrollen ziet.
 *
 * De vaste spelers staan hier en niet bij de instellingen: het klassement herkent
 * dezelfde persoon alleen als de naam elke avond precies gelijk is, en dat lukt
 * door hem aan te tikken in plaats van te typen. Wordt een naam de ene avond
 * anders geschreven dan de andere, dan staat diezelfde persoon in het klassement
 * als twee spelers — en dit scherm is de enige plek waar dat op te merken valt.
 */
export function KlassementScreen({ onClose }: { onClose: () => void }) {
  const { spelers, avonden, setSpelers, storageOk } = useAppState()
  const [nieuw, setNieuw] = useState('')

  const stand = klassement(avonden)
  const overwinningen = hallOfFame(avonden)

  /** Voor het vergelijken van namen; zie `bestaatAl`. */
  function genormaliseerd(naam: string): string {
    return naam.trim().toLocaleLowerCase('nl')
  }

  // Hoofdletterongevoelig, want de hele reden dat deze lijst bestaat is dat
  // 'bram' en 'Bram' niet twee mensen worden. Hem letterlijk vergelijken zou
  // precies dat toelaten in de lijst die het moet voorkomen.
  function bestaatAl(naam: string): boolean {
    return spelers.some((andere) => genormaliseerd(andere) === genormaliseerd(naam))
  }

  // Namen die wel gespeeld hebben maar niet in de vaste lijst staan. Meestal een
  // gast, soms een tikfout die het klassement in tweeën heeft gehakt.
  const onbekend = [...new Set(stand.map((regel) => regel.naam))].filter(
    (naam) => !bestaatAl(naam),
  )

  function voegToe(naam: string) {
    const schoon = naam.trim()
    if (schoon === '' || bestaatAl(schoon)) return
    setSpelers([...spelers, schoon])
    setNieuw('')
  }

  return (
    <div className="setup">
      <Kop>Klassement</Kop>

      {!storageOk && (
        <div className="melding melding--error">
          De opslag van je browser is vol of geblokkeerd. Het klassement wordt niet bewaard.
        </div>
      )}

      <div className="setup__raster">
        <Panel title="Hall of fame">
          {overwinningen.length === 0 ? (
            <p className="uitleg">Hier komt elke overwinning te staan, met de datum erbij.</p>
          ) : (
            <ol className="fame">
              {overwinningen.map((zege, index) => (
                <li key={`${zege.datum}-${index}`} className="fame__regel">
                  <span className="fame__naam">{zege.naam}</span>
                  <span className="fame__datum">{datumTekst(zege.datum)}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Stand">
          {stand.length === 0 ? (
            <p className="uitleg">
              Nog geen avond gespeeld. Een toernooi telt mee zodra er één speler over is; loopt
              hij af op de klok met meerdere mensen aan tafel, dan is er geen uitslag om punten
              aan te hangen.
            </p>
          ) : (
            <>
              <ol className="stand">
                {stand.map((regel, plaats) => (
                  <li key={regel.naam} className="stand__regel">
                    <span className="stand__plaats">{plaats + 1}</span>
                    <span className="stand__naam">{regel.naam}</span>
                    <span className="stand__punten">{regel.punten}</span>
                    <span className="stand__detail">
                      {regel.avonden} {regel.avonden === 1 ? 'avond' : 'avonden'}
                      {regel.overwinningen > 0 &&
                        `, ${regel.overwinningen}× gewonnen`}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="uitleg">
                De winnaar krijgt zoveel punten als er die avond spelers waren, de laatste één.
                Zo weegt een volle tafel zwaarder dan een tafel met z'n drieën.
              </p>
            </>
          )}
        </Panel>

        <Panel title="Vaste spelers">
          <p className="uitleg">
            Bij het opzetten van een toernooi tik je deze namen aan. Elke avond dezelfde
            schrijfwijze, dus telt het klassement ze bij elkaar op.
          </p>

          {spelers.length > 0 && (
            <ul className="vastelijst">
              {spelers.map((naam) => (
                <li key={naam} className="vastelijst__regel">
                  <span>{naam}</span>
                  <button
                    type="button"
                    className="vastelijst__weg"
                    aria-label={`${naam} uit de vaste lijst`}
                    onClick={() => setSpelers(spelers.filter((andere) => andere !== naam))}
                  >
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form
            className="vastelijst__toevoegen"
            onSubmit={(e) => {
              e.preventDefault()
              voegToe(nieuw)
            }}
          >
            <label className="veld">
              <span>Naam erbij</span>
              <input value={nieuw} onChange={(e) => setNieuw(e.target.value)} />
            </label>
            <Button type="submit" variant="ghost" disabled={nieuw.trim() === '' || bestaatAl(nieuw)}>
              Toevoegen
            </Button>
          </form>

          {/* Zonder deze regel doet de knop niets en zegt niets, en sta je naar
              een gevuld veld te kijken. */}
          {nieuw.trim() !== '' && bestaatAl(nieuw) && (
            <p className="uitleg">Die staat er al in.</p>
          )}

          {onbekend.length > 0 && (
            <>
              {/* De enige plek waar een tikfout in een naam zichtbaar wordt: in
                  het klassement zelf lijkt 'bram' gewoon een tweede speler.

                  "Erbij" is bedoeld voor een gast die vaker komt. Het repareert
                  een verkeerd geschreven naam níét — de al vastgelegde avonden
                  blijven op die schrijfwijze staan, dus de twee regels in de
                  stand blijven twee regels. Dat staat er met zoveel woorden bij,
                  want anders lijkt die knop een oplossing. */}
              <p className="uitleg">
                Deze namen hebben gespeeld maar staan niet in de lijst. Meestal een gast; soms
                een schrijfwijze die per ongeluk twee spelers van één persoon maakte. Erbij
                zetten helpt voor de vólgende avond — de stand hierboven blijft staan zoals hij
                staat.
              </p>
              <ul className="vastelijst vastelijst--onbekend">
                {onbekend.map((naam) => (
                  <li key={naam} className="vastelijst__regel">
                    <span>{naam}</span>
                    <button
                      type="button"
                      className="vastelijst__erbij"
                      onClick={() => voegToe(naam)}
                    >
                      erbij
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>

      <Button onClick={onClose}>Terug</Button>
    </div>
  )
}
