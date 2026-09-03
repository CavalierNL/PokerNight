import { useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { Panel } from '../components/Panel'
import { ChipIcon } from '../components/ChipIcon'
import { Kop } from '../components/Kop'
import { useAppState } from '../state/AppState'
import { prepareSetup, suggestStartingStack } from '../domain/setup'
import {
  kanColorUp,
  ladderHeeftZin,
  longestValueDigits,
  metInstellingen,
} from '../domain/chipset'
import { MultiChip } from '../components/MultiChip'
import { ColorUpRegel } from '../components/ColorUpRegel'
import { StructuurTabel } from '../components/StructuurTabel'
import { GetalVeld } from '../components/GetalVeld'
import { levelOpties, type StructureKind } from '../domain/blinds'
import type { Settings, Trigger } from '../domain/tournament'
import './SetupScreen.css'

// Acht genummerde spelers: een naam wegstrepen gaat sneller dan er een
// bijtypen. De afsluitende newline zet de cursor op een lege regel klaar.
const STANDAARD_NAMEN = Array.from({ length: 8 }, (_, i) => `Speler ${i + 1}`).join('\n') + '\n'

/**
 * De volgorde volgt hoe een avond werkelijk begint: eerst wat vastligt — wie er
 * zijn en welke doos er op tafel staat — dan hoeveel tijd je hebt, en pas daarna
 * wat daaruit volgt. De blindstructuur staat onderaan omdat je die leest en niet
 * invult.
 */
export function SetupScreen({
  onTerug,
  onGestart,
}: {
  onTerug: () => void
  onGestart: () => void
}) {
  const { chipsets, settings, start, storageOk } = useAppState()

  const [namenTekst, setNamenTekst] = useState(
    settings ? settings.playerNames.join('\n') : STANDAARD_NAMEN,
  )
  /**
   * Leeg betekent "nog niet zelf gekozen": dan volgt het veld het voorstel, en
   * schuift het mee zodra je spelers, doos, speelduur of levels aanpast.
   *
   * Het loslaten gebeurt bij een eigen bedrag, en ook zodra je aan de
   * blindstructuur zit — die staat onder de startstack en werkt erop terug, en
   * dan hoort het bedrag niet onder je handen vandaan te veranderen.
   *
   * Bij een opgeslagen opzet is niet vastgelegd óf het bedrag een eigen keuze
   * was. Daarom wordt het voorstel van toen opnieuw uitgerekend: stond dat erin,
   * dan was er niets gekozen en volgt het veld gewoon weer.
   */
  const [startingStack, setStartingStack] = useState<number | undefined>(() => {
    if (!settings) return undefined
    const doosVanToen = chipsets.find((c) => c.id === settings.chipsetId)
    if (!doosVanToen) return settings.startingStack

    const voorstelVanToen = suggestStartingStack(
      metInstellingen(doosVanToen, settings),
      Math.max(settings.playerNames.length, 1),
      {
        levels:
          settings.durationMinutes === undefined
            ? undefined
            : settings.durationMinutes / settings.levelMinutes,
        kind: settings.structure,
      },
    )
    return settings.startingStack === voorstelVanToen ? undefined : settings.startingStack
  })
  const [levelMinutes, setLevelMinutes] = useState(settings?.levelMinutes ?? 15)
  // Bestaat er geen opgeslagen instelling, dan begint een avond met een eindtijd.
  const [opTijd, setOpTijd] = useState(settings ? settings.durationMinutes !== undefined : true)
  const [duur, setDuur] = useState(settings?.durationMinutes ?? 90)
  const durationMinutes = opTijd ? duur : undefined
  const [structure, setStructure] = useState<StructureKind>(settings?.structure ?? 'ladder')
  const [trigger, setTrigger] = useState<Trigger>(settings?.trigger ?? 'both')
  const [colorUp, setColorUp] = useState(settings?.colorUp ?? true)
  const [huisregel, setHuisregel] = useState(settings?.houseRuleFiveColor !== undefined)
  const [vijfKleur, setVijfKleur] = useState(settings?.houseRuleFiveColor)
  const [chipsetId, setChipsetId] = useState(settings?.chipsetId ?? chipsets[0].id)
  const [shuffleSeats, setShuffleSeats] = useState(settings?.shuffleSeats === true)
  const [randomDealer, setRandomDealer] = useState(settings?.randomDealer === true)
  const [laatkomers, setLaatkomers] = useState<Settings['laatkomers']>(settings?.laatkomers)

  const doos = chipsets.find((c) => c.id === chipsetId) ?? chipsets[0]

  // Wisselen van doos maakt een eerder gekozen kleur ongeldig; dan valt de keuze
  // terug op de duurste chip, want die is aan tafel de logische "5".
  const kleuren = doos.chips.map((c) => c.color)
  const gekozenVijf =
    vijfKleur && kleuren.includes(vijfKleur)
      ? vijfKleur
      : [...doos.chips].sort((a, b) => b.value - a.value)[0]?.color
  const restKleuren = kleuren.filter((k) => k !== gekozenVijf)

  // Aflopend op aantal: de kleur waar je het meest van hebt staat vooraan, want
  // dat is de kleur waarmee je een avond lang kunt betalen.
  const naarAantal = [...doos.chips].sort((a, b) => b.count - a.count)

  // Alles onder deze regel rekent met de doos zoals hij vanavond geldt.
  const chipset = metInstellingen(doos, {
    houseRuleFiveColor: huisregel ? gekozenVijf : undefined,
  })
  // Eén lettergrootte voor alle chips van deze doos.
  const cijfers = longestValueDigits(chipset)
  // Met twee waardes hou je na een color-up één soort chip over; dan is er niets
  // meer te wisselen en heeft de keuze geen betekenis.
  const colorUpMogelijk = kanColorUp(chipset)

  // De 1-2-5 reeks alleen aanbieden waar hij iets oplevert. Staat hij nog uit een
  // eerdere avond ingesteld bij een doos waar dat niet zo is, dan valt hij terug
  // op verdubbelen — anders wijst het keuzeveld naar een optie die er niet staat.
  const ladderZinvol = ladderHeeftZin(chipset)
  const gekozenStructuur = !ladderZinvol && structure === 'ladder' ? 'doubling' : structure

  // Alleen lengtes die de duur precies vullen; de keuze is daarmee hoeveel
  // levels je speelt, en hun lengte volgt daaruit.
  const tijdOpties = useMemo(() => (opTijd ? levelOpties(duur) : []), [opTijd, duur])
  const gekozenLengte =
    opTijd && tijdOpties.length > 0
      ? (tijdOpties.find((o) => o.levelMinutes === levelMinutes) ?? tijdOpties[0]).levelMinutes
      : levelMinutes

  const spelerNamen = useMemo(
    () =>
      namenTekst
        .split('\n')
        .map((n) => n.trim())
        .filter(Boolean),
    [namenTekst],
  )

  // Het voorstel volgt uit de doos en het gezelschap. Zolang je zelf niets hebt
  // ingevuld staat het in het veld; typ je iets anders, dan blijft het als knop
  // staan en dringt het zich niet op.
  const voorstel = useMemo(
    () =>
      suggestStartingStack(chipset, Math.max(spelerNamen.length, 1), {
        levels: durationMinutes === undefined ? undefined : durationMinutes / gekozenLengte,
        kind: gekozenStructuur,
      }),
    [chipset, spelerNamen.length, durationMinutes, gekozenLengte, gekozenStructuur],
  )
  const gekozenStack = startingStack ?? voorstel ?? 100

  /** Legt het huidige bedrag vast voordat een keuze eronder het zou verschuiven. */
  const bevriesStack = () => {
    if (startingStack === undefined) setStartingStack(gekozenStack)
  }

  const huidigeSettings: Settings = useMemo(
    () => ({
      playerNames: spelerNamen,
      startingStack: gekozenStack,
      levelMinutes: gekozenLengte,
      durationMinutes,
      structure: gekozenStructuur,
      trigger,
      colorUp: colorUp && colorUpMogelijk,
      houseRuleFiveColor: huisregel ? gekozenVijf : undefined,
      chipsetId: chipset.id,
      shuffleSeats,
      randomDealer,
      laatkomers,
    }),
    [
      spelerNamen,
      gekozenStack,
      gekozenLengte,
      durationMinutes,
      gekozenStructuur,
      trigger,
      colorUp,
      colorUpMogelijk,
      huisregel,
      gekozenVijf,
      chipset,
      shuffleSeats,
      randomDealer,
      laatkomers,
    ],
  )

  const setup = useMemo(() => prepareSetup(huidigeSettings, chipset), [huidigeSettings, chipset])
  const { structure: structuur, distribution: verdeling, warnings, canStart } = setup
  // Het aantal chips, tegenover verdeling.stackValue dat de wáárde optelt.
  const aantalChips = verdeling.perPlayer.reduce((som, a) => som + a.count, 0)

  /**
   * De regels onder "Chips per speler". Met de huisregel zijn de kleuren binnen
   * één waarde onderling inwisselbaar — welke van de drie je pakt maakt niet uit
   * — dus daar hoort één regel met een chip in alle betrokken kleuren, en niet
   * een regel per kleur.
   */
  const chipRegels = useMemo(() => {
    if (!huisregel) {
      return verdeling.perPlayer.map((a) => ({
        sleutel: `${a.color}-${a.value}`,
        kleuren: [a.color],
        value: a.value,
        count: a.count,
      }))
    }
    const perWaarde = new Map<number, { kleuren: string[]; count: number }>()
    for (const a of verdeling.perPlayer) {
      const regel = perWaarde.get(a.value) ?? { kleuren: [], count: 0 }
      regel.kleuren.push(a.color)
      regel.count += a.count
      perWaarde.set(a.value, regel)
    }
    return [...perWaarde].map(([value, regel]) => ({
      sleutel: `waarde-${value}`,
      kleuren: regel.kleuren,
      value,
      count: regel.count,
    }))
  }, [huisregel, verdeling])

  return (
    <div className="setup">
      <Kop>PokerNight</Kop>

      {!storageOk && (
        <div className="melding melding--error">
          De opslag van je browser is vol of geblokkeerd. Instellingen en een lopend toernooi worden
          niet bewaard.
        </div>
      )}

      <div className="setup__raster">
        <Panel title="Spelers">
          <label className="veld">
            <span>Namen, één per regel</span>
            <textarea rows={8} value={namenTekst} onChange={(e) => setNamenTekst(e.target.value)} />
          </label>

          {/* Wat er bij de start geloot wordt, staat bij wie er meedoen. */}
          <label className="veld veld--schakelaar">
            <input
              type="checkbox"
              checked={shuffleSeats}
              onChange={(e) => setShuffleSeats(e.target.checked)}
            />
            <span>Loot de zitplaatsen</span>
          </label>
          <label className="veld veld--schakelaar">
            <input
              type="checkbox"
              checked={randomDealer}
              onChange={(e) => setRandomDealer(e.target.checked)}
            />
            <span>Loot wie de eerste hand deelt</span>
          </label>

          <label className="veld veld--schakelaar">
            <input
              type="checkbox"
              checked={laatkomers !== undefined}
              onChange={(e) => setLaatkomers(e.target.checked ? 'startstack' : undefined)}
            />
            <span>Laatkomers mogen instappen</span>
          </label>
          {laatkomers !== undefined && (
            <label className="veld">
              <span>Waarmee ze instappen</span>
              <select
                value={laatkomers}
                onChange={(e) => setLaatkomers(e.target.value as Settings['laatkomers'])}
              >
                <option value="startstack">Met de startstack</option>
                <option value="gemiddelde">Met de gemiddelde stack van dat moment</option>
              </select>
            </label>
          )}
        </Panel>

        <Panel title="Pokerdoos">
          <label className="veld">
            <span>Welke doos</span>
            <select value={chipsetId} onChange={(e) => setChipsetId(e.target.value)}>
              {chipsets.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="veld veld--schakelaar">
            <input
              type="checkbox"
              checked={huisregel}
              onChange={(e) => setHuisregel(e.target.checked)}
            />
            <span>Huisregel: één kleur is 5, de rest is 1</span>
          </label>

          {huisregel && (
            <div className="huisregel">
              <div className="huisregel__keuze">
                <span className="huisregel__label">Welke kleur is 5</span>
                <div className="huisregel__kleuren">
                  {naarAantal.map((chip) => (
                    <button
                      key={chip.color}
                      type="button"
                      className={`huisregel__kleur${
                        chip.color === gekozenVijf ? ' huisregel__kleur--gekozen' : ''
                      }`}
                      aria-label={`${chip.count} chips van deze kleur zijn 5 waard`}
                      aria-pressed={chip.color === gekozenVijf}
                      onClick={() => setVijfKleur(chip.color)}
                    >
                      <span className="huisregel__vlak" style={{ background: chip.color }} />
                      <span className="huisregel__aantal">{chip.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="huisregel__uitkomst">
                <ChipIcon color={gekozenVijf} value={5} size={38} digits={1} />
                <span className="uitleg">en de rest is</span>
                <MultiChip colors={restKleuren} value={1} size={38} digits={1} />
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="setup__raster">
        <Panel title="Tijd">
          <label className="veld">
            <span>Wanneer het klaar is</span>
            <select value={opTijd ? 'tijd' : 'lms'} onChange={(e) => setOpTijd(e.target.value === 'tijd')}>
              <option value="tijd">Aan het einde van de speelduur</option>
              <option value="lms">Last man standing</option>
            </select>
          </label>

          {opTijd ? (
            <>
              <GetalVeld label="Speelduur (minuten)" min={15} step={15} value={duur} onValue={setDuur} />

              {tijdOpties.length > 0 ? (
                <label className="veld">
                  <span>Aantal levels</span>
                  <select
                    value={gekozenLengte}
                    onChange={(e) => setLevelMinutes(Number(e.target.value))}
                  >
                    {tijdOpties.map((optie) => (
                      <option key={optie.levelMinutes} value={optie.levelMinutes}>
                        {optie.levels} levels van {optie.levelMinutes} minuten
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="uitleg">
                  {duur} minuten valt niet in gelijke levels te verdelen. Kies een speelduur die
                  deelbaar is, bijvoorbeeld 90 of 120.
                </p>
              )}
            </>
          ) : (
            <>
              <label className="veld">
                <span>Levellengte</span>
                <select
                  value={levelMinutes}
                  onChange={(e) => setLevelMinutes(Number(e.target.value))}
                >
                  {[10, 15, 20, 30].map((m) => (
                    <option key={m} value={m}>
                      {m} minuten
                    </option>
                  ))}
                </select>
              </label>
              <p className="uitleg">
                Er wordt gespeeld tot er één speler over is. De blindstructuur loopt door tot de
                blinds de stapels voorbij zijn.
              </p>
            </>
          )}
        </Panel>

        <Panel title="Startstack">
          {voorstel === undefined ? (
            <p className="uitleg">
              Deze doos kan met {spelerNamen.length} spelers geen bruikbare stack uitdelen.
            </p>
          ) : (
            <div className="voorstel">
              <p className="uitleg voorstel__tekst">
                Voorstel voor deze doos met {spelerNamen.length} spelers: <strong>{voorstel}</strong>{' '}
                per speler.
              </p>
              {/* Goud zolang hij iets te doen heeft; staat het voorstel er al,
                  dan is er niets over te nemen en valt hij terug in de rij. */}
              <Button
                variant={gekozenStack === voorstel ? 'ghost' : 'primary'}
                disabled={gekozenStack === voorstel}
                onClick={() => setStartingStack(voorstel)}
              >
                Overnemen
              </Button>
            </div>
          )}

          <GetalVeld
            label="Startstack (chips)"
            min={1}
            value={gekozenStack}
            onValue={setStartingStack}
          />
        </Panel>
      </div>

      <Panel title="Chips per speler">
        <div className="chips-per-speler">
          {chipRegels.map((regel) => (
            <div key={regel.sleutel} className="fiche-regel">
              <span className="fiche-regel__aantal">{regel.count}×</span>
              {regel.kleuren.length === 1 ? (
                <ChipIcon color={regel.kleuren[0]} value={regel.value} digits={cijfers} />
              ) : (
                <MultiChip colors={regel.kleuren} value={regel.value} digits={cijfers} />
              )}
            </div>
          ))}
        </div>
        <p className="uitleg">
          {aantalChips} chips, samen {verdeling.stackValue} waard.
        </p>
      </Panel>

      <Panel title="Blindstructuur">
        <div className="setup__raster setup__raster--smal">
          <label className="veld">
            <span>Hoe de blinds groeien</span>
            <select
              value={gekozenStructuur}
              onChange={(e) => {
                bevriesStack()
                setStructure(e.target.value as StructureKind)
              }}
            >
              {ladderZinvol && <option value="ladder">1-2-5, daarna verdubbelen</option>}
              <option value="doubling">Verdubbelen per level</option>
              <option value="calculated">Berekend, vloeiend oplopend</option>
            </select>
          </label>
          <label className="veld">
            <span>Wanneer ze omhoog gaan</span>
            <select
              value={trigger}
              onChange={(e) => {
                bevriesStack()
                setTrigger(e.target.value as Trigger)
              }}
            >
              <option value="both">Op de klok én als iemand eruit gaat</option>
              <option value="time">Alleen op de klok</option>
              <option value="elimination">Alleen als iemand eruit gaat</option>
            </select>
          </label>
        </div>

        {/* Met de huisregel zijn er maar twee waardes; dan valt er niets te kiezen. */}
        {!huisregel && (
          <label className="veld veld--schakelaar">
            <input
              type="checkbox"
              checked={colorUp && colorUpMogelijk}
              disabled={!colorUpMogelijk}
              onChange={(e) => setColorUp(e.target.checked)}
            />
            <span>Color-up: de kleinste kleur gaat onderweg uit het spel</span>
          </label>
        )}

        <StructuurTabel levels={structuur.levels} levelMinutes={gekozenLengte} />

        {structuur.colorUps.map((moment) => (
          <ColorUpRegel
            key={moment.levelIndex}
            label={`Level ${moment.levelIndex + 1}:`}
            colorUp={moment}
            digits={cijfers}
          />
        ))}
      </Panel>

      {warnings.map((melding, i) => (
        <div key={i} className={`melding melding--${melding.level}`}>
          {melding.message}
        </div>
      ))}

      <div className="knoppenrij">
        <Button
          disabled={!canStart}
          onClick={() => {
            start(huidigeSettings, chipset)
            onGestart()
          }}
        >
          Start het toernooi
        </Button>
        <Button variant="ghost" onClick={onTerug}>
          Terug
        </Button>
      </div>
    </div>
  )
}
