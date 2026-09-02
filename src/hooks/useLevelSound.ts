import { useEffect, useRef } from 'react'
import { herhaalBlindToon } from '../audio/blindToon'

/**
 * Herhaalt de blindtoon zodra de blinds omhoog gaan, tot iemand het scherm
 * aanraakt. Eén korte piep gaat aan tafel verloren in het gepraat.
 *
 * Alleen bij een verhoging: na "Ongedaan maken" gaat het level omlaag, en dan zou
 * hetzelfde signaal het tegenovergestelde suggereren van wat er gebeurt.
 *
 * De opruiming van het effect stopt het geluid ook als het level opnieuw
 * verspringt of het scherm verdwijnt.
 */
export function useLevelSound(levelIndex: number, enabled: boolean): void {
  const vorigeLevel = useRef(levelIndex)

  useEffect(() => {
    const omhoog = levelIndex > vorigeLevel.current
    vorigeLevel.current = levelIndex
    if (!omhoog || !enabled) return
    return herhaalBlindToon()
  }, [levelIndex, enabled])
}
