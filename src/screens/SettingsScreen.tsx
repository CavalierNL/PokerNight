import { useState } from 'react'
import { Button } from '../components/Button'
import { Panel } from '../components/Panel'
import { ChipIcon } from '../components/ChipIcon'
import { useAppState } from '../state/AppState'
import { PRESETS, type Chipset } from '../domain/chipset'
import './SetupScreen.css'

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const { chipsets, setChipsets, preferences, setPreferences } = useAppState()
  const [geselecteerd, setGeselecteerd] = useState(chipsets[0].id)
  const chipset = chipsets.find((c) => c.id === geselecteerd) ?? chipsets[0]

  const vervang = (nieuw: Chipset) =>
    setChipsets(chipsets.map((c) => (c.id === chipset.id ? nieuw : c)))

  const wijzig = (index: number, veld: 'name' | 'color' | 'value' | 'count', waarde: string) => {
    // Een leeggemaakt getalveld geeft Number('') === 0. Een fichewaarde van nul
    // laat de hele blindberekening op NaN uitkomen, dus die klemmen we af.
    const getal = (ondergrens: number) => Math.max(ondergrens, Math.floor(Number(waarde) || 0))
    const nieuweWaarde =
      veld === 'value' ? getal(1) : veld === 'count' ? getal(0) : waarde

    vervang({
      ...chipset,
      chips: chipset.chips.map((chip, i) => (i === index ? { ...chip, [veld]: nieuweWaarde } : chip)),
    })
  }

  const voegToe = () =>
    vervang({
      ...chipset,
      chips: [...chipset.chips, { name: 'nieuw', color: '#cccccc', value: 1, count: 50 }],
    })

  const verwijder = (index: number) =>
    vervang({ ...chipset, chips: chipset.chips.filter((_, i) => i !== index) })

  return (
    <div className="setup">
      <h1 className="setup__titel">Instellingen</h1>

      <Panel title="Chipset">
        <label className="veld">
          <span>Welke doos</span>
          <select value={geselecteerd} onChange={(e) => setGeselecteerd(e.target.value)}>
            {chipsets.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        {chipset.chips.map((chip, index) => (
          <div key={index} className="chip-editor">
            <ChipIcon color={chip.color} value={chip.value} size={26} />
            <input
              type="text"
              aria-label="kleurnaam"
              value={chip.name}
              onChange={(e) => wijzig(index, 'name', e.target.value)}
            />
            <input
              type="color"
              aria-label="kleur"
              value={chip.color}
              onChange={(e) => wijzig(index, 'color', e.target.value)}
            />
            <input
              type="number"
              aria-label="waarde"
              min={1}
              value={chip.value}
              onChange={(e) => wijzig(index, 'value', e.target.value)}
            />
            <input
              type="number"
              aria-label="aantal in de doos"
              min={0}
              value={chip.count}
              onChange={(e) => wijzig(index, 'count', e.target.value)}
            />
            <Button variant="danger" onClick={() => verwijder(index)}>
              Weg
            </Button>
          </div>
        ))}

        <p className="uitleg">Kleur, waarde per fiche, en hoeveel er van in de doos zitten.</p>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={voegToe}>
            Kleur toevoegen
          </Button>
          <Button variant="ghost" onClick={() => setChipsets(PRESETS)}>
            Terug naar de presets
          </Button>
        </div>
      </Panel>

      <Panel title="Aan tafel">
        <label className="veld veld--schakelaar">
          <input
            type="checkbox"
            checked={preferences.sound}
            onChange={(e) => setPreferences({ ...preferences, sound: e.target.checked })}
          />
          <span>Geluid bij een blindverhoging</span>
        </label>
        <label className="veld veld--schakelaar">
          <input
            type="checkbox"
            checked={preferences.wakeLock}
            onChange={(e) => setPreferences({ ...preferences, wakeLock: e.target.checked })}
          />
          <span>Scherm aan houden tijdens het toernooi</span>
        </label>
      </Panel>

      <Button onClick={onClose}>Terug</Button>
    </div>
  )
}
