import { useEffect, useRef } from 'react'
import { speelLaatsteMinuutToon } from '../audio/blindToon'

/** Hoeveel er over moet zijn voor de waarschuwing. Eén hand duurt zo lang. */
export const WAARSCHUWING_MS = 60_000

/**
 * Of de waarschuwing nu moet klinken: alleen op het moment dat de klok de grens
 * passeert, niet zolang hij eronder staat.
 *
 * Dat onderscheid is de hele functie. Zonder de vorige stand zou de app ook
 * piepen als je hem opent terwijl er nog veertig seconden te gaan zijn — en dan
 * waarschuwt hij voor iets wat de tafel allang weet.
 */
export function passeertDeMinuut(vorigeMs: number | undefined, resterendMs: number): boolean {
  if (vorigeMs === undefined) return false
  return vorigeMs > WAARSCHUWING_MS && resterendMs <= WAARSCHUWING_MS
}

/**
 * Laat eenmalig per level horen dat er nog een minuut te spelen is, zodat de
 * tafel de hand nog kan afmaken in plaats van er middenin gestoord te worden.
 *
 * `actief` is onwaar zodra de klok stilstaat of niet op tijd afloopt; het meten
 * gaat dan gewoon door, zodat hervatten vlak boven de grens nog steeds werkt.
 */
export function useLaatsteMinuut(resterendMs: number, actief: boolean, levelIndex: number): void {
  const vorige = useRef<number | undefined>(undefined)

  // Een nieuw level begint met een volle klok. Die sprong omhoog is geen
  // overgang die iets betekent, dus meet het volgende level vanaf nul opnieuw.
  useEffect(() => {
    vorige.current = undefined
  }, [levelIndex])

  useEffect(() => {
    const vorigeMs = vorige.current
    vorige.current = resterendMs
    if (actief && passeertDeMinuut(vorigeMs, resterendMs)) speelLaatsteMinuutToon()
  }, [resterendMs, actief])
}
