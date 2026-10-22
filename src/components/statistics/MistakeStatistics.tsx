import type { MistakeStatistics as Stats } from '../../services/statisticsService'
import type { MistakePattern } from '../../types/mistake'
import { formatDateTime } from '../../utils/dates'
import { OPERATION_OPTIONS } from '../../utils/practiceConfig'
import { formatNumber } from '../../utils/questionText'
import { formatQuestionText } from '../../utils/validation'

function factText(pattern: MistakePattern): string {
  const symbol = OPERATION_OPTIONS.find(
    (option) => option.value === pattern.operation,
  )!.symbol
  return `${formatQuestionText(symbol, pattern.firstOperand, pattern.secondOperand)} = ${formatNumber(pattern.correctAnswer)}`
}

const times = (count: number) => `${count} ${count === 1 ? 'time' : 'times'}`

function MistakeList({
  patterns,
  masteryThreshold,
}: {
  patterns: MistakePattern[]
  masteryThreshold: number
}) {
  return (
    <ul className="stat-cards">
      {patterns.map((pattern) => (
        <li key={pattern.id} className="stat-card">
          <h4 className="stat-card__fact">{factText(pattern)}</h4>
          <p className="stat-card__detail">
            Missed {times(pattern.incorrectCount)}
          </p>
          <p className="stat-card__detail">
            Practice progress:{' '}
            {Math.min(pattern.similarCorrectCount, masteryThreshold)} of{' '}
            {masteryThreshold} right
          </p>
          <p className="stat-card__detail">
            Last missed:{' '}
            <time dateTime={pattern.lastIncorrectAt}>
              {formatDateTime(pattern.lastIncorrectAt)}
            </time>
          </p>
        </li>
      ))}
    </ul>
  )
}

export function MistakeStatistics({
  stats,
  masteryThreshold,
}: {
  stats: Stats
  masteryThreshold: number
}) {
  const { active, mastered, mostMissedOperations, mostMissedFacts } = stats

  if (active.length === 0 && mastered.length === 0) {
    return <p className="empty-state">No mistakes saved yet.</p>
  }

  const operationNames = OPERATION_OPTIONS.filter((option) =>
    mostMissedOperations.includes(option.value),
  ).map((option) => option.label)

  return (
    <>
      <dl className="stat-totals">
        <div>
          <dt>Mistakes to practice</dt>
          <dd>{active.length}</dd>
        </div>
        <div>
          <dt>Mastered</dt>
          <dd>{mastered.length}</dd>
        </div>
        <div>
          <dt>Review questions</dt>
          <dd>{stats.reviewPracticed}</dd>
        </div>
        <div>
          <dt>Review answered right</dt>
          <dd>{stats.reviewCorrect}</dd>
        </div>
      </dl>

      <h3>Most missed operation</h3>
      <p>
        {operationNames.length > 0 ? operationNames.join(' and ') : 'None yet'}
      </p>

      <h3>Most missed facts</h3>
      <ol className="fact-list">
        {mostMissedFacts.map((pattern) => (
          <li key={pattern.id}>
            <span className="fact-list__fact">{factText(pattern)}</span> missed{' '}
            {times(pattern.incorrectCount)}
          </li>
        ))}
      </ol>

      <h3>Mistakes to practice</h3>
      {active.length > 0 ? (
        <MistakeList patterns={active} masteryThreshold={masteryThreshold} />
      ) : (
        <p className="empty-state">All saved mistakes are mastered.</p>
      )}

      {mastered.length > 0 && (
        <details className="mastered-mistakes">
          <summary>Mastered mistakes ({mastered.length})</summary>
          <MistakeList
            patterns={mastered}
            masteryThreshold={masteryThreshold}
          />
        </details>
      )}
    </>
  )
}
