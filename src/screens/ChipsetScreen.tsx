import { useState } from 'react'
import { Button } from '../components/Button'
import { Panel } from '../components/Panel'
import { ChipIcon } from '../components/ChipIcon'
import { useAppState } from '../state/AppState'
import {
  kopieerChipset,
  legeChipset,
  longestValueDigits,
  metPresets,
  type Chipset,
} from '../domain/chipset'
import './SetupScreen.css'

/**
 * De dozen met fiches, los van de overige instellingen. Dit was het grootste
 * paneel van het instellingenscherm en heeft er inhoudelijk niets mee te maken.
 */
export function ChipsetScreen({ onClose }: { onClose: () => void }) {
  const { chipsets, setChipsets } = useAppState()
  const [geselecteerd, setGeselecteerd] = useState(chipsets[0].id)
  const chipset = chipsets.find((c) => c.id === geselecteerd) ?? chipsets[0]
  const cijfers = longestValueDigits(chipset)

  const vervang = (nieuw: Chipset) =>
    setChipsets(chipsets.map((c) => (c.id === chipset.id ? nieuw : c)))

  const voegDoosToe = (nieuw: Chipset) => {
    setChipsets([...chipsets, nieuw])
    setGeselecteerd(nieuw.id)
  }

  // De laatste doos mag niet weg: zonder doos is er niets om mee te rekenen en
  // valt het setupscherm terug op een lijst die er niet is.
  const verwijderDoos = () => {
    if (chipsets.length <= 1) return
    const rest = chipsets.filter((c) => c.id !== chipset.id)
    setChipsets(rest)
    setGeselecteerd(rest[0].id)
  }

  const wijzig = (index: number, veld: 'color' | 'value' | 'count', waarde: string) => {
    // Een leeggemaakt getalveld geeft Number('') === 0. Een fichewaarde van nul
    // laat de hele blindberekening op NaN uitkomen, dus die klemmen we af.
    const getal = (ondergrens: number) => Math.max(ondergrens, Math.floor(Number(waarde) || 0))
    const nieuweWaarde = veld === 'value' ? getal(1) : veld === 'count' ? getal(0) : waarde

    vervang({
      ...chipset,
      chips: chipset.chips.map((chip, i) =>
        i === index ? { ...chip, [veld]: nieuweWaarde } : chip,
      ),
    })
  }

  const voegToe = () =>
    vervang({
      ...chipset,
      chips: [...chipset.chips, { color: '#cccccc', value: 1, count: 50 }],
    })

  const verwijder = (index: number) =>
    vervang({ ...chipset, chips: chipset.chips.filter((_, i) => i !== index) })

  return (
    <div className="setup">
      <h1 className="setup__titel">Chipsets</h1>

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

        <label className="veld">
          <span>Naam van deze doos</span>
          <input
            type="text"
            value={chipset.name}
            onChange={(e) => vervang({ ...chipset, name: e.target.value })}
          />
        </label>

        {chipset.chips.map((chip, index) => (
          <div key={index} className="chip-rij">
            <div className="chip-rij__fiche">
              <ChipIcon color={chip.color} value={chip.value} digits={cijfers} />
            </div>
            <label className="veld chip-rij__kleur">
              <span>Kleur</span>
              <input
                type="color"
                value={chip.color}
                onChange={(e) => wijzig(index, 'color', e.target.value)}
              />
            </label>
            <label className="veld chip-rij__getal">
              <span>Waarde per fiche</span>
              <input
                type="number"
                min={1}
                value={chip.value}
                onChange={(e) => wijzig(index, 'value', e.target.value)}
              />
            </label>
            <label className="veld chip-rij__getal">
              <span>Aantal in de doos</span>
              <input
                type="number"
                min={0}
                value={chip.count}
                onChange={(e) => wijzig(index, 'count', e.target.value)}
              />
            </label>
            <Button variant="danger" onClick={() => verwijder(index)}>
              Weg
            </Button>
          </div>
        ))}

        <label className="veld veld--schakelaar">
          <input
            type="checkbox"
            checked={chipset.colorUp}
            onChange={(e) => vervang({ ...chipset, colorUp: e.target.checked })}
          />
          <span>Color-up gebruiken: de kleinste kleur mag onderweg uit het spel</span>
        </label>
        <p className="uitleg">
          Bij een doos met maar twee waardes, zoals de huisregel, levert dat niets op — je speelt
          daarna met één soort fiche en kunt niets meer wisselen.
        </p>

        <div className="knoppenrij">
          <Button variant="ghost" onClick={voegToe}>
            Kleur toevoegen
          </Button>
          <Button variant="ghost" onClick={() => voegDoosToe(kopieerChipset(chipset, chipsets))}>
            Doos kopiëren
          </Button>
          <Button variant="ghost" onClick={() => voegDoosToe(legeChipset(chipsets))}>
            Nieuwe doos
          </Button>
          <Button variant="danger" disabled={chipsets.length <= 1} onClick={verwijderDoos}>
            Doos verwijderen
          </Button>
          <Button variant="ghost" onClick={() => setChipsets(metPresets(chipsets))}>
            Presets terugzetten
          </Button>
        </div>
      </Panel>

      <Button onClick={onClose}>Terug</Button>
    </div>
  )
}
