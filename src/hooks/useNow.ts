import { useEffect, useState } from 'react'

/**
 * Geeft de huidige tijd, elke `intervalMs` opnieuw. De klok in het domein rekent
 * met deze waarde; hier wordt alleen bepaald hoe vaak er hertekend wordt.
 */
export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
