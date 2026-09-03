import { useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { Panel } from '../components/Panel'
import { ChipIcon } from '../components/ChipIcon'
import { Kop } from '../components/Kop'
import { useAppState } from '../state/AppState'
import { prepareSetup } from '../domain/setup'
import { kanColorUp, longestValueDigits } from '../domain/chipset'
import type { StructureKind } from '../domain/blinds'
import type { Settings, Trigger } from '../domain/tournament'
import './SetupScreen.css'

// Acht genummerde spelers: een naam wegstrepen gaat sneller dan er een
// bijtypen. De afsluitende newline zet de cursor op een lege regel klaar.
const STANDAARD_NAMEN = Array.from({ length: 8 }, (_, i) => `Speler ${i + 1}`).join('\n') + '\n'

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
  const [startingStack, setStartingStack] = useState(settings?.startingStack ?? 100)
  const [levelMinutes, setLevelMinutes] = useState(settings?.levelMinutes ?? 15)
  const [durationMinutes, setDurationMinutes] = useState(settings?.durationMinutes ?? 180)
  const [structure, setStructure] = useState<StructureKind>(settings?.structure ?? 'ladder')
  const [trigger, setTrigger] = useState<Trigger>(settings?.trigger ?? 'both')
  const [colorUp, setColorUp] = useState(settings?.colorUp ?? true)
  const [chipsetId, setChipsetId] = useState(settings?.chipsetId ?? chipsets[0].id)

  const chipset = chipsets.find((c) => c.id === chipsetId) ?? chipsets[0]
  // Eén lettergrootte voor alle fiches van deze doos.
  const cijfers = longestValueDigits(chipset)
  // Met twee waardes hou je na een color-up één soort fiche over; dan is er
  // niets meer te wisselen en heeft de keuze geen betekenis.
  const colorUpMogelijk = kanColorUp(chipset)

  const huidigeSettings: Settings = useMemo(
    () => ({
      playerNames: namenTekst
        .split('\n')
        .map((n) => n.trim())
        .filter(Boolean),
      startingStack,
      levelMinutes,
      durationMinutes,
      structure,
      trigger,
      colorUp: colorUp && colorUpMogelijk,
      chipsetId: chipset.id,
    }),
    [
      namenTekst,
      startingStack,
      levelMinutes,
      durationMinutes,
      structure,
      trigger,
      colorUp,
      colorUpMogelijk,
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
          De opslag van je browser is vol of geblokkeerd. Instellingen en een lopend toernooi
          worden niet bewaard.
        </div>
      )}

      <div className="setup__raster">
        <Panel title="Spelers">
          <label className="veld">
            <span>Namen, één per regel</span>
            <textarea rows={10} value={namenTekst} onChange={(e) => setNamenTekst(e.target.value)} />
          </label>
        </Panel>

        <Panel title="Blinds">
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
          <label className="veld">
            <span>Pokerdoos</span>
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
              checked={colorUp && colorUpMogelijk}
              disabled={!colorUpMogelijk}
              onChange={(e) => setColorUp(e.target.checked)}
            />
            <span>Color-up: de kleinste kleur gaat onderweg uit het spel</span>
          </label>
          {!colorUpMogelijk && (
            <p className="uitleg">
              Kan niet met deze doos: er zijn maar twee waardes, dus na een color-up hou je één
              soort fiche over en valt er niets meer te wisselen.
            </p>
          )}
        </Panel>
        <Panel title="Toernooi">
          <label className="veld">
            <span>Startstack (chips)</span>
            <input
              type="number"
              min={1}
              value={startingStack}
              onChange={(e) => setStartingStack(Number(e.target.value))}
            />
          </label>
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
              <option value={10}>10 minuten</option>
              <option value={15}>15 minuten</option>
              <option value={20}>20 minuten</option>
            </select>
          </label>
        </Panel>

      </div>

      <Panel title="Blindstructuur">
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
        {structuur.colorUps.map((colorUp) => (
          <p key={colorUp.levelIndex} className="uitleg uitleg--fiches">
            Vanaf level {colorUp.levelIndex + 1}:
            {colorUp.retiredColors.map((kleur) => (
              <ChipIcon
                key={kleur}
                color={kleur}
                value={colorUp.retiredValue}
                size={26}
                digits={cijfers}
              />
            ))}
            uit het spel, wisselen naar
            {colorUp.nextColors.map((kleur) => (
              <ChipIcon
                key={kleur}
                color={kleur}
                value={colorUp.nextValue}
                size={26}
                digits={cijfers}
              />
            ))}
          </p>
        ))}
      </Panel>

      <div className="setup__raster">
        <Panel title="Chips per speler">
          {verdeling.perPlayer.map((allocatie) => (
            <div key={`${allocatie.color}-${allocatie.value}`} className="fiche-regel">
              <span className="fiche-regel__aantal">{allocatie.count}×</span>
              <ChipIcon color={allocatie.color} value={allocatie.value} digits={cijfers} />
            </div>
          ))}
          <p className="uitleg">
            {aantalChips} chips, samen {verdeling.stackValue} waard.
          </p>
        </Panel>
      </div>

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
