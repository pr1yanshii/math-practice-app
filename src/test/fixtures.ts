import type { PracticeAttempt, PracticeSession } from '../types/session'

// Valid stored records for tests.

export function makeSession(
  overrides: Partial<PracticeSession> = {},
): PracticeSession {
  return {
    id: 'session-1',
    startedAt: '2026-10-21T09:00:00.000Z',
    completedAt: '2026-10-21T09:05:00.000Z',
    operations: ['addition', 'multiplication'],
    difficulty: 2,
    sessionLength: 5,
    attempted: 5,
    correct: 3,
    incorrect: 2,
    ...overrides,
  }
}

export function makeAttempt(
  overrides: Partial<PracticeAttempt> = {},
): PracticeAttempt {
  return {
    id: 'attempt-1',
    questionId: 'question-1',
    operation: 'multiplication',
    firstOperand: 7,
    secondOperand: 8,
    correctAnswer: 56,
    selectedAnswer: 54,
    selfReportedCorrect: true,
    difficulty: 2,
    source: 'regular',
    attemptedAt: '2026-10-21T09:01:00.000Z',
    sessionId: 'session-1',
    ...overrides,
  }
}
