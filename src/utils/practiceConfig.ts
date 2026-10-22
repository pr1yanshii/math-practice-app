import type { DifficultyLevel, MathOperation } from '../types/question'
import type { PracticeConfig, SessionLength } from '../types/session'

export interface OperationOption {
  value: MathOperation
  label: string
  symbol: string
}

export interface DifficultyOption {
  value: DifficultyLevel
  name: string
  description: string
}

export interface SessionLengthOption {
  value: SessionLength
  label: string
  description: string
}

export const OPERATION_OPTIONS: readonly OperationOption[] = [
  { value: 'addition', label: 'Addition', symbol: '+' },
  { value: 'subtraction', label: 'Subtraction', symbol: '−' },
  { value: 'multiplication', label: 'Multiplication', symbol: '×' },
  { value: 'division', label: 'Division', symbol: '÷' },
]

// Descriptions summarise the number ranges in specification §7.
export const DIFFICULTY_OPTIONS: readonly DifficultyOption[] = [
  {
    value: 1,
    name: 'Beginner',
    description: 'Numbers up to 10. Times tables up to 5.',
  },
  {
    value: 2,
    name: 'Easy',
    description: 'Numbers up to 50. Times tables up to 10.',
  },
  {
    value: 3,
    name: 'Intermediate',
    description: 'Numbers up to 100. Divide by numbers up to 12.',
  },
  {
    value: 4,
    name: 'Advanced',
    description: 'Numbers up to 1,000. Multiply two-digit numbers.',
  },
]

export const SESSION_LENGTH_OPTIONS: readonly SessionLengthOption[] = [
  { value: 5, label: '5 questions', description: 'A quick warm-up' },
  { value: 10, label: '10 questions', description: 'A good practice' },
  { value: 20, label: '20 questions', description: 'A big challenge' },
  {
    value: 'continuous',
    label: 'Keep going',
    description: 'No limit. Stop when you are ready.',
  },
]

// The starting values for the default-practice settings (services/settings.ts).
export const DEFAULT_PRACTICE_CONFIG: PracticeConfig = {
  operations: OPERATION_OPTIONS.map((option) => option.value),
  difficulty: 1,
  sessionLength: 10,
}

// Also used to check configs that arrive from outside the setup page,
// such as navigation state, so it accepts unknown input.
export function isValidPracticeConfig(value: unknown): value is PracticeConfig {
  if (typeof value !== 'object' || value === null) return false
  const config = value as Record<string, unknown>
  const { operations, difficulty, sessionLength, reviewMode } = config

  return (
    (reviewMode === undefined ||
      reviewMode === 'regular' ||
      reviewMode === 'mistakes') &&
    Array.isArray(operations) &&
    operations.length > 0 &&
    new Set(operations).size === operations.length &&
    operations.every((operation) =>
      OPERATION_OPTIONS.some((option) => option.value === operation),
    ) &&
    DIFFICULTY_OPTIONS.some((option) => option.value === difficulty) &&
    SESSION_LENGTH_OPTIONS.some((option) => option.value === sessionLength)
  )
}
