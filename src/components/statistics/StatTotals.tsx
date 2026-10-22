import { calculateAccuracy } from '../../services/statisticsService'
import type { OperationStatistics } from '../../types/statistics'

// Attempted, correct, incorrect and accuracy for one group of attempts.
export function StatTotals({ totals }: { totals: OperationStatistics }) {
  const { attempted, correct, incorrect } = totals
  return (
    <dl className="stat-totals">
      <div>
        <dt>Attempted</dt>
        <dd>{attempted}</dd>
      </div>
      <div>
        <dt>Correct</dt>
        <dd>{correct}</dd>
      </div>
      <div>
        <dt>Incorrect</dt>
        <dd>{incorrect}</dd>
      </div>
      <div>
        <dt>Accuracy</dt>
        <dd>{calculateAccuracy(correct, attempted)}%</dd>
      </div>
    </dl>
  )
}
