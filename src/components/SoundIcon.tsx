/** Luidspreker met twee golven. Zit in de knop die de blindtoon voorspeelt. */
export function SoundIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 9.5h3.2L11.5 6v12L7.2 14.5H4z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M15 9.2a4 4 0 0 1 0 5.6M17.8 6.6a7.7 7.7 0 0 1 0 10.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
