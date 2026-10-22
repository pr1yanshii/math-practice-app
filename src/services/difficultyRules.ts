import type { DifficultyLevel } from '../types/question'

// Number limits for each level, from specification §7. Limits the
// specification leaves open are implementation decisions; see
// REQUIREMENTS.md D-3/D-4 and DEVELOPMENT_LOG.md (Phase 4).

export interface NumberRange {
  min: number
  max: number
}

export type FactorPair = readonly [NumberRange, NumberRange]

export interface DifficultyRules {
  addition: { operand: NumberRange; maxResult?: number }
  // The first operand is always at least the second: no negative answers.
  subtraction: { operand: NumberRange }
  // One pair is chosen per question; the two factors may appear in
  // either order.
  multiplication: { factorPairs: readonly FactorPair[] }
  division: {
    divisor: NumberRange
    quotient: NumberRange
    maxDividend?: number
  }
}

const ONE_DIGIT: NumberRange = { min: 0, max: 9 }
const TWO_DIGIT: NumberRange = { min: 10, max: 99 }

export const DIFFICULTY_RULES: Record<DifficultyLevel, DifficultyRules> = {
  1: {
    addition: { operand: { min: 0, max: 10 }, maxResult: 20 },
    subtraction: { operand: { min: 0, max: 10 } },
    multiplication: {
      factorPairs: [
        [
          { min: 0, max: 5 },
          { min: 0, max: 5 },
        ],
      ],
    },
    division: { divisor: { min: 1, max: 5 }, quotient: { min: 0, max: 5 } },
  },
  2: {
    addition: { operand: { min: 0, max: 50 }, maxResult: 100 },
    subtraction: { operand: { min: 0, max: 50 } },
    multiplication: {
      factorPairs: [
        [
          { min: 0, max: 10 },
          { min: 0, max: 10 },
        ],
      ],
    },
    division: { divisor: { min: 1, max: 10 }, quotient: { min: 0, max: 10 } },
  },
  3: {
    addition: { operand: { min: 0, max: 100 } },
    subtraction: { operand: { min: 0, max: 100 } },
    multiplication: {
      factorPairs: [
        [ONE_DIGIT, ONE_DIGIT],
        [ONE_DIGIT, TWO_DIGIT],
      ],
    },
    division: {
      divisor: { min: 1, max: 12 },
      quotient: { min: 0, max: 12 },
      maxDividend: 144,
    },
  },
  4: {
    addition: { operand: { min: 100, max: 1000 } },
    subtraction: { operand: { min: 100, max: 1000 } },
    multiplication: {
      factorPairs: [
        [TWO_DIGIT, { min: 2, max: 9 }],
        [TWO_DIGIT, TWO_DIGIT],
      ],
    },
    division: { divisor: { min: 2, max: 20 }, quotient: { min: 10, max: 50 } },
  },
}

export function isInRange(value: number, range: NumberRange): boolean {
  return value >= range.min && value <= range.max
}
