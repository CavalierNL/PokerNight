import { useEffect, useState } from 'react'

/**
 * Een getalveld dat leeg mag zijn terwijl je typt.
 *
 * `Number('')` is 0, dus een veld dat rechtstreeks naar een getal schrijft zet er
 * een 0 neer zodra je het leegmaakt. Een duur van 0 is even fout als geen duur,
 * dus dat lost niets op — het staat alleen in de weg bij het opnieuw intypen.
 *
 * Daarom houdt dit veld zijn eigen tekst bij en meldt alleen een getal als er
 * een getal staat. Blijft het veld leeg, dan blijft de laatste geldige waarde
 * gelden en blijft het scherm iets zinnigs tonen.
 */
export function GetalVeld({
  label,
  value,
  onValue,
  min,
  step,
  className = '',
}: {
  label: string
  value: number
  onValue: (waarde: number) => void
  min?: number
  step?: number
  className?: string
}) {
  const [tekst, setTekst] = useState(String(value))

  // Verandert de waarde van buitenaf — de knop "Overnemen" bijvoorbeeld — dan
  // volgt het veld. Niet bij elke render, want "09" zou dan tijdens het typen
  // naar "9" springen en de cursor meenemen.
  useEffect(() => {
    if (Number(tekst) !== value) setTekst(String(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <label className={`veld ${className}`.trim()}>
      <span>{label}</span>
      <input
        type="number"
        min={min}
        step={step}
        value={tekst}
        onChange={(e) => {
          setTekst(e.target.value)
          const getal = Number(e.target.value)
          if (e.target.value !== '' && Number.isFinite(getal)) onValue(getal)
        }}
      />
    </label>
  )
}
