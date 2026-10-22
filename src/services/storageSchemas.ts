import type { MistakePattern } from '../types/mistake'
import type { Question } from '../types/question'
import type {
  ArchivedStatistics,
  OperationStatistics,
} from '../types/statistics'
import type {
  PracticeAttempt,
  PracticeConfig,
  PracticeSession,
} from '../types/session'
import { calculateAnswer } from '../utils/math'
import {
  DIFFICULTY_OPTIONS,
  OPERATION_OPTIONS,
  isValidPracticeConfig,
} from '../utils/practiceConfig'
import { validateQuestion } from '../utils/validation'

// Checks for records read back from localStorage, which may have been
// edited, truncated, or written by another version of the app.

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0

const isTimestamp = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value))

const isCount = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0

export function isPracticeSession(value: unknown): value is PracticeSession {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Record<string, unknown>
  return (
    isNonEmptyString(s.id) &&
    isTimestamp(s.startedAt) &&
    (s.completedAt === undefined || isTimestamp(s.completedAt)) &&
    isValidPracticeConfig({
      operations: s.operations,
      difficulty: s.difficulty,
      sessionLength: s.sessionLength,
    }) &&
    isCount(s.attempted) &&
    isCount(s.correct) &&
    isCount(s.incorrect) &&
    s.correct + s.incorrect === s.attempted
  )
}

export function isPracticeAttempt(value: unknown): value is PracticeAttempt {
  if (typeof value !== 'object' || value === null) return false
  const a = value as Record<string, unknown>
  return (
    isNonEmptyString(a.id) &&
    isNonEmptyString(a.questionId) &&
    isNonEmptyString(a.sessionId) &&
    OPERATION_OPTIONS.some((option) => option.value === a.operation) &&
    isCount(a.firstOperand) &&
    isCount(a.secondOperand) &&
    isCount(a.correctAnswer) &&
    isCount(a.selectedAnswer) &&
    typeof a.selfReportedCorrect === 'boolean' &&
    DIFFICULTY_OPTIONS.some((option) => option.value === a.difficulty) &&
    (a.source === 'regular' || a.source === 'mistake-review') &&
    (a.mistakePatternId === undefined ||
      isNonEmptyString(a.mistakePatternId)) &&
    isTimestamp(a.attemptedAt) &&
    // The stored answer must actually match the stored question.
    a.correctAnswer ===
      calculateAnswer(
        a.operation as PracticeAttempt['operation'],
        a.firstOperand,
        a.secondOperand,
      )
  )
}

export function isMistakePattern(value: unknown): value is MistakePattern {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Record<string, unknown>
  return (
    isNonEmptyString(p.id) &&
    OPERATION_OPTIONS.some((option) => option.value === p.operation) &&
    isCount(p.firstOperand) &&
    isCount(p.secondOperand) &&
    isCount(p.correctAnswer) &&
    p.correctAnswer ===
      calculateAnswer(
        p.operation as MistakePattern['operation'],
        p.firstOperand,
        p.secondOperand,
      ) &&
    DIFFICULTY_OPTIONS.some((option) => option.value === p.difficulty) &&
    isCount(p.incorrectCount) &&
    p.incorrectCount >= 1 &&
    isCount(p.similarCorrectCount) &&
    isTimestamp(p.lastIncorrectAt) &&
    typeof p.mastered === 'boolean'
  )
}

// What is saved while a session is in progress (Task 74).
export interface ActiveSessionSnapshot {
  // React Router's location key: the same after a browser refresh, new for
  // every new navigation (for example Practice Again).
  routeKey: string
  config: PracticeConfig
  session: PracticeSession
  currentQuestion: Question
  attempts: PracticeAttempt[]
  // The session's own copy of the mistake patterns (mistake review).
  patterns: MistakePattern[]
  masteryThreshold: number
  selectedAnswer: number | null
  isCardFlipped: boolean
}

function isQuestion(value: unknown): value is Question {
  if (typeof value !== 'object' || value === null) return false
  const q = value as Partial<Question>
  return (
    isNonEmptyString(q.id) &&
    Array.isArray(q.choices) &&
    (q.source === 'regular' || q.source === 'mistake-review') &&
    (q.mistakePatternId === undefined ||
      isNonEmptyString(q.mistakePatternId)) &&
    typeof q.displayText === 'string' &&
    validateQuestion(q as Question).length === 0
  )
}

export function isActiveSessionSnapshot(
  value: unknown,
): value is ActiveSessionSnapshot {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Record<string, unknown>
  const session = s.session as PracticeSession
  const attempts = s.attempts as unknown[]
  const question = s.currentQuestion as Question
  return (
    isNonEmptyString(s.routeKey) &&
    isValidPracticeConfig(s.config) &&
    isPracticeSession(session) &&
    session.completedAt === undefined &&
    isQuestion(question) &&
    Array.isArray(attempts) &&
    attempts.every(isPracticeAttempt) &&
    // The counts must agree with the attempts, each for this session.
    attempts.length === session.attempted &&
    (attempts as PracticeAttempt[]).every((a) => a.sessionId === session.id) &&
    !(attempts as PracticeAttempt[]).some(
      (a) => a.questionId === question.id,
    ) &&
    Array.isArray(s.patterns) &&
    s.patterns.every(isMistakePattern) &&
    Number.isInteger(s.masteryThreshold) &&
    (s.masteryThreshold as number) >= 1 &&
    (s.selectedAnswer === null ||
      question.choices.includes(s.selectedAnswer as number)) &&
    typeof s.isCardFlipped === 'boolean' &&
    // A flipped card always has an answer.
    (!s.isCardFlipped || s.selectedAnswer !== null)
  )
}

function isTotals(value: unknown): value is OperationStatistics {
  if (typeof value !== 'object' || value === null) return false
  const t = value as Record<string, unknown>
  return (
    isCount(t.attempted) &&
    isCount(t.correct) &&
    isCount(t.incorrect) &&
    t.correct + t.incorrect === t.attempted
  )
}

// Archived totals must be internally consistent: the per-operation and
// per-level totals each add up to the overall totals.
export function isArchivedStatistics(
  value: unknown,
): value is ArchivedStatistics {
  if (!isTotals(value)) return false
  const s = value as unknown as ArchivedStatistics
  const groups = [s.byOperation, s.byDifficulty]
  if (!groups.every((g) => typeof g === 'object' && g !== null)) return false
  const operations = OPERATION_OPTIONS.map((o) => s.byOperation[o.value])
  const levels = DIFFICULTY_OPTIONS.map((o) => s.byDifficulty[o.value])
  const sums = (list: OperationStatistics[]) =>
    list.every(isTotals) &&
    list.reduce((n, t) => n + t.attempted, 0) === s.attempted &&
    list.reduce((n, t) => n + t.correct, 0) === s.correct
  return (
    sums(operations) &&
    sums(levels) &&
    isCount(s.reviewPracticed) &&
    isCount(s.reviewCorrect) &&
    s.reviewCorrect <= s.reviewPracticed &&
    s.reviewPracticed <= s.attempted
  )
}
