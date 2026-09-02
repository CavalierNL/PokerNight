/**
 * De lettergrootte op het fiche, naar het aantal cijfers van de langste waarde in
 * de doos. Eén maat voor de hele doos: fiches naast elkaar met verschillend
 * grote cijfers lezen als losse plaatjes in plaats van als één set.
 *
 * De maat is afgestemd op de binnenring van het fiche (diameter 24 in een
 * tekenvlak van 40). Vijf cijfers passen daar nog net in.
 */
export function chipFontSize(digits: number): number {
  return Math.max(8, Math.min(17, 50 / Math.max(1, digits)))
}

/**
 * De tekstkleur op een fiche: donker op een lichte kleur, licht op een donkere.
 * Zonder deze keuze verdwijnt de waarde op zwart, paars of bruin — precies de
 * kleuren die in een doos de hoogste bedragen dragen.
 *
 * De drempel ligt op 0,6 in plaats van 0,5: bij een middentint leest lichte
 * tekst prettiger dan donkere.
 */
export function isLichtFiche(hex: string): boolean {
  const schoon = hex.replace('#', '')
  if (schoon.length !== 6) return true
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(schoon.slice(i, i + 2), 16))
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
}

export function chipTextColor(hex: string): string {
  return isLichtFiche(hex) ? 'rgba(0,0,0,.75)' : 'rgba(255,255,255,.92)'
}

/**
 * De randstippen. Dezelfde afweging als bij de tekst: wit op een wit fiche is
 * geen versiering maar een onzichtbare rand.
 */
export function chipRimColor(hex: string): string {
  return isLichtFiche(hex) ? 'rgba(0,0,0,.28)' : 'rgba(255,255,255,.45)'
}

/**
 * Een fiche als SVG. Bewust geen sprite: de kleuren komen uit de chipset die de
 * gebruiker zelf instelt, en een vaste afbeelding kan die niet volgen.
 */
export function ChipIcon({
  color,
  value,
  size = 38,
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
  const randkleur = chipRimColor(color)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label={value === undefined ? 'fiche' : `fiche van ${value}`}
    >
      <circle cx="20" cy="20" r="18" fill={color} stroke="rgba(0,0,0,.35)" strokeWidth="2" />
      {/*
        De stippen liggen op de rand, zoals de gekleurde blokjes op een echt
        fiche. Een ring midden op het fiche zou dwars door een waarde als 10000
        heen lopen; daar moet juist niets in de weg zitten.
      */}
      <circle
        cx="20"
        cy="20"
        r="16.2"
        fill="none"
        stroke={randkleur}
        strokeWidth="2.4"
        strokeDasharray="4 5"
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
