import type { AppSettings } from '../types/settings'
import { DEFAULT_MASTERY_THRESHOLD } from './mistakeTracker'
import {
  DEFAULT_PRACTICE_CONFIG,
  DIFFICULTY_OPTIONS,
  OPERATION_OPTIONS,
  SESSION_LENGTH_OPTIONS,
} from '../utils/practiceConfig'

// REQUIREMENTS.md D-10 (mastery threshold 3) and D-22 (defaults).
export const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: false,
  animationsEnabled: true,
  showExplanations: true,
  feedbackEnabled: true,
  defaultSessionLength: DEFAULT_PRACTICE_CONFIG.sessionLength,
  defaultDifficulty: DEFAULT_PRACTICE_CONFIG.difficulty,
  defaultOperations: [...DEFAULT_PRACTICE_CONFIG.operations],
  masteryThreshold: DEFAULT_MASTERY_THRESHOLD,
}

type Check = (value: unknown) => boolean

const isBoolean: Check = (value) => typeof value === 'boolean'

// One check per field, so a bad field can fall back to its default without
// losing the student's other settings.
const FIELD_CHECKS: Record<keyof AppSettings, Check> = {
  soundEnabled: isBoolean,
  animationsEnabled: isBoolean,
  showExplanations: isBoolean,
  feedbackEnabled: isBoolean,
  defaultSessionLength: (value) =>
    SESSION_LENGTH_OPTIONS.some((option) => option.value === value),
  defaultDifficulty: (value) =>
    DIFFICULTY_OPTIONS.some((option) => option.value === value),
  defaultOperations: (value) =>
    Array.isArray(value) &&
    value.length > 0 &&
    new Set(value).size === value.length &&
    value.every((operation) =>
      OPERATION_OPTIONS.some((option) => option.value === operation),
    ),
  masteryThreshold: (value) =>
    Number.isInteger(value) &&
    (value as number) >= 1 &&
    (value as number) <= 10,
}

// Keeps every valid stored field and uses the default for the rest.
export function sanitizeSettings(value: unknown): {
  settings: AppSettings
  allValid: boolean
} {
  const stored =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  const settings = { ...DEFAULT_SETTINGS } as Record<string, unknown>
  let allValid = stored === value

  for (const [field, check] of Object.entries(FIELD_CHECKS)) {
    if (check(stored[field])) settings[field] = stored[field]
    else allValid = false
  }
  return { settings: settings as unknown as AppSettings, allValid }
}
