import { useEffect } from 'react'
import { herhaalBlindToon } from '../audio/blindToon'

/**
 * Laat de blindtoon klinken zolang er een levelovergang op bevestiging wacht.
 *
 * Eerder hing het geluid aan de levelindex en stopte het bij de eerste de beste
 * aanraking. Nu hoort het bij dezelfde toestand als het scherm dat erbij hoort:
 * het zwijgt precies wanneer je die wegklikt, en geen tik eerder.
 */
export function useLevelSound(wachtOpBevestiging: boolean, enabled: boolean): void {
  useEffect(() => {
    if (!wachtOpBevestiging || !enabled) return
    return herhaalBlindToon()
  }, [wachtOpBevestiging, enabled])
}
