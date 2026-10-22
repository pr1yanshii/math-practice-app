import { describe, expect, it } from 'vitest'
import { makeAttempt } from '../test/fixtures'
import type { MistakePattern } from '../types/mistake'
import {
  calculateMistakeStatistics,
  calculateStatistics,
} from './statisticsService'

const zero = { attempted: 0, correct: 0, incorrect: 0 }

describe('calculateStatistics', () => {
  it('is all zeros with no attempts', () => {
    expect(calculateStatistics([])).toEqual({
      ...zero,
      byOperation: {
        addition: zero,
        subtraction: zero,
        multiplication: zero,
        division: zero,
      },
      byDifficulty: { 1: zero, 2: zero, 3: zero, 4: zero },
    })
  })

  it('totals overall, by operation and by level from self-reports', () => {
    const stats = calculateStatistics([
      // Picked wrong but said right: counts as correct.
      makeAttempt({
        id: '1',
        operation: 'addition',
        firstOperand: 2,
        secondOperand: 3,
        correctAnswer: 5,
        selectedAnswer: 6,
        selfReportedCorrect: true,
        difficulty: 1,
      }),
      // Picked right but said wrong: counts as incorrect.
      makeAttempt({
        id: '2',
        operation: 'addition',
        firstOperand: 2,
        secondOperand: 3,
        correctAnswer: 5,
        selectedAnswer: 5,
        selfReportedCorrect: false,
        difficulty: 1,
      }),
      makeAttempt({ id: '3', selfReportedCorrect: true, difficulty: 2 }),
      makeAttempt({
        id: '4',
        operation: 'division',
        firstOperand: 56,
        secondOperand: 7,
        correctAnswer: 8,
        selfReportedCorrect: false,
        difficulty: 4,
      }),
    ])

    expect(stats).toMatchObject({ attempted: 4, correct: 2, incorrect: 2 })
    expect(stats.byOperation).toEqual({
      addition: { attempted: 2, correct: 1, incorrect: 1 },
      subtraction: zero,
      multiplication: { attempted: 1, correct: 1, incorrect: 0 },
      division: { attempted: 1, correct: 0, incorrect: 1 },
    })
    expect(stats.byDifficulty).toEqual({
      1: { attempted: 2, correct: 1, incorrect: 1 },
      2: { attempted: 1, correct: 1, incorrect: 0 },
      3: zero,
      4: { attempted: 1, correct: 0, incorrect: 1 },
    })
  })

  it('handles several thousand attempts', () => {
    const attempts = Array.from({ length: 5000 }, (_, i) =>
      makeAttempt({ id: `a${i}`, selfReportedCorrect: i % 4 !== 0 }),
    )
    expect(calculateStatistics(attempts)).toMatchObject({
      attempted: 5000,
      correct: 3750,
      incorrect: 1250,
    })
  })
})

describe('calculateMistakeStatistics', () => {
  const p = (
    id: string,
    overrides: Partial<MistakePattern> = {},
  ): MistakePattern => ({
    id,
    operation: 'multiplication',
    firstOperand: 7,
    secondOperand: 8,
    correctAnswer: 56,
    difficulty: 2,
    incorrectCount: 1,
    similarCorrectCount: 0,
    lastIncorrectAt: '2026-10-21T10:00:00.000Z',
    mastered: false,
    ...overrides,
  })

  it('is empty with no mistakes', () => {
    expect(calculateMistakeStatistics([], [], 3)).toEqual({
      active: [],
      mastered: [],
      reviewPracticed: 0,
      reviewCorrect: 0,
      mostMissedOperations: [],
      mostMissedFacts: [],
    })
  })

  it('splits active and mastered (including by a lowered threshold)', () => {
    const stats = calculateMistakeStatistics(
      [p('a'), p('b', { mastered: true }), p('c', { similarCorrectCount: 2 })],
      [],
      2,
    )
    expect(stats.active.map((x) => x.id)).toEqual(['a'])
    expect(stats.mastered.map((x) => x.id).sort()).toEqual(['b', 'c'])
  })

  it('counts review questions and the ones answered right', () => {
    const review = (selfReportedCorrect: boolean, id: string) =>
      makeAttempt({ id, source: 'mistake-review', selfReportedCorrect })
    const stats = calculateMistakeStatistics(
      [],
      [
        review(true, '1'),
        review(false, '2'),
        review(true, '3'),
        makeAttempt({ id: '4' }),
      ],
      3,
    )
    expect(stats).toMatchObject({ reviewPracticed: 3, reviewCorrect: 2 })
  })

  it('finds the most missed operation, listing ties together', () => {
    const wrong = (id: string, operation: 'addition' | 'division') =>
      operation === 'addition'
        ? makeAttempt({
            id,
            operation,
            firstOperand: 1,
            secondOperand: 1,
            correctAnswer: 2,
            selfReportedCorrect: false,
          })
        : makeAttempt({
            id,
            operation,
            firstOperand: 4,
            secondOperand: 2,
            correctAnswer: 2,
            selfReportedCorrect: false,
          })
    expect(
      calculateMistakeStatistics(
        [],
        [
          wrong('1', 'addition'),
          wrong('2', 'division'),
          wrong('3', 'division'),
        ],
        3,
      ).mostMissedOperations,
    ).toEqual(['division'])
    expect(
      calculateMistakeStatistics(
        [],
        [wrong('1', 'addition'), wrong('2', 'division')],
        3,
      ).mostMissedOperations,
    ).toEqual(['addition', 'division'])
  })

  it('sorts facts by misses, breaking ties by the most recent, top 5', () => {
    const stats = calculateMistakeStatistics(
      [
        p('once-old', { lastIncorrectAt: '2026-10-01T00:00:00.000Z' }),
        p('three', { incorrectCount: 3 }),
        p('once-new', { lastIncorrectAt: '2026-10-20T00:00:00.000Z' }),
        p('two', { incorrectCount: 2 }),
        p('x1'),
        p('x2'),
      ],
      [],
      3,
    )
    expect(stats.mostMissedFacts.map((x) => x.id)).toEqual([
      'three',
      'two',
      'x1',
      'x2',
      'once-new',
    ])
  })
})
