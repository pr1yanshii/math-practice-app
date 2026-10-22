import { eligiblePatterns, pickPattern } from '../services/mistakeTracker'
import { generateNextQuestion } from '../services/questionGenerator'
import { generateSimilarQuestion } from '../services/similarQuestionGenerator'
import type { MistakePattern } from '../types/mistake'
import type { Question } from '../types/question'
import type {
  PracticeAttempt,
  PracticeConfig,
  PracticeSession,
} from '../types/session'
import { createId } from '../utils/ids'

export interface PracticeSessionState {
  session: PracticeSession
  currentQuestion: Question
  // 0-based; the card shows currentQuestionIndex + 1.
  currentQuestionIndex: number
  attempts: PracticeAttempt[]
  isActive: boolean
  // Set when a mistake-review session ran out of unmastered mistakes.
  allMastered: boolean
}

export type PracticeSessionAction =
  | {
      type: 'recordResult'
      attempt: PracticeAttempt
      // null: no more review questions (every mistake is mastered).
      nextQuestion: Question | null
    }
  | { type: 'endSession'; endedAt: string }

// The next question: a regular one, or for mistake review a question
// similar to a high-priority unmastered mistake. null when review has no
// mistakes left.
export function chooseNextQuestion(
  config: PracticeConfig,
  patterns: readonly MistakePattern[],
  masteryThreshold: number,
  previous: Question | null,
): Question | null {
  if (config.reviewMode !== 'mistakes') {
    return generateNextQuestion(config.operations, config.difficulty, previous)
  }
  const eligible = eligiblePatterns(
    patterns,
    config.operations,
    config.difficulty,
    masteryThreshold,
  )
  if (eligible.length === 0) return null
  const pattern = pickPattern(eligible, {
    previousId: previous?.mistakePatternId ?? null,
  })
  return generateSimilarQuestion(pattern, {
    operations: config.operations,
    previous,
  })
}

export function createSessionState(
  config: PracticeConfig,
  now: Date = new Date(),
  firstQuestion: Question = generateNextQuestion(
    config.operations,
    config.difficulty,
    null,
  ),
): PracticeSessionState {
  return {
    session: {
      id: createId(),
      startedAt: now.toISOString(),
      operations: [...config.operations],
      difficulty: config.difficulty,
      sessionLength: config.sessionLength,
      attempted: 0,
      correct: 0,
      incorrect: 0,
    },
    currentQuestion: firstQuestion,
    currentQuestionIndex: 0,
    attempts: [],
    isActive: true,
    allMastered: false,
  }
}

// Pure: ids, times and the next question come in with the action, so the
// same action always gives the same result.
export function practiceSessionReducer(
  state: PracticeSessionState,
  action: PracticeSessionAction,
): PracticeSessionState {
  switch (action.type) {
    case 'recordResult': {
      const { attempt } = action
      // Only the question on screen can be answered, and only once. This
      // ignores repeated clicks and late events from an earlier card.
      if (
        !state.isActive ||
        attempt.questionId !== state.currentQuestion.id ||
        state.attempts.some((a) => a.questionId === attempt.questionId)
      ) {
        return state
      }

      const attempts = [...state.attempts, attempt]
      const session: PracticeSession = {
        ...state.session,
        attempted: state.session.attempted + 1,
        correct: state.session.correct + (attempt.selfReportedCorrect ? 1 : 0),
        incorrect:
          state.session.incorrect + (attempt.selfReportedCorrect ? 0 : 1),
      }

      const { sessionLength } = session
      if (
        sessionLength !== 'continuous' &&
        session.attempted >= sessionLength
      ) {
        return {
          ...state,
          session: { ...session, completedAt: attempt.attemptedAt },
          attempts,
          isActive: false,
        }
      }

      // Mistake review with nothing left to review ends early.
      if (action.nextQuestion === null) {
        return {
          ...state,
          session: { ...session, completedAt: attempt.attemptedAt },
          attempts,
          isActive: false,
          allMastered: true,
        }
      }

      return {
        ...state,
        session,
        attempts,
        currentQuestion: action.nextQuestion,
        currentQuestionIndex: state.currentQuestionIndex + 1,
      }
    }
    case 'endSession':
      if (!state.isActive) return state
      return {
        ...state,
        session: { ...state.session, completedAt: action.endedAt },
        isActive: false,
      }
  }
}
