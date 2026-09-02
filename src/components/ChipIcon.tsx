/**
 * De lettergrootte op het fiche, naar het aantal cijfers van de langste waarde in
 * de doos. Eén maat voor de hele doos: fiches naast elkaar met verschillend
 * grote cijfers lezen als losse plaatjes in plaats van als één set.
 *
 * De maat is afgestemd op de binnenring van het fiche (diameter 24 in een
 * tekenvlak van 40). Vijf cijfers passen daar nog net in.
 */
export function chipFontSize(digits: number): number {
  return Math.max(7, Math.min(15, 44 / Math.max(1, digits)))
}

/**
 * De tekstkleur op een fiche: donker op een lichte kleur, licht op een donkere.
 * Zonder deze keuze verdwijnt de waarde op zwart, paars of bruin — precies de
 * kleuren die in een doos de hoogste bedragen dragen.
 *
 * De drempel ligt op 0,6 in plaats van 0,5: bij een middentint leest lichte
 * tekst prettiger dan donkere.
 */
export function chipTextColor(hex: string): string {
  const schoon = hex.replace('#', '')
  if (schoon.length !== 6) return 'rgba(0,0,0,.7)'
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(schoon.slice(i, i + 2), 16))
  const helderheid = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return helderheid > 0.6 ? 'rgba(0,0,0,.75)' : 'rgba(255,255,255,.92)'
}

/**
 * Een fiche als SVG. Bewust geen sprite: de kleuren komen uit de chipset die de
 * gebruiker zelf instelt, en een vaste afbeelding kan die niet volgen.
 */
export function ChipIcon({
  color,
  value,
  size = 30,
  digits,
}: {
  color: string
  value?: number
  size?: number
  /** Cijfers van de langste waarde in de doos; bepaalt de lettergrootte. */
  digits?: number
}) {
  const lettergrootte = chipFontSize(digits ?? String(value ?? '').length)
  const tekstkleur = chipTextColor(color)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label={value === undefined ? 'fiche' : `fiche van ${value}`}
    >
      <circle cx="20" cy="20" r="18" fill={color} stroke="rgba(0,0,0,.35)" strokeWidth="2" />
      <circle
        cx="20"
        cy="20"
        r="12"
        fill="none"
        stroke="rgba(255,255,255,.5)"
        strokeWidth="3"
        strokeDasharray="5 4"
      />
      {value !== undefined && (
        <text
          x="20"
          y="25"
          textAnchor="middle"
          fontSize={lettergrootte}
          fontWeight="700"
          fill={tekstkleur}
        >
          {value}
        </text>
      )}
    </svg>
  )
}
