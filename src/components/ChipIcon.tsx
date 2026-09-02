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
          fill="rgba(0,0,0,.7)"
        >
          {value}
        </text>
      )}
    </svg>
  )
}
