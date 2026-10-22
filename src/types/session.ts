// Shapes follow specification §10.1 and §10.2.
import type { DifficultyLevel, MathOperation, QuestionSource } from './question'

export type SessionLength = number | 'continuous'

export type ReviewMode = 'regular' | 'mistakes'

// What the setup page hands to the practice session. No reviewMode means
// regular practice.
export interface PracticeConfig {
  operations: MathOperation[]
  difficulty: DifficultyLevel
  sessionLength: SessionLength
  reviewMode?: ReviewMode
}

export interface PracticeAttempt {
  id: string
  questionId: string
  operation: MathOperation
  firstOperand: number
  secondOperand: number
  correctAnswer: number
  selectedAnswer: number
  // The student's own judgement from "I Got It Right" / "I Got It Wrong".
  // It is not derived from comparing selectedAnswer with correctAnswer.
  selfReportedCorrect: boolean
  difficulty: DifficultyLevel
  source: QuestionSource
  // For mistake-review questions: the pattern the question came from
  // (not in spec §10.1; needed to update that pattern).
  mistakePatternId?: string
  attemptedAt: string
  sessionId: string
}

export interface PracticeSession {
  id: string
  startedAt: string
  completedAt?: string
  operations: MathOperation[]
  difficulty: DifficultyLevel
  sessionLength: SessionLength
  attempted: number
  correct: number
  incorrect: number
}
