import type { ReactNode } from 'react'
import { PlayingCard, SESSIE_HAND as HAND } from './PlayingCard'

export function Kop({ children }: { children: ReactNode }) {
  return (
    <header className="setup__kop">
      <PlayingCard kaart={HAND[0]} className="setup__kaart" />
      <PlayingCard kaart={HAND[1]} className="setup__kaart setup__kaart--twee" />
      <h1 className="setup__titel">{children}</h1>
    </header>
  )
}
