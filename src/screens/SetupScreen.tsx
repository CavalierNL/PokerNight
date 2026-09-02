import { useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { Panel } from '../components/Panel'
import { ChipIcon } from '../components/ChipIcon'
import { useAppState } from '../state/AppState'
import { buildStructure, type StructureKind } from '../domain/blinds'
import { distributeChips } from '../domain/distribution'
import { calculatePayouts } from '../domain/payout'
import { setupWarnings } from '../domain/warnings'
import type { Settings, Trigger } from '../domain/tournament'
import { sprite } from '../sprites'
import './SetupScreen.css'

const STANDAARD_NAMEN = 'Sam\nIlse\nJoost\nMax\nNadia\nRavi'

export function SetupScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { chipsets, settings, start } = useAppState()

  const [namenTekst, setNamenTekst] = useState(
    settings ? settings.playerNames.join('\n') : STANDAARD_NAMEN,
  )
  const [buyIn, setBuyIn] = useState(settings?.buyIn ?? 10)
  const [startingStack, setStartingStack] = useState(settings?.startingStack ?? 100)
  const [levelMinutes, setLevelMinutes] = useState(settings?.levelMinutes ?? 15)
  const [durationMinutes, setDurationMinutes] = useState(settings?.durationMinutes ?? 180)
  const [structure, setStructure] = useState<StructureKind>(settings?.structure ?? 'doubling')
  const [trigger, setTrigger] = useState<Trigger>(settings?.trigger ?? 'both')
  const [chipsetId, setChipsetId] = useState(settings?.chipsetId ?? chipsets[0].id)

  const chipset = chipsets.find((c) => c.id === chipsetId) ?? chipsets[0]
  const playerNames = namenTekst
    .split('\n')
    .map((n) => n.trim())
    .filter(Boolean)

  const huidigeSettings: Settings = {
    playerNames,
    buyIn,
    startingStack,
    levelMinutes,
    durationMinutes,
    structure,
    trigger,
    chipsetId: chipset.id,
  }

  const structuur = useMemo(
    () =>
      buildStructure(
        {
          kind: structure,
          players: Math.max(playerNames.length, 2),
          startingStack,
          durationMinutes,
          levelMinutes,
        },
        chipset,
      ),
    [structure, playerNames.length, startingStack, durationMinutes, levelMinutes, chipset],
  )

  const verdeling = useMemo(
    () =>
      distributeChips(
        chipset,
        Math.max(playerNames.length, 1),
        startingStack,
        structuur.levels[0]?.smallBlind ?? 1,
      ),
    [chipset, playerNames.length, startingStack, structuur],
  )

  const uitbetalingen = calculatePayouts(buyIn, Math.max(playerNames.length, 1))
  const meldingen = setupWarnings(huidigeSettings, structuur, verdeling)
  const kanStarten = !meldingen.some((m) => m.level === 'error')

  return (
    <div className="setup">
      <header className="setup__kop">
        <img className="setup__kaart" src={sprite('kaartrug.png')} alt="" />
        <img className="setup__kaart setup__kaart--twee" src={sprite('kaartrug.png')} alt="" />
        <h1 className="setup__titel">PokerNight</h1>
      </header>

      {meldingen.map((melding, i) => (
        <div key={i} className={`melding melding--${melding.level}`}>
          {melding.message}
        </div>
      ))}

      <div className="setup__raster">
        <Panel title="Spelers">
          <label className="veld">
            <span>Namen, één per regel</span>
            <textarea rows={7} value={namenTekst} onChange={(e) => setNamenTekst(e.target.value)} />
          </label>
          <label className="veld">
            <span>Inleg per speler (€)</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={buyIn}
              onChange={(e) => setBuyIn(Number(e.target.value))}
            />
          </label>
        </Panel>

        <Panel title="Toernooi">
          <label className="veld">
            <span>Startstack (fiches)</span>
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
            <select
              value={levelMinutes}
              onChange={(e) => setLevelMinutes(Number(e.target.value))}
            >
              <option value={10}>10 minuten</option>
              <option value={15}>15 minuten</option>
              <option value={20}>20 minuten</option>
            </select>
          </label>
        </Panel>

        <Panel title="Blinds">
          <label className="veld">
            <span>Hoe de blinds groeien</span>
            <select
              value={structure}
              onChange={(e) => setStructure(e.target.value as StructureKind)}
            >
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
            <span>Chipset</span>
            <select value={chipsetId} onChange={(e) => setChipsetId(e.target.value)}>
              {chipsets.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
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
          <p key={colorUp.levelIndex} className="uitleg">
            Vanaf level {colorUp.levelIndex + 1}: {colorUp.retiredColors.join(', ')} uit het spel,
            wisselen naar {colorUp.nextValue}.
          </p>
        ))}
      </Panel>

      <div className="setup__raster">
        <Panel title="Fiches per speler">
          {verdeling.perPlayer.map((allocatie) => (
            <div key={allocatie.name} className="fiche-regel">
              <ChipIcon color={allocatie.color} value={allocatie.value} size={22} />
              <span>
                {allocatie.count}× {allocatie.name}
              </span>
            </div>
          ))}
          <p className="uitleg">Samen {verdeling.stackValue} fiches per speler.</p>
        </Panel>

        <Panel title="Prijzenpot">
          {uitbetalingen.map((uitbetaling) => (
            <div key={uitbetaling.place}>
              {uitbetaling.place}e plaats: € {uitbetaling.amount}
            </div>
          ))}
          <p className="uitleg">
            De pot ligt vast zodra het toernooi begint. Er zijn geen rebuys — een rebuy is opnieuw
            inleggen nadat je al je fiches kwijt bent, en die rekent deze app niet mee.
          </p>
        </Panel>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Button disabled={!kanStarten} onClick={() => start(huidigeSettings, chipset)}>
          Start het toernooi
        </Button>
        <Button variant="ghost" onClick={onOpenSettings}>
          Instellingen en chipsets
        </Button>
      </div>
    </div>
  )
}
