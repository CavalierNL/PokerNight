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

/**
 * De manieren waarop een browser laat weten dat de app níét in een gewoon tabblad
 * draait. `fullscreen` en `standalone` staan in het manifest; `minimal-ui` komt
 * voor bij browsers die een smalle balk overhouden.
 */
const APP_MODI = [
  '(display-mode: fullscreen)',
  '(display-mode: standalone)',
  '(display-mode: minimal-ui)',
] as const

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
 * zetten `display-mode` op wat het manifest vraagt. Safari kent dat niet en zet
 * in plaats daarvan een eigen vlag op `navigator`.
 *
 * Let op wat dit níét ziet: een snelkoppeling die een gewoon tabblad opent. Die
 * ziet er op je startscherm hetzelfde uit, maar is geen geïnstalleerde app, en
 * dan is `display-mode` gewoon `browser`.
 */
export function staatOpStartscherm(): boolean {
  if (typeof window === 'undefined') return false
  const alsApp = APP_MODI.some((vraag) => window.matchMedia?.(vraag).matches)
  const iosAlsApp = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return alsApp || iosAlsApp
}

/** Hoe de app geopend is, in woorden. Staat in de instellingen, om te kunnen zien
 *  of een icoon op je startscherm de app opent of alleen een tabblad. */
export function hoeGeopend(): string {
  if (typeof window === 'undefined') return 'onbekend'
  const modus = APP_MODI.find((vraag) => window.matchMedia?.(vraag).matches)
  if (modus) return modus.replace('(display-mode: ', '').replace(')', '')
  if ((window.navigator as Navigator & { standalone?: boolean }).standalone === true) {
    return 'standalone'
  }
  return 'browser'
}

export function useInstallPrompt(): Installatie {
  const [gebeurtenis, setGebeurtenis] = useState<InstallGebeurtenis>()
  const [alGeinstalleerd, setAlGeinstalleerd] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const kijk = () => setAlGeinstalleerd(staatOpStartscherm())
    kijk()

    const onthoud = (e: Event) => {
      // Zonder dit toont de browser zijn eigen balk op zijn eigen moment.
      e.preventDefault()
      setGebeurtenis(e as InstallGebeurtenis)
    }
    const geinstalleerd = () => {
      setGebeurtenis(undefined)
      setAlGeinstalleerd(true)
    }

    // De modus kan onderweg veranderen, bijvoorbeeld als je de app installeert
    // terwijl hij openstaat, of hem vanuit het tabblad naar de app opent.
    const luisteraars = APP_MODI.map((vraag) => window.matchMedia?.(vraag)).filter(Boolean)
    for (const query of luisteraars) query.addEventListener?.('change', kijk)

    window.addEventListener('beforeinstallprompt', onthoud)
    window.addEventListener('appinstalled', geinstalleerd)
    window.addEventListener('visibilitychange', kijk)
    return () => {
      for (const query of luisteraars) query.removeEventListener?.('change', kijk)
      window.removeEventListener('beforeinstallprompt', onthoud)
      window.removeEventListener('appinstalled', geinstalleerd)
      window.removeEventListener('visibilitychange', kijk)
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
