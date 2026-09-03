import { useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { Panel } from '../components/Panel'
import { ChipIcon } from '../components/ChipIcon'
import { Kop } from '../components/Kop'
import { useAppState } from '../state/AppState'
import { prepareSetup, suggestStartingStack } from '../domain/setup'
import { kanColorUp, longestValueDigits, metInstellingen } from '../domain/chipset'
import { MultiChip } from '../components/MultiChip'
import type { StructureKind } from '../domain/blinds'
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
  // Leeg betekent "nog niet zelf gekozen"; dan geldt het voorstel hieronder.
  const [startingStack, setStartingStack] = useState<number | undefined>(settings?.startingStack)
  const [levelMinutes, setLevelMinutes] = useState(settings?.levelMinutes ?? 15)
  const [durationMinutes, setDurationMinutes] = useState(settings?.durationMinutes ?? 90)
  const [structure, setStructure] = useState<StructureKind>(settings?.structure ?? 'ladder')
  const [trigger, setTrigger] = useState<Trigger>(settings?.trigger ?? 'both')
  const [colorUp, setColorUp] = useState(settings?.colorUp ?? true)
  const [huisregel, setHuisregel] = useState(settings?.houseRuleFiveColor !== undefined)
  const [vijfKleur, setVijfKleur] = useState(settings?.houseRuleFiveColor)
  const [chipsetId, setChipsetId] = useState(settings?.chipsetId ?? chipsets[0].id)

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
    () => suggestStartingStack(chipset, Math.max(spelerNamen.length, 1)),
    [chipset, spelerNamen.length],
  )
  const gekozenStack = startingStack ?? voorstel ?? 100

  const huidigeSettings: Settings = useMemo(
    () => ({
      playerNames: spelerNamen,
      startingStack: gekozenStack,
      levelMinutes,
      durationMinutes,
      structure,
      trigger,
      colorUp: colorUp && colorUpMogelijk,
      houseRuleFiveColor: huisregel ? gekozenVijf : undefined,
      chipsetId: chipset.id,
    }),
    [
      spelerNamen,
      gekozenStack,
      levelMinutes,
      durationMinutes,
      structure,
      trigger,
      colorUp,
      colorUpMogelijk,
      huisregel,
      gekozenVijf,
      chipset,
    ],
  )

  const setup = useMemo(() => prepareSetup(huidigeSettings, chipset), [huidigeSettings, chipset])
  const { structure: structuur, distribution: verdeling, warnings, canStart } = setup
  // Het aantal chips, tegenover verdeling.stackValue dat de wáárde optelt.
  const aantalChips = verdeling.perPlayer.reduce((som, a) => som + a.count, 0)

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
            <textarea rows={10} value={namenTekst} onChange={(e) => setNamenTekst(e.target.value)} />
          </label>
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
            <span>Duur (minuten)</span>
            <input
              type="number"
              min={15}
              step={15}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
            />
          </label>
          <label className="veld">
            <span>Levellengte</span>
            <select value={levelMinutes} onChange={(e) => setLevelMinutes(Number(e.target.value))}>
              {[10, 15, 20].map((m) => (
                <option key={m} value={m}>
                  {m} minuten
                </option>
              ))}
            </select>
          </label>
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
              <Button
                variant="ghost"
                disabled={gekozenStack === voorstel}
                onClick={() => setStartingStack(voorstel)}
              >
                Overnemen
              </Button>
            </div>
          )}

          <label className="veld">
            <span>Startstack (chips)</span>
            <input
              type="number"
              min={1}
              value={gekozenStack}
              onChange={(e) => setStartingStack(Number(e.target.value))}
            />
          </label>
        </Panel>
      </div>

      <Panel title="Chips per speler">
        <div className="chips-per-speler">
          {verdeling.perPlayer.map((allocatie) => (
            <div key={`${allocatie.color}-${allocatie.value}`} className="fiche-regel">
              <span className="fiche-regel__aantal">{allocatie.count}×</span>
              <ChipIcon color={allocatie.color} value={allocatie.value} digits={cijfers} />
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
              value={structure}
              onChange={(e) => setStructure(e.target.value as StructureKind)}
            >
              <option value="ladder">1-2-5, makkelijk te leggen</option>
              <option value="doubling">Verdubbelen per level</option>
              <option value="calculated">Berekend, vloeiend oplopend</option>
            </select>
          </label>
          <label className="veld">
            <span>Wanneer ze omhoog gaan</span>
            <select value={trigger} onChange={(e) => setTrigger(e.target.value as Trigger)}>
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

        <table className="structuur">
          <thead>
            <tr>
              <th>Level</th>
              <th>Blinds</th>
              <th>Vanaf</th>
            </tr>
          </thead>
          <tbody>
            {structuur.levels.map((level) => (
              <tr key={level.index}>
                <td>{level.index + 1}</td>
                <td>
                  {level.smallBlind} / {level.bigBlind}
                </td>
                <td>{level.index * levelMinutes} min</td>
              </tr>
            ))}
          </tbody>
        </table>

        {structuur.colorUps.map((moment) => (
          <p key={moment.levelIndex} className="uitleg uitleg--fiches">
            Vanaf level {moment.levelIndex + 1}:
            {moment.retiredColors.map((kleur) => (
              <ChipIcon
                key={kleur}
                color={kleur}
                value={moment.retiredValue}
                size={26}
                digits={cijfers}
              />
            ))}
            uit het spel, wisselen naar
            {moment.nextColors.map((kleur) => (
              <ChipIcon
                key={kleur}
                color={kleur}
                value={moment.nextValue}
                size={26}
                digits={cijfers}
              />
            ))}
          </p>
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
