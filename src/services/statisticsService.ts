import type { MistakePattern } from '../types/mistake'
import type { DifficultyLevel, MathOperation } from '../types/question'
import type { PracticeAttempt } from '../types/session'
import type {
  AppStatistics,
  ArchivedStatistics,
  OperationStatistics,
} from '../types/statistics'
import { isMastered } from './mistakeTracker'

// correct ÷ attempted × 100 (specification §6.6), rounded to a whole
// percent (REQUIREMENTS.md D-20). 0 when nothing was attempted.
export function calculateAccuracy(correct: number, attempted: number): number {
  if (attempted <= 0) return 0
  return Math.round((correct / attempted) * 100)
}

const empty = (): OperationStatistics => ({
  attempted: 0,
  correct: 0,
  incorrect: 0,
})

// Totals come from the saved attempts and the student's own
// I Got It Right / I Got It Wrong answers, plus any archived totals for
// older attempts, so they always match the history and are cleared with it.
export function calculateStatistics(
  attempts: readonly PracticeAttempt[],
  archived: ArchivedStatistics | null = null,
): AppStatistics {
  const byOperation: Record<MathOperation, OperationStatistics> = {
    addition: empty(),
    subtraction: empty(),
    multiplication: empty(),
    division: empty(),
  }
  const byDifficulty: Record<DifficultyLevel, OperationStatistics> = {
    1: empty(),
    2: empty(),
    3: empty(),
    4: empty(),
  }
  const overall = empty()

  for (const attempt of attempts) {
    for (const totals of [
      overall,
      byOperation[attempt.operation],
      byDifficulty[attempt.difficulty],
    ]) {
      totals.attempted += 1
      if (attempt.selfReportedCorrect) totals.correct += 1
      else totals.incorrect += 1
    }
  }

  const stats = { ...overall, byOperation, byDifficulty }
  return archived ? addTotals(stats, archived) : stats
}

function addOne(a: OperationStatistics, b: OperationStatistics) {
  return {
    attempted: a.attempted + b.attempted,
    correct: a.correct + b.correct,
    incorrect: a.incorrect + b.incorrect,
  }
}

function addTotals(a: AppStatistics, b: AppStatistics): AppStatistics {
  const byOperation = { ...a.byOperation }
  for (const op of Object.keys(byOperation) as MathOperation[]) {
    byOperation[op] = addOne(a.byOperation[op], b.byOperation[op])
  }
  const byDifficulty = { ...a.byDifficulty }
  for (const level of [1, 2, 3, 4] as const) {
    byDifficulty[level] = addOne(a.byDifficulty[level], b.byDifficulty[level])
  }
  return { ...addOne(a, b), byOperation, byDifficulty }
}

// The totals to keep when `attempts` leave the detailed history, added to
// what was archived before.
export function archiveAttempts(
  attempts: readonly PracticeAttempt[],
  previous: ArchivedStatistics | null,
): ArchivedStatistics {
  const review = attempts.filter((a) => a.source === 'mistake-review')
  return {
    ...calculateStatistics(attempts, previous),
    reviewPracticed: (previous?.reviewPracticed ?? 0) + review.length,
    reviewCorrect:
      (previous?.reviewCorrect ?? 0) +
      review.filter((a) => a.selfReportedCorrect).length,
  }
}

export interface MistakeStatistics {
  active: MistakePattern[]
  mastered: MistakePattern[]
  // Review answers (source "mistake-review") and how many were right.
  reviewPracticed: number
  reviewCorrect: number
  // Operation(s) with the most "I Got It Wrong" answers; all tied ones.
  mostMissedOperations: MathOperation[]
  // Most-missed facts first; ties go to the most recent miss.
  mostMissedFacts: MistakePattern[]
}

export const MOST_MISSED_FACT_COUNT = 5

export function sortByMisses(
  patterns: readonly MistakePattern[],
): MistakePattern[] {
  return [...patterns].sort(
    (a, b) =>
      b.incorrectCount - a.incorrectCount ||
      b.lastIncorrectAt.localeCompare(a.lastIncorrectAt),
  )
}

export function calculateMistakeStatistics(
  patterns: readonly MistakePattern[],
  attempts: readonly PracticeAttempt[],
  masteryThreshold: number,
  archived: ArchivedStatistics | null = null,
): MistakeStatistics {
  const sorted = sortByMisses(patterns)
  const review = attempts.filter((a) => a.source === 'mistake-review')

  const missesByOperation = calculateStatistics(attempts, archived).byOperation
  const most = Math.max(
    ...Object.values(missesByOperation).map((totals) => totals.incorrect),
  )
  const mostMissedOperations =
    most > 0
      ? (Object.keys(missesByOperation) as MathOperation[]).filter(
          (operation) => missesByOperation[operation].incorrect === most,
        )
      : []

  return {
    active: sorted.filter((p) => !isMastered(p, masteryThreshold)),
    mastered: sorted.filter((p) => isMastered(p, masteryThreshold)),
    reviewPracticed: review.length + (archived?.reviewPracticed ?? 0),
    reviewCorrect:
      review.filter((a) => a.selfReportedCorrect).length +
      (archived?.reviewCorrect ?? 0),
    mostMissedOperations,
    mostMissedFacts: sorted.slice(0, MOST_MISSED_FACT_COUNT),
  }
}
