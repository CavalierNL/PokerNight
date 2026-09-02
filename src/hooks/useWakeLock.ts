import { useEffect } from 'react'

type WakeLockSentinel = { release: () => Promise<void> }

/**
 * Houdt het scherm aan zolang het toernooi loopt. Niet elke browser ondersteunt
 * dit; dan gebeurt er simpelweg niets.
 */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    const navigatorMetWakeLock = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> }
    }
    if (!navigatorMetWakeLock.wakeLock) return

    let sentinel: WakeLockSentinel | null = null
    let afgebroken = false

    const aanvragen = async () => {
      try {
        const nieuwe = await navigatorMetWakeLock.wakeLock!.request('screen')
        if (afgebroken) void nieuwe.release()
        else sentinel = nieuwe
      } catch {
        // Geweigerd of niet beschikbaar: het scherm valt dan gewoon in slaap.
      }
    }

    void aanvragen()

    // Na een tabwissel is de lock kwijt en moet hij opnieuw aangevraagd worden.
    const bijZichtbaar = () => {
      if (document.visibilityState === 'visible') void aanvragen()
    }
    document.addEventListener('visibilitychange', bijZichtbaar)

    return () => {
      afgebroken = true
      document.removeEventListener('visibilitychange', bijZichtbaar)
      void sentinel?.release()
    }
  }, [enabled])
}
