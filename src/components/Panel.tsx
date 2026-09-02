import type { ReactNode } from 'react'

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="paneel">
      {title && <h2 className="paneel__titel">{title}</h2>}
      {children}
    </section>
  )
}
