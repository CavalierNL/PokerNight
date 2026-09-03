import { useEffect, useState } from 'react'

/**
 * Een browser die de app op het startscherm kan zetten meldt dat met
 * `beforeinstallprompt`. Die gebeurtenis komt één keer en moet bewaard worden:
 * het venster openen mag alleen vanuit een klik, niet meteen bij binnenkomst.
 *
 * Alleen Chrome en de browsers op Android doen dit. Firefox en Safari kennen het
 * niet; daar gaat het via een menu van de browser zelf. Vandaar dat de knop
 * altijd getoond wordt en pas bij het indrukken blijkt of hij het venster opent
 * of uitlegt hoe het met de hand moet.
 */
type InstallGebeurtenis = Event & { prompt: () => Promise<void> }

export type Installatie = {
  /** De app draait al vanaf het startscherm; dan valt er niets te installeren. */
  alGeinstalleerd: boolean
  /** Aanwezig als de browser het venster zelf kan openen. */
  installeer?: () => void
}

/**
 * Draait de app al vanaf het startscherm?
 *
 * Twee manieren, want de browsers verschillen. Chrome en de Android-browsers
 * zetten `display-mode` op wat het manifest vraagt — hier fullscreen, met
 * standalone als terugval. Safari kent dat niet en zet in plaats daarvan een
 * eigen vlag op `navigator`.
 */
export function staatOpStartscherm(): boolean {
  if (typeof window === 'undefined') return false
  const alsApp = ['(display-mode: standalone)', '(display-mode: fullscreen)'].some(
    (vraag) => window.matchMedia?.(vraag).matches,
  )
  const iosAlsApp = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return alsApp || iosAlsApp
}

export function useInstallPrompt(): Installatie {
  const [gebeurtenis, setGebeurtenis] = useState<InstallGebeurtenis>()
  const [alGeinstalleerd, setAlGeinstalleerd] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setAlGeinstalleerd(staatOpStartscherm())

    const onthoud = (e: Event) => {
      // Zonder dit toont de browser zijn eigen balk op zijn eigen moment.
      e.preventDefault()
      setGebeurtenis(e as InstallGebeurtenis)
    }
    const geinstalleerd = () => {
      setGebeurtenis(undefined)
      setAlGeinstalleerd(true)
    }

    window.addEventListener('beforeinstallprompt', onthoud)
    window.addEventListener('appinstalled', geinstalleerd)
    return () => {
      window.removeEventListener('beforeinstallprompt', onthoud)
      window.removeEventListener('appinstalled', geinstalleerd)
    }
  }, [])

  if (!gebeurtenis) return { alGeinstalleerd }

  return {
    alGeinstalleerd,
    installeer: () => {
      void gebeurtenis.prompt()
      // Het venster kan maar één keer per gebeurtenis open; de knop hoort daarna
      // weg, of de gebruiker nu ja of nee zei.
      setGebeurtenis(undefined)
    },
  }
}
