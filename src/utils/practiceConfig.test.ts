import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PRACTICE_CONFIG,
  isValidPracticeConfig,
} from './practiceConfig'

describe('isValidPracticeConfig', () => {
  it('accepts the default configuration', () => {
    expect(isValidPracticeConfig(DEFAULT_PRACTICE_CONFIG)).toBe(true)
  })

  it.each([5, 10, 20, 'continuous'])('accepts session length %s', (length) => {
    expect(
      isValidPracticeConfig({
        ...DEFAULT_PRACTICE_CONFIG,
        sessionLength: length,
      }),
    ).toBe(true)
  })

  it.each([1, 2, 3, 4])('accepts difficulty %s', (difficulty) => {
    expect(
      isValidPracticeConfig({ ...DEFAULT_PRACTICE_CONFIG, difficulty }),
    ).toBe(true)
  })

  it.each([
    ['no operations', { operations: [] }],
    ['an unknown operation', { operations: ['exponent'] }],
    ['duplicate operations', { operations: ['addition', 'addition'] }],
    ['a missing difficulty', { difficulty: undefined }],
    ['an out-of-range difficulty', { difficulty: 5 }],
    ['an unsupported session length', { sessionLength: 7 }],
  ])('rejects %s', (_label, override) => {
    expect(
      isValidPracticeConfig({ ...DEFAULT_PRACTICE_CONFIG, ...override }),
    ).toBe(false)
  })

  it.each([null, undefined, 'addition', 42])('rejects %s', (value) => {
    expect(isValidPracticeConfig(value)).toBe(false)
  })
})
