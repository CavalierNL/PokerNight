import type { BlindLevel } from '../domain/blinds'

/**
 * De hele blindstructuur als tabel. Gedeeld door de configuratie, waar je hem
 * leest voordat je begint, en het schema aan tafel, waar je hem opzoekt tijdens
 * het spelen — dezelfde tabel, zodat wat je vooraf zag ook is wat je terugvindt.
 *
 * De kolom "vanaf" is de geplande starttijd vanaf het begin van het toernooi;
 * pauzes schuiven die in werkelijkheid op.
 */
export function StructuurTabel({
  levels,
  levelMinutes,
  huidigLevel,
  geplandeLevels,
}: {
  levels: BlindLevel[]
  levelMinutes: number
  /** Het level dat nu gespeeld wordt; krijgt nadruk. Weglaten in de configuratie. */
  huidigLevel?: number
  /**
   * Het aantal levels dat in de geplande avond past. De reeks loopt daar
   * voorbij, zodat de blinds kunnen blijven klimmen als eliminaties de levels
   * opschuiven — maar die rijen bereik je alleen doordat er iemand uitvalt, dus
   * een geplande starttijd bestaat er niet voor. Weglaten betekent: alles is
   * gepland, en dat is het geval zonder afgesproken duur.
   */
  geplandeLevels?: number
}) {
  return (
    <table className="structuur">
      <thead>
        <tr>
          <th>Level</th>
          <th>Blinds</th>
          <th>Vanaf</th>
        </tr>
      </thead>
      <tbody>
        {levels.map((level) => (
          <tr
            key={level.index}
            className={level.index === huidigLevel ? 'structuur__nu' : undefined}
          >
            <td>{level.index + 1}</td>
            <td>
              {level.smallBlind} / {level.bigBlind}
            </td>
            <td>
              {geplandeLevels !== undefined && level.index >= geplandeLevels
                ? '—'
                : `${level.index * levelMinutes} min`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
