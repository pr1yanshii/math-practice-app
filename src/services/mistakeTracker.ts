import type { MistakePattern } from '../types/mistake'
import type { PracticeAttempt } from '../types/session'

// One pattern per fact. Addition and multiplication don't depend on order,
// so 8 × 7 and 7 × 8 share a pattern (REQUIREMENTS.md D-8). Difficulty is
// not part of the key.
export function mistakePatternId(
  operation: PracticeAttempt['operation'],
  firstOperand: number,
  secondOperand: number,
): string {
  const commutative = operation === 'addition' || operation === 'multiplication'
  const [a, b] =
    commutative && firstOperand > secondOperand
      ? [secondOperand, firstOperand]
      : [firstOperand, secondOperand]
  return `${operation}:${a}:${b}`
}

// Returns the patterns after an attempt. Only attempts the student marked
// "I Got It Wrong" change anything: the answer they picked is not used.
export function applyMistake(
  patterns: readonly MistakePattern[],
  attempt: PracticeAttempt,
): MistakePattern[] {
  if (attempt.selfReportedCorrect) return [...patterns]

  const id = mistakePatternId(
    attempt.operation,
    attempt.firstOperand,
    attempt.secondOperand,
  )
  const existing = patterns.find((pattern) => pattern.id === id)
  if (!existing) {
    return [
      ...patterns,
      {
        id,
        operation: attempt.operation,
        firstOperand: attempt.firstOperand,
        secondOperand: attempt.secondOperand,
        correctAnswer: attempt.correctAnswer,
        difficulty: attempt.difficulty,
        incorrectCount: 1,
        similarCorrectCount: 0,
        lastIncorrectAt: attempt.attemptedAt,
        mastered: false,
      },
    ]
  }

  // Missed again: count it, and start mastery progress over
  // (REQUIREMENTS.md D-9).
  return patterns.map((pattern) =>
    pattern.id === id
      ? {
          ...pattern,
          difficulty: attempt.difficulty,
          incorrectCount: pattern.incorrectCount + 1,
          lastIncorrectAt: attempt.attemptedAt,
          similarCorrectCount: 0,
          mastered: false,
        }
      : pattern,
  )
}

// Spec §6.4: mastered after three correct similar answers. The Settings page
// can change it (masteryThreshold).
export const DEFAULT_MASTERY_THRESHOLD = 3

// Lowering the threshold in Settings counts existing progress straight away
// (REQUIREMENTS.md D-10).
export function isMastered(pattern: MistakePattern, threshold: number) {
  return pattern.mastered || pattern.similarCorrectCount >= threshold
}

// Updates patterns for any recorded attempt. Review answers update the
// pattern they came from; other answers go through applyMistake.
export function applyAttempt(
  patterns: readonly MistakePattern[],
  attempt: PracticeAttempt,
  threshold: number,
): MistakePattern[] {
  const source =
    attempt.source === 'mistake-review'
      ? patterns.find((pattern) => pattern.id === attempt.mistakePatternId)
      : undefined
  if (!source) return applyMistake(patterns, attempt)

  return patterns.map((pattern) => {
    if (pattern !== source) return pattern
    if (!attempt.selfReportedCorrect) {
      // A wrong review answer counts against the original mistake
      // (REQUIREMENTS.md D-9), not as a new pattern.
      return {
        ...pattern,
        incorrectCount: pattern.incorrectCount + 1,
        lastIncorrectAt: attempt.attemptedAt,
        similarCorrectCount: 0,
        mastered: false,
      }
    }
    const similarCorrectCount = pattern.similarCorrectCount + 1
    return {
      ...pattern,
      similarCorrectCount,
      mastered: pattern.mastered || similarCorrectCount >= threshold,
    }
  })
}

// --- Choosing what to review ----------------------------------------------

export function eligiblePatterns(
  patterns: readonly MistakePattern[],
  operations: readonly MistakePattern['operation'][],
  difficulty: MistakePattern['difficulty'],
  threshold: number,
): MistakePattern[] {
  // REQUIREMENTS.md D-6: the student's chosen operations and level.
  return patterns.filter(
    (pattern) =>
      !isMastered(pattern, threshold) &&
      operations.includes(pattern.operation) &&
      pattern.difficulty === difficulty,
  )
}

const DAY = 24 * 60 * 60 * 1000

// Spec §6.4 "Review Priority": more misses, more recent misses and fewer
// successful reviews all raise it. Always at least 1.
export function reviewPriority(pattern: MistakePattern, now: Date): number {
  const age = now.getTime() - Date.parse(pattern.lastIncorrectAt)
  const recency = age <= DAY ? 3 : age <= 7 * DAY ? 2 : age <= 30 * DAY ? 1 : 0
  return Math.max(
    1,
    1 + 3 * pattern.incorrectCount + recency - 2 * pattern.similarCorrectCount,
  )
}

// Weighted random choice, so higher priority is picked more often while
// similar priorities are mixed (Task 59). Avoids the previous pattern when
// another is available, so one session reviews several mistakes.
export function pickPattern(
  patterns: readonly MistakePattern[],
  {
    now = new Date(),
    previousId = null,
    random = Math.random,
  }: { now?: Date; previousId?: string | null; random?: () => number } = {},
): MistakePattern {
  const choices =
    patterns.length > 1
      ? patterns.filter((pattern) => pattern.id !== previousId)
      : [...patterns]
  if (choices.length === 0) throw new RangeError('No patterns to review')
  const weights = choices.map((pattern) => reviewPriority(pattern, now))
  let target = random() * weights.reduce((sum, weight) => sum + weight, 0)
  for (let i = 0; i < choices.length; i++) {
    target -= weights[i]
    if (target < 0) return choices[i]
  }
  return choices[choices.length - 1]
}

// Why mistake review can't start, if it can't.
export type ReviewUnavailableReason =
  'no-mistakes' | 'all-mastered' | 'no-match'

export function reviewAvailability(
  patterns: readonly MistakePattern[],
  operations: readonly MistakePattern['operation'][],
  difficulty: MistakePattern['difficulty'],
  threshold: number,
): { count: number; reason: ReviewUnavailableReason | null } {
  const count = eligiblePatterns(
    patterns,
    operations,
    difficulty,
    threshold,
  ).length
  if (count > 0) return { count, reason: null }
  if (patterns.length === 0) return { count, reason: 'no-mistakes' }
  if (patterns.every((pattern) => isMastered(pattern, threshold))) {
    return { count, reason: 'all-mastered' }
  }
  return { count, reason: 'no-match' }
}
