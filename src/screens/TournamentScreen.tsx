import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { useNow } from '../hooks/useNow'
import { useWakeLock } from '../hooks/useWakeLock'
import { useLevelSound } from '../hooks/useLevelSound'
import { useAppState } from '../state/AppState'
import { ChipIcon } from '../components/ChipIcon'
import { PlayingCard, SESSIE_HAND } from '../components/PlayingCard'
import {
  averageStackInBigBlinds,
  colorUpAt,
  currentLevel,
  expectedEndAt,
  nextLevel,
  playersLeft,
  remainingMs,
} from '../domain/tournament'
import './TournamentScreen.css'

function formatteerTijd(ms: number): string {
  const totaal = Math.max(0, Math.ceil(ms / 1000))
  const minuten = Math.floor(totaal / 60)
  return `${minuten}:${String(totaal % 60).padStart(2, '0')}`
}

function klokTijd(ms: number): string {
  return new Date(ms).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

export function TournamentScreen() {
  const { tournament, dispatch, discard, preferences, storageOk } = useAppState()
  const [stopBevestigen, setStopBevestigen] = useState(false)
  const now = useNow()

  const gepauzeerd = tournament?.clock.state === 'paused'
  useWakeLock(preferences.wakeLock && tournament !== null && !gepauzeerd)
  useLevelSound(tournament?.levelIndex ?? 0, preferences.sound)

  // De reducer beslist zelf of er iets moet gebeuren; hier wordt alleen de tijd
  // doorgegeven.
  useEffect(() => {
    dispatch({ type: 'tick', now })
  }, [now, dispatch])

  const level = tournament ? currentLevel(tournament) : undefined
  if (!tournament || !level) return null

  const volgende = nextLevel(tournament)
  const colorUp = colorUpAt(tournament, tournament.levelIndex)
  const telAfOpTijd = tournament.settings.trigger !== 'elimination'
  const eindtijd = expectedEndAt(tournament, now)

  // Bij de trigger "alleen eliminatie" gebeurt er niets als de tijd om is, dus
  // toont de klok de verstreken toernooitijd in plaats van een aftelling.
  // Tijdens een pauze staat hij stil.
  const peilmoment = tournament.clock.state === 'paused' ? tournament.clock.pausedAt : now
  const verstreken = peilmoment - tournament.startedAt - tournament.pausedMs

  return (
    <>
      <div className={`tafel${gepauzeerd ? ' tafel--gepauzeerd' : ''}`}>
        {!storageOk && (
          <div className="melding melding--error">
            Dit toernooi wordt niet opgeslagen — de opslag van je browser is vol of geblokkeerd.
            Ververs deze pagina niet.
          </div>
        )}

        <div className="tafel__balk">
          <span>
            Level {tournament.levelIndex + 1} · {playersLeft(tournament)} spelers
          </span>
        </div>

        <div className="tafel__midden">
          <div className="tafel__klok">
            {formatteerTijd(telAfOpTijd ? remainingMs(tournament, now) : verstreken)}
          </div>
          <div className="tafel__blinds">
            <span className="tafel__blind">
              <span className="tafel__blind-label">Small</span>
              <span className="tafel__blind-waarde">{level.smallBlind}</span>
            </span>
            <span className="tafel__blind">
              <span className="tafel__blind-label">Big</span>
              <span className="tafel__blind-waarde">{level.bigBlind}</span>
            </span>
          </div>
          <div className="tafel__onder">
            {volgende ? `volgende ${volgende.smallBlind} / ${volgende.bigBlind}` : 'laatste level'}
            {' · gemiddelde stack '}
            {averageStackInBigBlinds(tournament).toFixed(1)} BB
            {eindtijd !== undefined && ` · klaar rond ${klokTijd(eindtijd)}`}
          </div>
          {colorUp && (
            <div className="tafel__colorup">
              Color-up: haal
              {colorUp.retiredColors.map((kleur) => (
                <ChipIcon key={kleur} color={kleur} value={colorUp.retiredValue} size={26} />
              ))}
              uit het spel en wissel naar
              {colorUp.nextColors.map((kleur) => (
                <ChipIcon key={kleur} color={kleur} value={colorUp.nextValue} size={26} />
              ))}
            </div>
          )}
        </div>

        <div className="tafel__voet">
          <div className="tafel__spelers">
            {tournament.players.map((speler, index) => (
              <button
                key={speler.name + index}
                className={`speler${speler.out ? ' speler--uit' : ''}`}
                disabled={speler.out || gepauzeerd}
                onClick={() => dispatch({ type: 'playerOut', index, now: Date.now() })}
              >
                {speler.name}
              </button>
            ))}
          </div>
          <div className="tafel__knoppen">
            <Button
              variant="ghost"
              disabled={gepauzeerd}
              onClick={() => dispatch({ type: 'undo', now: Date.now() })}
            >
              Ongedaan maken
            </Button>
            {stopBevestigen ? (
              <>
                <Button variant="danger" onClick={discard}>
                  Ja, stop het toernooi
                </Button>
                <Button variant="ghost" onClick={() => setStopBevestigen(false)}>
                  Nee
                </Button>
              </>
            ) : (
              // Stoppen is het enige wat niet terug te draaien is, en de knop
              // staat naast een pauzeknop die je zonder kijken moet kunnen raken.
              <Button variant="ghost" disabled={gepauzeerd} onClick={() => setStopBevestigen(true)}>
                Stoppen
              </Button>
            )}
            <Button
              className="tafel__pauzeknop"
              onClick={() => dispatch({ type: 'togglePause', now: Date.now() })}
            >
              {gepauzeerd ? 'Hervatten' : 'Pauze'}
            </Button>
          </div>
        </div>
      </div>
      {gepauzeerd && (
        <div className="pauze-overlay">
          <div className="pauze-overlay__kaarten">
            <PlayingCard kaart={SESSIE_HAND[0]} className="pauze-kaart pauze-kaart--een" />
            <PlayingCard kaart={SESSIE_HAND[1]} className="pauze-kaart pauze-kaart--twee" />
          </div>
          <span className="pauze-overlay__tekst">GEPAUZEERD</span>
        </div>
      )}
    </>
  )
}
