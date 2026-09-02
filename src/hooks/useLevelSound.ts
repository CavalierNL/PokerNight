import { useEffect, useRef } from 'react'
import { speelBlindToon } from '../audio/blindToon'

/**
 * Speelt de blindtoon zodra de blinds omhoog gaan.
 *
 * Alleen bij een verhoging: na "Ongedaan maken" gaat het level omlaag, en dan zou
 * hetzelfde signaal het tegenovergestelde suggereren van wat er gebeurt.
 */
export function useLevelSound(levelIndex: number, enabled: boolean): void {
  const vorigeLevel = useRef(levelIndex)

  useEffect(() => {
    const omhoog = levelIndex > vorigeLevel.current
    vorigeLevel.current = levelIndex
    if (!omhoog || !enabled) return
    speelBlindToon()
  }, [levelIndex, enabled])
}
