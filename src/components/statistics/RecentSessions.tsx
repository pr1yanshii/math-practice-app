import type { PracticeSession } from '../../types/session'
import { formatDateTime } from '../../utils/dates'
import {
  DIFFICULTY_OPTIONS,
  OPERATION_OPTIONS,
} from '../../utils/practiceConfig'
import { StatTotals } from './StatTotals'

// Expects sessions newest first, as loadSessions returns them.
export function RecentSessions({ sessions }: { sessions: PracticeSession[] }) {
  if (sessions.length === 0) {
    return <p className="empty-state">No practice sessions yet.</p>
  }

  return (
    <ol className="stat-cards">
      {sessions.map((session) => {
        const level = DIFFICULTY_OPTIONS.find(
          (option) => option.value === session.difficulty,
        )!
        const operations = OPERATION_OPTIONS.filter((option) =>
          session.operations.includes(option.value),
        )
          .map((option) => option.label)
          .join(', ')
        return (
          <li key={session.id} className="stat-card">
            <h3>
              <time dateTime={session.startedAt}>
                {formatDateTime(session.startedAt)}
              </time>
            </h3>
            <p className="stat-card__detail">{operations}</p>
            <p className="stat-card__detail">
              Level {level.value}: {level.name}
            </p>
            <StatTotals totals={session} />
          </li>
        )
      })}
    </ol>
  )
}
