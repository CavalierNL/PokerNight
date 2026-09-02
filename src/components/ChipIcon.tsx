/**
 * De lettergrootte op het fiche, naar het aantal cijfers van de langste waarde in
 * de doos. Eén maat voor de hele doos: fiches naast elkaar met verschillend
 * grote cijfers lezen als losse plaatjes in plaats van als één set.
 *
 * De deler volgt uit de ruimte binnen de inkepingen: die lopen tot straal 14,6
 * in een tekenvlak van 40, en een cijfer is ongeveer 0,6 em breed. Bij vijf
 * cijfers komt de tekst zo op 24 breed en blijft er aan weerskanten ruimte over.
 * Ruimer afgesteld liepen 500 en 10000 tegen de rand aan.
 */
export function chipFontSize(digits: number): number {
  return Math.max(8, Math.min(16, 40 / Math.max(1, digits)))
}

/**
 * De basislijn van de waarde. Op één vaste hoogte zetten laat kleine cijfers
 * onder het midden hangen: een basislijn ligt ónder de tekst, dus hoe kleiner de
 * letter, hoe hoger die lijn moet liggen om optisch te kloppen. Een cijfer is
 * ongeveer 0,7 em hoog; de helft daarvan is de correctie.
 */
export function chipTextY(fontSize: number): number {
  return 20 + fontSize * 0.35
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
 * De inkepingen op de rand. Dezelfde afweging als bij de tekst: wit op een wit
 * fiche is geen versiering maar een onzichtbare rand. Op een licht fiche bijna
 * zwart, zoals de inzetstukken van een echt fiche.
 */
export function chipRimColor(hex: string): string {
  return isLichtFiche(hex) ? 'rgba(0,0,0,.82)' : 'rgba(255,255,255,.55)'
}

/**
 * Een fiche als SVG. Bewust geen sprite: de kleuren komen uit de chipset die de
 * gebruiker zelf instelt, en een vaste afbeelding kan die niet volgen.
 */
export function ChipIcon({
  color,
  value,
  size = 46,
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
        De inkepingen liggen op de rand, zoals de inzetstukken van een echt
        fiche: de buitenkant van de streek valt samen met de rand van het fiche.
        Een ring midden op het fiche zou dwars door een waarde als 10000 heen
        lopen, en juist daar moet niets in de weg zitten.
      */}
      <circle
        cx="20"
        cy="20"
        r="16.3"
        fill="none"
        stroke={randkleur}
        strokeWidth="3.4"
        strokeDasharray="5 6"
      />
      {value !== undefined && (
        <text
          x="20"
          y={chipTextY(lettergrootte)}
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
