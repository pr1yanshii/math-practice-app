import { calculateAccuracy } from '../../services/statisticsService'
import type { PracticeSession } from '../../types/session'
import {
  DIFFICULTY_OPTIONS,
  OPERATION_OPTIONS,
} from '../../utils/practiceConfig'

interface SessionSummaryProps {
  session: PracticeSession
  reviewCount: number
}

export function SessionSummary({ session, reviewCount }: SessionSummaryProps) {
  const { attempted, correct, incorrect } = session
  const operations = OPERATION_OPTIONS.filter((option) =>
    session.operations.includes(option.value),
  )
    .map((option) => option.label)
    .join(', ')
  const level = DIFFICULTY_OPTIONS.find(
    (option) => option.value === session.difficulty,
  )!

  return (
    <dl className="session-totals">
      <SummaryItem label="Questions answered" value={attempted} />
      <SummaryItem label="I got it right" value={correct} />
      <SummaryItem label="I got it wrong" value={incorrect} />
      <SummaryItem
        label="Accuracy"
        value={`${calculateAccuracy(correct, attempted)}%`}
      />
      <SummaryItem label="Practiced" value={operations} small />
      <SummaryItem
        label="Level"
        value={`Level ${level.value}: ${level.name}`}
        small
      />
      <SummaryItem label="Mistake review questions" value={reviewCount} />
    </dl>
  )
}

function SummaryItem({
  label,
  value,
  small = false,
}: {
  label: string
  value: string | number
  small?: boolean
}) {
  return (
    <div className={small ? 'session-totals__item--text' : undefined}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
