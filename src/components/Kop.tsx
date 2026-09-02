import type { ReactNode } from 'react'
import { kiesHand, PlayingCard } from './PlayingCard'

/**
 * Eén hand voor de hele sessie, hier op moduleniveau getrokken. Zou elk scherm
 * zijn eigen hand kiezen, dan wisselden de kaarten zodra je naar de setup loopt
 * en terug — dat leest als een storing in plaats van als een grapje.
 */
const HAND = kiesHand()

export function Kop({ children }: { children: ReactNode }) {
  return (
    <header className="setup__kop">
      <PlayingCard kaart={HAND[0]} className="setup__kaart" />
      <PlayingCard kaart={HAND[1]} className="setup__kaart setup__kaart--twee" />
      <h1 className="setup__titel">{children}</h1>
    </header>
  )
}
