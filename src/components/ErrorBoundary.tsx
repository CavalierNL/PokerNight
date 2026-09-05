import { Component, type ErrorInfo, type ReactNode } from 'react'
import { saveTournament } from '../state/storage'

/**
 * Vangt een crash tijdens het renderen op. Zonder dit haalt React de hele app van
 * de pagina en houd je een wit scherm over — en als de oorzaak in de opslag zit,
 * geeft elke volgende refresh opnieuw een wit scherm. Vandaar de knop die de
 * opgeslagen toestand wist: dat is de enige uitweg die je aan tafel hebt.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { fout: Error | null }
> {
  state: { fout: Error | null } = { fout: null }

  static getDerivedStateFromError(fout: Error) {
    return { fout }
  }

  componentDidCatch(fout: Error, info: ErrorInfo) {
    console.error('[pokernight] scherm gecrasht', fout, info.componentStack)
  }

  render() {
    if (!this.state.fout) return this.props.children

    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: '1.5rem' }}>
        <section className="paneel" style={{ maxWidth: '32rem' }}>
          <h2 className="paneel__titel">Er ging iets mis</h2>
          <p>
            Het scherm kon niet geladen worden. Meestal komt dat door een opgeslagen toernooi uit
            een oudere versie van de app.
          </p>
          <p style={{ color: 'var(--creme-zacht)', fontSize: '0.85rem' }}>{this.state.fout.message}</p>
          <button
            className="knop knop--primair"
            onClick={() => {
              // Via de opslaglaag en niet met een letterlijke sleutel: die
              // hangt af van de base, en in een PR-preview zou een vaste naam
              // hier het toernooi van de echte site wissen terwijl het kapotte
              // toernooi van de preview blijft staan. saveTournament meldt zelf
              // 'mislukt' bij geblokkeerde opslag; hier is er niets mee te doen,
              // want de herlaadpoging hieronder is dan de enige optie.
              saveTournament(null)
              location.reload()
            }}
          >
            Wis het opgeslagen toernooi en begin opnieuw
          </button>
        </section>
      </div>
    )
  }
}
