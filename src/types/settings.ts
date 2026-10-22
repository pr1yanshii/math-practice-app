// The specification names these settings (§6.7) but gives no interface,
// so the field names here are our own.
import type { DifficultyLevel, MathOperation } from './question'
import type { SessionLength } from './session'

export interface AppSettings {
  soundEnabled: boolean
  animationsEnabled: boolean
  showExplanations: boolean
  // Short encouraging messages after each answer (Task 73).
  feedbackEnabled: boolean
  defaultSessionLength: SessionLength
  defaultDifficulty: DifficultyLevel
  defaultOperations: MathOperation[]
  masteryThreshold: number
}
