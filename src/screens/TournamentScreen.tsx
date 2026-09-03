import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../components/Button'
import { useNow } from '../hooks/useNow'
import { useWakeLock } from '../hooks/useWakeLock'
import { useLevelSound } from '../hooks/useLevelSound'
import { useEindeWaarschuwing, waarschuwingsGrensMs } from '../hooks/useEindeWaarschuwing'
import { useAppState } from '../state/AppState'
import { ColorUpRegel } from '../components/ColorUpRegel'
import { StructuurTabel } from '../components/StructuurTabel'
import { HandenVenster } from '../components/HandenVenster'
import { SoundIcon } from '../components/SoundIcon'
import { CardBack } from '../components/PlayingCard'
import { roundToPayable } from '../domain/amounts'
import { prepareSetup } from '../domain/setup'
import type { Chipset } from '../domain/chipset'
import {
  afgevallen,
  averageStack,
  averageStackInBigBlinds,
  colorUpAt,
  currentLevel,
  expectedEndAt,
  isAfgelopen,
  laatkomerStack,
  nextLevel,
  nogInHetSpel,
  playersLeft,
  remainingMs,
  speelduurMs,
  uitslag,
  winnaar,
  type Tournament,
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

/** Hoe lang er gespeeld is, in gewone woorden: dit staat op het eindscherm. */
function formatteerDuur(ms: number): string {
  const minuten = Math.round(ms / 60_000)
  if (minuten === 0) return 'minder dan een minuut'
  const uren = Math.floor(minuten / 60)
  const rest = minuten % 60
  const inMinuten = `${rest} ${rest === 1 ? 'minuut' : 'minuten'}`
  if (uren === 0) return inMinuten
  const inUren = `${uren} uur`
  return rest === 0 ? inUren : `${inUren} en ${inMinuten}`
}

export function TournamentScreen() {
  const { tournament, dispatch, discard, preferences, chipsets, storageOk } = useAppState()
  const [stopBevestigen, setStopBevestigen] = useState(false)
  const [schemaOpen, setSchemaOpen] = useState(false)
  const [laatkomerOpen, setLaatkomerOpen] = useState(false)
  const [handenOpen, setHandenOpen] = useState(false)
  // Het level waarvoor iemand het geluid heeft stilgezet. Bewaard als index en
  // niet als vlag, zodat het volgende level vanzelf weer geluid geeft zonder dat
  // er ergens een reset hoeft te staan die vergeten kan worden.
  const [stilVoorLevel, setStilVoorLevel] = useState<number | null>(null)
  const now = useNow()

  const wachtOpLevel = tournament?.wachtOpLevel === true
  // Wachten op een bevestiging is geen pauze: het scherm dat erbij hoort is een
  // ander, en de knoppen eronder horen niet te reageren.
  const gepauzeerd = tournament?.clock.state === 'paused' && !wachtOpLevel
  const stil = tournament !== null && stilVoorLevel === tournament.levelIndex
  useWakeLock(preferences.wakeLock && tournament !== null && !gepauzeerd)
  // Niet op het openingsscherm: daar is het levelscherm de uitslag van de
  // loting, iedereen kijkt al mee en een gong is dan alleen maar hard.
  const eersteScherm = tournament?.levelIndex === 0
  useLevelSound(wachtOpLevel && !eersteScherm, preferences.sound && !stil)

  // Alleen zinvol als de klok afloopt: bij "alleen eliminatie" telt hij op en is
  // er geen minuut om te waarschuwen.
  const telAfOpTijd = tournament !== null && tournament.settings.trigger !== 'elimination'
  const resterend = tournament ? remainingMs(tournament, now) : 0
  const waarschuwingsGrens = waarschuwingsGrensMs(tournament?.settings.levelMinutes ?? 15)
  useEindeWaarschuwing(
    resterend,
    waarschuwingsGrens,
    preferences.sound && telAfOpTijd && tournament?.clock.state === 'running',
    tournament?.levelIndex ?? 0,
  )

  // De reducer beslist zelf of er iets moet gebeuren; hier wordt alleen de tijd
  // doorgegeven.
  useEffect(() => {
    dispatch({ type: 'tick', now })
  }, [now, dispatch])

  const level = tournament ? currentLevel(tournament) : undefined
  if (!tournament || !level) return null

  const volgende = nextLevel(tournament)
  const afgelopen = isAfgelopen(tournament)
  const gewonnenDoor = winnaar(tournament)
  const { laatkomers } = tournament.settings
  const colorUp = colorUpAt(tournament, tournament.levelIndex)
  const eindtijd = expectedEndAt(tournament, now)
  const bijnaOm = telAfOpTijd && resterend <= waarschuwingsGrens

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
          {/*
            De levelknoppen staan bij het levelnummer en niet bij de grote
            knoppen onderaan: ze horen bij wat ze verzetten, en ze horen klein te
            zijn — je gebruikt ze zelden en een misgreep verzet de blinds.
          */}
          <span className="tafel__level">
            <button
              className="tafel__levelknop"
              aria-label="Een level terug"
              disabled={tournament.levelIndex === 0 || gepauzeerd}
              onClick={() => dispatch({ type: 'levelTerug', now: Date.now() })}
            >
              ‹
            </button>
            Level {tournament.levelIndex + 1}
            <button
              className="tafel__levelknop"
              aria-label="Een level vooruit"
              disabled={volgende === undefined || gepauzeerd}
              onClick={() => dispatch({ type: 'advanceLevel', now: Date.now() })}
            >
              ›
            </button>
          </span>
          <span>{playersLeft(tournament)} spelers</span>
          {/*
            In de balk en niet bij het schema onder de klok: het zijn twee
            dingen die je om heel verschillende redenen opzoekt, en naast
            elkaar tik je de verkeerde.
          */}
          <button className="tafel__balklink" onClick={() => setHandenOpen(true)}>
            Wat wint?
          </button>
        </div>

        <div className="tafel__midden">
          <div className={`tafel__klok${bijnaOm ? ' tafel__klok--bijna' : ''}`}>
            {formatteerTijd(telAfOpTijd ? resterend : verstreken)}
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
            <span>
              {volgende
                ? `Volgende blinds ${volgende.smallBlind} / ${volgende.bigBlind}`
                : 'Laatste level'}
            </span>
            <span>
              Gemiddelde stack {Math.round(averageStackInBigBlinds(tournament))} BB, ±{' '}
              {roundToPayable(averageStack(tournament), tournament.kleinsteChip ?? 1)} chips
            </span>
            {eindtijd !== undefined && <span>Klaar rond {klokTijd(eindtijd)}</span>}
            {/*
              Als link en niet als knop tussen de andere: opzoekwerk hoort niet
              even zwaar te wegen als pauzeren of iemand aftikken, en in portrait
              duwde een vierde knop de rest van de rij van het scherm af.
            */}
            <button
              className="tafel__schemalink"
              disabled={gepauzeerd}
              onClick={() => setSchemaOpen(true)}
            >
              Hele schema
            </button>
          </div>
          {colorUp && <ColorUpRegel label="Color-up:" colorUp={colorUp} />}
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
            {laatkomers !== undefined && !afgelopen && (
              <button
                className="speler speler--erbij"
                disabled={gepauzeerd}
                onClick={() => setLaatkomerOpen(true)}
              >
                + speler
              </button>
            )}
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
            {/* Hervatten gaat via het pauzescherm zelf; deze knop pauzeert alleen. */}
            <Button
              className="tafel__pauzeknop"
              disabled={gepauzeerd}
              onClick={() => dispatch({ type: 'togglePause', now: Date.now() })}
            >
              Pauze
            </Button>
          </div>
        </div>
      </div>
      {gepauzeerd && !afgelopen && (
        // Het hele scherm is de knop: tijdens een pauze hoef je niet te mikken.
        <button
          type="button"
          className="pauze-overlay"
          aria-label="Hervatten"
          onClick={() => dispatch({ type: 'togglePause', now: Date.now() })}
        >
          <span className="pauze-overlay__kaarten">
            {/* Met de rug omhoog: tijdens een pauze laat je je kaarten niet zien. */}
            <CardBack className="pauze-kaart pauze-kaart--een" />
            <CardBack className="pauze-kaart pauze-kaart--twee" />
          </span>
          <span className="pauze-overlay__tekst">GEPAUZEERD</span>
          <span className="pauze-overlay__hint">tik om verder te gaan</span>
        </button>
      )}

      {wachtOpLevel && (
        <div className="levelscherm">
          <div className="levelscherm__kaart">
            <span className="levelscherm__kop">Level {tournament.levelIndex + 1}</span>
            <div className="levelscherm__blinds">
              <span className="tafel__blind">
                <span className="tafel__blind-label">Small</span>
                <span className="tafel__blind-waarde">{level.smallBlind}</span>
              </span>
              <span className="tafel__blind">
                <span className="tafel__blind-label">Big</span>
                <span className="tafel__blind-waarde">{level.bigBlind}</span>
              </span>
            </div>

            {colorUp && <ColorUpRegel label="Color-up:" colorUp={colorUp} />}

            {/*
              De tafelindeling hoort bij de eerste hand en nergens anders:
              daarna zit iedereen en heeft de knop de tafel al rond gehad. Wie
              er niets om geeft, drukt gewoon op Start.
            */}
            {tournament.levelIndex === 0 && (
              <div className="loting">
                {/*
                  De dealer volgt uit de indeling in plaats van apart aangewezen
                  te worden. Een label achter de naam paste niet naast een lange
                  voornaam, en de volgorde is toch al willekeurig.
                */}
                <p className="loting__uitleg">Plaats 1 deelt de eerste hand</p>
                <ol className="loting__plaatsen">
                  {tournament.players.map((speler, i) => (
                    <li key={speler.name + i} className={i === 0 ? 'loting__eerste' : undefined}>
                      {speler.name}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="levelscherm__knoppen">
              {/*
                Dit scherm houdt de klok stil tot iemand hem vrijgeeft, en is
                daarmee ook de pauze: laat het staan en er wordt niet gespeeld.
                Alleen het geluid hoort daar niet een kwartier bij door te gaan.
              */}
              {preferences.sound && !eersteScherm && (
                <Button
                  variant="ghost"
                  aria-pressed={stil}
                  onClick={() => setStilVoorLevel(stil ? null : tournament.levelIndex)}
                >
                  <SoundIcon gedempt={stil} />
                  {stil ? 'Geluid aan' : 'Geluid uit'}
                </Button>
              )}
              <Button onClick={() => dispatch({ type: 'bevestigLevel', now: Date.now() })}>
                Start
              </Button>
            </div>
          </div>
        </div>
      )}

      {handenOpen && <HandenVenster onSluiten={() => setHandenOpen(false)} />}

      {schemaOpen && (
        <SchemaVenster tournament={tournament} onSluiten={() => setSchemaOpen(false)} />
      )}

      {laatkomerOpen && (
        <LaatkomerVenster
          tournament={tournament}
          chipset={chipsets.find((c) => c.id === tournament.settings.chipsetId)}
          onErbij={(name) => {
            dispatch({ type: 'spelerErbij', name, now: Date.now() })
            setLaatkomerOpen(false)
          }}
          onSluiten={() => setLaatkomerOpen(false)}
        />
      )}

      {afgelopen && (
        <div className="levelscherm">
          <div className="levelscherm__kaart eindscherm">
            {/*
              Twee manieren om te eindigen. Is er één over, dan is dat de
              winnaar. Loopt de speelduur af terwijl er nog meerderen zitten,
              dan is er geen winnaar: zonder de stacks te tellen valt niet te
              zeggen wie voorstaat, en dat verzint de app niet.
            */}
            {gewonnenDoor !== undefined ? (
              <>
                <span className="levelscherm__kop">Afgelopen</span>
                <span className="eindscherm__winnaar">{gewonnenDoor.name}</span>
                <span className="eindscherm__duur">
                  wint na {formatteerDuur(speelduurMs(tournament, now))} spelen
                </span>
                {/* Genummerd van boven af: de winnaar is nummer één. */}
                <ol className="eindscherm__uitslag">
                  {uitslag(tournament).map((speler, i) => (
                    <li key={speler.name + i}>{speler.name}</li>
                  ))}
                </ol>
              </>
            ) : (
              <>
                <span className="levelscherm__kop">De speelduur is om</span>
                <span className="eindscherm__winnaar eindscherm__winnaar--samen">
                  {nogInHetSpel(tournament)
                    .map((p) => p.name)
                    .join(', ')}
                </span>
                <span className="eindscherm__duur">
                  staan er na {formatteerDuur(speelduurMs(tournament, now))} nog; de meeste chips
                  wint
                </span>
                {/* Doorgenummerd vanaf wie er nog zitten: dit zijn de plaatsen eronder. */}
                <ol className="eindscherm__uitslag" start={nogInHetSpel(tournament).length + 1}>
                  {afgevallen(tournament).map((speler, i) => (
                    <li key={speler.name + i}>{speler.name}</li>
                  ))}
                </ol>
              </>
            )}
            <div className="levelscherm__knoppen">
              {/* Voor als de verkeerde is afgetikt: dan is het toernooi nog bezig. */}
              <Button variant="ghost" onClick={() => dispatch({ type: 'undo', now: Date.now() })}>
                Ongedaan maken
              </Button>
              <Button onClick={discard}>Klaar</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Iemand die later binnenkomt. Toont waarmee hij instapt, want dat is de vraag
 * die aan tafel gesteld wordt, en waarschuwt als de doos er geen stack meer bij
 * heeft: chips die er niet zijn kun je niet uitdelen, hoe graag je ook wilt.
 */
function LaatkomerVenster({
  tournament,
  chipset,
  onErbij,
  onSluiten,
}: {
  tournament: Tournament
  chipset: Chipset | undefined
  onErbij: (name: string) => void
  onSluiten: () => void
}) {
  const [naam, setNaam] = useState(`Speler ${tournament.players.length + 1}`)
  const stack = laatkomerStack(tournament)

  // Dezelfde berekening als bij de opzet, maar met één speler erbij. Wat daar
  // een blokkerende melding is, is hier de mededeling dat de doos leeg is.
  const doosHeeftRuimte = useMemo(() => {
    if (!chipset) return true
    const namen = [...tournament.players.map((p) => p.name), naam]
    const opzet = prepareSetup({ ...tournament.settings, playerNames: namen }, chipset)
    return !opzet.warnings.some((w) => w.level === 'error')
  }, [chipset, tournament.players, tournament.settings, naam])

  return (
    <div className="levelscherm">
      <button
        type="button"
        className="schema__achtergrond"
        aria-label="Sluiten"
        onClick={onSluiten}
      />
      <form
        className="levelscherm__kaart schema"
        onSubmit={(e) => {
          e.preventDefault()
          onErbij(naam)
        }}
      >
        <span className="levelscherm__kop">Speler erbij</span>
        <label className="veld">
          <span>Naam</span>
          <input autoFocus value={naam} onChange={(e) => setNaam(e.target.value)} />
        </label>
        <p className="uitleg">
          Stapt in met {stack} chips
          {tournament.settings.laatkomers === 'gemiddelde'
            ? ' — de gemiddelde stack van dit moment.'
            : ' — de startstack.'}
        </p>
        {!doosHeeftRuimte && (
          <div className="melding melding--warning">
            De doos heeft niet genoeg chips voor er nog een stack bij. Je zult moeten wisselen.
          </div>
        )}
        <div className="levelscherm__knoppen">
          <Button type="button" variant="ghost" onClick={onSluiten}>
            Annuleren
          </Button>
          <Button type="submit" disabled={naam.trim() === ''}>
            Erbij
          </Button>
        </div>
      </form>
    </div>
  )
}

/**
 * Het hele schema, opgezocht tijdens het spelen. Een eigen component omdat het
 * bij openen naar het huidige level moet springen: bij veertig levels is
 * scrollen naar waar je bent precies het werk dat je niet aan tafel wilt doen.
 */
function SchemaVenster({
  tournament,
  onSluiten,
}: {
  tournament: Tournament
  onSluiten: () => void
}) {
  const lijst = useRef<HTMLDivElement>(null)

  useEffect(() => {
    lijst.current?.querySelector('.structuur__nu')?.scrollIntoView({ block: 'center' })
  }, [])

  return (
    <div className="levelscherm">
      <button type="button" className="schema__achtergrond" aria-label="Sluiten" onClick={onSluiten} />
      <div className="levelscherm__kaart schema">
        <span className="levelscherm__kop">Blindstructuur</span>
        <div className="schema__lijst" ref={lijst}>
          <StructuurTabel
            levels={tournament.levels}
            levelMinutes={tournament.settings.levelMinutes}
            huidigLevel={tournament.levelIndex}
          />
        </div>
        {tournament.colorUps.map((moment) => (
          <ColorUpRegel
            key={moment.levelIndex}
            label={`Level ${moment.levelIndex + 1}:`}
            colorUp={moment}
          />
        ))}
        <Button onClick={onSluiten}>Sluiten</Button>
      </div>
    </div>
  )
}
