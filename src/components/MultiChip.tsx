import { chipFontSize, chipRimColor, chipTextY } from './ChipIcon'

/**
 * Eén chip die voor meerdere kleuren tegelijk staat: bij de huisregel is één
 * kleur 5 waard en zijn alle andere 1, en dat "alle andere" is geen kleur maar
 * een verzameling. In taartpunten verdeeld leest dat als "elk van deze".
 *
 * De inkepingen op de rand krijgen hun kleur per punt: één vaste randkleur zou
 * op de lichte punten wegvallen en op de donkere te hard staan.
 *
 * De waarde staat er met een omlijning omheen, want die tekst ligt over punten
 * van verschillende helderheid. Eén tekstkleur kiezen kan daar per definitie
 * niet goed gaan.
 */

/** Een punt op de cirkel. Hoeken lopen in graden vanaf twaalf uur. */
function punt(hoek: number, straal: number): string {
  const radialen = ((hoek - 90) * Math.PI) / 180
  return `${20 + straal * Math.cos(radialen)} ${20 + straal * Math.sin(radialen)}`
}

/** Een taartpunt om te vullen: van het midden naar de rand en terug. */
export function taartpunt(vanHoek: number, totHoek: number, straal: number): string {
  const groot = totHoek - vanHoek > 180 ? 1 : 0
  return `M 20 20 L ${punt(vanHoek, straal)} A ${straal} ${straal} 0 ${groot} 1 ${punt(totHoek, straal)} Z`
}

/**
 * Alleen de boog, zonder terugweg naar het midden en zonder sluiting. Een `Z`
 * zou hier een koorde dwars over de chip trekken in plaats van niets.
 */
export function boog(vanHoek: number, totHoek: number, straal: number): string {
  const groot = totHoek - vanHoek > 180 ? 1 : 0
  return `M ${punt(vanHoek, straal)} A ${straal} ${straal} 0 ${groot} 1 ${punt(totHoek, straal)}`
}

export function MultiChip({
  colors,
  value,
  size = 46,
  digits,
}: {
  colors: string[]
  value?: number
  size?: number
  digits?: number
}) {
  const lettergrootte = chipFontSize(digits ?? String(value ?? '').length)
  const punten = colors.length > 0 ? colors : ['#cccccc']
  const graden = 360 / punten.length

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label={value === undefined ? 'chip' : `chip van ${value}, in meerdere kleuren`}
    >
      {punten.map((kleur, i) => (
        <path key={`punt-${kleur}-${i}`} d={taartpunt(i * graden, (i + 1) * graden, 18)} fill={kleur} />
      ))}
      <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="2" />

      {/* De inkepingen: per punt een boogje in een kleur die daar opvalt. */}
      {punten.map((kleur, i) => (
        <path
          key={`rand-${kleur}-${i}`}
          d={boog(i * graden + graden * 0.18, (i + 1) * graden - graden * 0.18, 16.3)}
          fill="none"
          stroke={chipRimColor(kleur)}
          strokeWidth="3.4"
        />
      ))}

      {value !== undefined && (
        <text
          x="20"
          y={chipTextY(lettergrootte)}
          textAnchor="middle"
          fontSize={lettergrootte}
          fontWeight="700"
          fill="rgba(255,255,255,.95)"
          stroke="rgba(0,0,0,.65)"
          strokeWidth="3"
          paintOrder="stroke"
        >
          {value}
        </text>
      )}
    </svg>
  )
}
