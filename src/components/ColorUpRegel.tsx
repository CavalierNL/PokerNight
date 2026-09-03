import { ChipIcon } from './ChipIcon'
import type { ColorUp } from '../domain/blinds'

/**
 * Eén color-up in zo min mogelijk woorden: welke chips eruit gaan en wat je
 * ervoor terugkrijgt. Aan tafel wordt er naar gewezen, niet in gelezen — vandaar
 * "voor" in plaats van een zin met "uit het spel" en "wisselen naar".
 */
export function ColorUpRegel({
  label,
  colorUp,
  digits,
}: {
  label: string
  colorUp: ColorUp
  digits?: number
}) {
  return (
    <p className="colorup-regel">
      <span className="colorup-regel__label">{label}</span>
      {colorUp.retiredColors.map((kleur) => (
        <ChipIcon key={kleur} color={kleur} value={colorUp.retiredValue} digits={digits} />
      ))}
      <span className="colorup-regel__voor">voor</span>
      {colorUp.nextColors.map((kleur) => (
        <ChipIcon key={kleur} color={kleur} value={colorUp.nextValue} digits={digits} />
      ))}
    </p>
  )
}
