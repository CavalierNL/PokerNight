/**
 * Een fiche als SVG. Bewust geen sprite: de kleuren komen uit de chipset die de
 * gebruiker zelf instelt, en een vaste afbeelding kan die niet volgen.
 */
export function ChipIcon({
  color,
  value,
  size = 28,
}: {
  color: string
  value?: number
  size?: number
}) {
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
          fontSize="13"
          fontWeight="700"
          fill="rgba(0,0,0,.7)"
        >
          {value}
        </text>
      )}
    </svg>
  )
}
