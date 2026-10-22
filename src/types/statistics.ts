// Shapes follow specification §10.4.
import type { DifficultyLevel, MathOperation } from './question'

export interface OperationStatistics {
  attempted: number
  correct: number
  incorrect: number
}

export interface AppStatistics {
  attempted: number
  correct: number
  incorrect: number
  byOperation: Record<MathOperation, OperationStatistics>
  byDifficulty: Record<DifficultyLevel, OperationStatistics>
}

// Totals for attempts moved out of the detailed history to keep storage
// small (Task 84; stored as mathPractice.statistics, spec §11).
export interface ArchivedStatistics extends AppStatistics {
  reviewPracticed: number
  reviewCorrect: number
}
