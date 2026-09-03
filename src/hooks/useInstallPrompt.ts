import { useEffect, useState } from 'react'

/**
 * Een browser die de app op het beginscherm kan zetten meldt dat met
 * `beforeinstallprompt`. Die gebeurtenis komt één keer en moet bewaard worden:
 * het venster openen mag alleen vanuit een klik, niet meteen bij binnenkomst.
 *
 * Alleen Chrome en de browsers op Android doen dit. Safari kent het niet — daar
 * gaat het via Deel → "Zet op beginscherm", en tonen we dus geen knop.
 */
type InstallGebeurtenis = Event & { prompt: () => Promise<void> }

export function useInstallPrompt(): (() => void) | undefined {
  const [gebeurtenis, setGebeurtenis] = useState<InstallGebeurtenis>()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onthoud = (e: Event) => {
      // Zonder dit toont de browser zijn eigen balk op zijn eigen moment.
      e.preventDefault()
      setGebeurtenis(e as InstallGebeurtenis)
    }
    const geinstalleerd = () => setGebeurtenis(undefined)

    window.addEventListener('beforeinstallprompt', onthoud)
    window.addEventListener('appinstalled', geinstalleerd)
    return () => {
      window.removeEventListener('beforeinstallprompt', onthoud)
      window.removeEventListener('appinstalled', geinstalleerd)
    }
  }, [])

  if (!gebeurtenis) return undefined
  return () => {
    void gebeurtenis.prompt()
    // Het venster kan maar één keer per gebeurtenis open; de knop hoort daarna
    // weg, of de gebruiker nu ja of nee zei.
    setGebeurtenis(undefined)
  }
}
