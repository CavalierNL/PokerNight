import { useCallback, useEffect, useState } from 'react'

export type Scherm = 'home' | 'nieuw' | 'chipsets' | 'instellingen'

const SCHERMEN: Scherm[] = ['home', 'nieuw', 'chipsets', 'instellingen']

/**
 * Leest het scherm uit een history-state. Die state komt uit de browser en kan
 * van alles zijn — een oude versie van de app, een andere pagina op hetzelfde
 * adres, of niets. Alles wat niet klopt is de voordeur.
 */
export function schermUitState(state: unknown): Scherm {
  const naam = (state as { scherm?: unknown } | null)?.scherm
  return SCHERMEN.includes(naam as Scherm) ? (naam as Scherm) : 'home'
}

/**
 * Het huidige scherm, met de geschiedenis van de browser als bron. Daardoor doet
 * de terug-toets — en op Android het terugveegje — precies wat de Terug-knop
 * doet, zonder dat er twee wegen naar buiten zijn die uit elkaar kunnen lopen.
 *
 * De knoppen roepen `history.back()` aan en niets anders; het scherm verandert
 * pas als de browser dat meldt.
 */
export function useScherm(): {
  scherm: Scherm
  ga: (naar: Scherm) => void
  terug: () => void
  vergeetStap: () => void
} {
  const [scherm, setScherm] = useState<Scherm>('home')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const opTerug = (e: PopStateEvent) => setScherm(schermUitState(e.state))
    window.addEventListener('popstate', opTerug)
    return () => window.removeEventListener('popstate', opTerug)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    // De browser zet bij een terugstap zelf de scrollpositie terug. In een app
    // met één document vecht dat met de schermwissel: terug vanaf een lang
    // scherm lijkt dan alleen naar boven te scrollen, of laat je halverwege het
    // vorige scherm achter. Wij bepalen het zelf.
    const vorige = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = vorige
    }
  }, [])

  // Elk scherm begint bovenaan; de scrollpositie van het vorige zegt hier niets.
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }, [scherm])

  const ga = useCallback((naar: Scherm) => {
    setScherm(naar)
    if (typeof window !== 'undefined') window.history.pushState({ scherm: naar }, '')
  }, [])

  const terug = useCallback(() => {
    if (typeof window !== 'undefined') window.history.back()
    else setScherm('home')
  }, [])

  /**
   * Vervangt de huidige stap door de voordeur. Gebruikt bij het starten van een
   * toernooi: zonder dit zou terug je in het setupformulier terugzetten van een
   * toernooi dat al loopt.
   */
  const vergeetStap = useCallback(() => {
    setScherm('home')
    if (typeof window !== 'undefined') window.history.replaceState({ scherm: 'home' }, '')
  }, [])

  return { scherm, ga, terug, vergeetStap }
}
