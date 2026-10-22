import { describe, expect, it } from 'vitest'
import { makeAttempt } from '../test/fixtures'
import type { MistakePattern } from '../types/mistake'
import {
  DEFAULT_MASTERY_THRESHOLD,
  applyAttempt,
  applyMistake,
  eligiblePatterns,
  isMastered,
  mistakePatternId,
  pickPattern,
  reviewAvailability,
  reviewPriority,
} from './mistakeTracker'

const wrong = (overrides = {}) =>
  makeAttempt({ selfReportedCorrect: false, ...overrides })

describe('mistakePatternId', () => {
  it('treats 8 × 7 and 7 × 8 (and 3 + 5, 5 + 3) as the same fact', () => {
    expect(mistakePatternId('multiplication', 8, 7)).toBe(
      mistakePatternId('multiplication', 7, 8),
    )
    expect(mistakePatternId('addition', 3, 5)).toBe(
      mistakePatternId('addition', 5, 3),
    )
  })

  it('keeps order for subtraction and division', () => {
    expect(mistakePatternId('subtraction', 9, 4)).not.toBe(
      mistakePatternId('subtraction', 4, 9),
    )
    expect(mistakePatternId('division', 8, 2)).not.toBe(
      mistakePatternId('division', 2, 8),
    )
  })

  it('separates operations with the same numbers', () => {
    expect(mistakePatternId('addition', 2, 2)).not.toBe(
      mistakePatternId('multiplication', 2, 2),
    )
  })
})

describe('applyMistake', () => {
  it('creates a pattern with every field after "I Got It Wrong"', () => {
    const attempt = wrong({ attemptedAt: '2026-10-21T10:00:00.000Z' })
    expect(applyMistake([], attempt)).toEqual([
      {
        id: 'multiplication:7:8',
        operation: 'multiplication',
        firstOperand: 7,
        secondOperand: 8,
        correctAnswer: 56,
        difficulty: 2,
        incorrectCount: 1,
        similarCorrectCount: 0,
        lastIncorrectAt: '2026-10-21T10:00:00.000Z',
        mastered: false,
      },
    ])
  })

  it('uses the self-report, not the picked answer', () => {
    // Picked the right answer but said "wrong": a mistake.
    expect(applyMistake([], wrong({ selectedAnswer: 56 }))).toHaveLength(1)
    // Picked a wrong answer but said "right": not a mistake.
    expect(
      applyMistake(
        [],
        makeAttempt({ selectedAnswer: 54, selfReportedCorrect: true }),
      ),
    ).toEqual([])
  })

  it('updates the same fact instead of adding a duplicate, in either order', () => {
    let patterns = applyMistake(
      [],
      wrong({ attemptedAt: '2026-10-21T10:00:00.000Z' }),
    )
    patterns = applyMistake(
      patterns,
      wrong({
        id: 'a2',
        questionId: 'q2',
        firstOperand: 8,
        secondOperand: 7,
        difficulty: 3,
        attemptedAt: '2026-10-22T10:00:00.000Z',
      }),
    )

    expect(patterns).toHaveLength(1)
    expect(patterns[0]).toMatchObject({
      id: 'multiplication:7:8',
      incorrectCount: 2,
      lastIncorrectAt: '2026-10-22T10:00:00.000Z',
      difficulty: 3,
    })
  })

  it('starts mastery progress over after a new miss', () => {
    const mastered = {
      ...applyMistake([], wrong())[0],
      similarCorrectCount: 3,
      mastered: true,
    }
    const [updated] = applyMistake([mastered], wrong({ id: 'a2' }))
    expect(updated).toMatchObject({
      similarCorrectCount: 0,
      mastered: false,
      incorrectCount: 2,
    })
  })

  it('leaves other patterns alone and does not change its input', () => {
    const other = applyMistake(
      [],
      wrong({
        operation: 'addition',
        firstOperand: 2,
        secondOperand: 3,
        correctAnswer: 5,
      }),
    )
    const snapshot = structuredClone(other)
    const patterns = applyMistake(other, wrong())
    expect(patterns).toHaveLength(2)
    expect(patterns[0]).toEqual(snapshot[0])
    expect(other).toEqual(snapshot)
  })
})

describe('review results (applyAttempt)', () => {
  const base = () => applyMistake([], wrong())[0]
  const review = (selfReportedCorrect: boolean, overrides = {}) =>
    makeAttempt({
      id: `r-${Math.random()}`,
      questionId: `rq-${Math.random()}`,
      operation: 'division',
      firstOperand: 56,
      secondOperand: 7,
      correctAnswer: 8,
      source: 'mistake-review',
      mistakePatternId: 'multiplication:7:8',
      selfReportedCorrect,
      attemptedAt: '2026-10-23T10:00:00.000Z',
      ...overrides,
    })

  it('counts a correct review answer on the original pattern', () => {
    const [p] = applyAttempt([base()], review(true), 3)
    expect(p).toMatchObject({
      id: 'multiplication:7:8',
      similarCorrectCount: 1,
      mastered: false,
      incorrectCount: 1,
    })
  })

  it('masters the pattern at the threshold (3 by default)', () => {
    let patterns = [base()]
    for (let i = 0; i < 2; i++)
      patterns = applyAttempt(patterns, review(true), 3)
    expect(patterns[0].mastered).toBe(false)
    patterns = applyAttempt(patterns, review(true), DEFAULT_MASTERY_THRESHOLD)
    expect(patterns[0]).toMatchObject({
      similarCorrectCount: 3,
      mastered: true,
    })
  })

  it('uses a configured threshold', () => {
    const one = applyAttempt([base()], review(true), 1)
    expect(one[0].mastered).toBe(true)
    let five = [base()]
    for (let i = 0; i < 4; i++) five = applyAttempt(five, review(true), 5)
    expect(five[0].mastered).toBe(false)
  })

  it('a wrong review answer sends the original back to the start, without a new pattern', () => {
    const progressed = { ...base(), similarCorrectCount: 2 }
    const patterns = applyAttempt([progressed], review(false), 3)
    expect(patterns).toHaveLength(1)
    expect(patterns[0]).toMatchObject({
      id: 'multiplication:7:8',
      incorrectCount: 2,
      similarCorrectCount: 0,
      mastered: false,
      lastIncorrectAt: '2026-10-23T10:00:00.000Z',
    })
  })

  it('a mastered pattern returns after a new regular mistake', () => {
    const mastered = { ...base(), similarCorrectCount: 3, mastered: true }
    const [p] = applyAttempt([mastered], wrong({ id: 'later' }), 3)
    expect(p).toMatchObject({ mastered: false, similarCorrectCount: 0 })
    expect(isMastered(p, 3)).toBe(false)
  })

  it('regular answers keep working as before', () => {
    expect(
      applyAttempt([], makeAttempt({ selfReportedCorrect: true }), 3),
    ).toEqual([])
    expect(applyAttempt([], wrong(), 3)).toHaveLength(1)
  })

  it('a review answer for a pattern that no longer exists is treated as a regular answer', () => {
    expect(applyAttempt([], review(true), 3)).toEqual([])
    expect(applyAttempt([], review(false), 3)[0].id).toBe('division:56:7')
  })
})

describe('isMastered', () => {
  it('counts progress against a lowered threshold straight away', () => {
    const p = { ...applyMistake([], wrong())[0], similarCorrectCount: 2 }
    expect(isMastered(p, 3)).toBe(false)
    expect(isMastered(p, 2)).toBe(true)
  })
})

describe('choosing what to review', () => {
  const now = new Date('2026-10-21T12:00:00.000Z')
  const make = (
    id: string,
    overrides: Partial<MistakePattern> = {},
  ): MistakePattern => ({
    ...applyMistake([], wrong())[0],
    id,
    lastIncorrectAt: '2026-10-21T10:00:00.000Z',
    ...overrides,
  })

  it('ranks frequent, recent and unreviewed mistakes higher', () => {
    expect(
      reviewPriority(make('a', { incorrectCount: 3 }), now),
    ).toBeGreaterThan(reviewPriority(make('b', { incorrectCount: 1 }), now))
    expect(reviewPriority(make('a'), now)).toBeGreaterThan(
      reviewPriority(
        make('b', { lastIncorrectAt: '2026-08-01T10:00:00.000Z' }),
        now,
      ),
    )
    expect(reviewPriority(make('a'), now)).toBeGreaterThan(
      reviewPriority(make('b', { similarCorrectCount: 2 }), now),
    )
    expect(reviewPriority(make('a', { similarCorrectCount: 50 }), now)).toBe(1)
  })

  it('picks higher-priority patterns more often, but not only them', () => {
    const high = make('high', { incorrectCount: 5 })
    const low = make('low', { lastIncorrectAt: '2026-01-01T00:00:00.000Z' })
    const counts = { high: 0, low: 0 }
    for (let i = 0; i < 2000; i++) {
      counts[pickPattern([high, low], { now }).id as 'high' | 'low']++
    }
    expect(counts.high).toBeGreaterThan(counts.low * 3)
    expect(counts.low).toBeGreaterThan(0)
  })

  it('mixes patterns of similar priority', () => {
    const seen = new Set<string>()
    const patterns = ['a', 'b', 'c'].map((id) => make(id))
    for (let i = 0; i < 300; i++) seen.add(pickPattern(patterns, { now }).id)
    expect(seen.size).toBe(3)
  })

  it('avoids the previous pattern when another is available', () => {
    const patterns = [make('a', { incorrectCount: 9 }), make('b')]
    for (let i = 0; i < 100; i++) {
      expect(pickPattern(patterns, { now, previousId: 'a' }).id).toBe('b')
    }
    expect(pickPattern([make('a')], { now, previousId: 'a' }).id).toBe('a')
  })

  it('is deterministic with a fixed random source', () => {
    const patterns = [make('a'), make('b', { incorrectCount: 2 })]
    expect(pickPattern(patterns, { now, random: () => 0 }).id).toBe('a')
    expect(pickPattern(patterns, { now, random: () => 0.999 }).id).toBe('b')
  })

  it('only offers unmastered patterns for the chosen operations and level', () => {
    const patterns = [
      make('ok'),
      make('mastered', { mastered: true }),
      make('progress', { similarCorrectCount: 3 }),
      make('other-op', { operation: 'addition' }),
      make('other-level', { difficulty: 3 }),
    ]
    expect(
      eligiblePatterns(patterns, ['multiplication'], 2, 3).map((p) => p.id),
    ).toEqual(['ok'])
  })

  it('explains why review is unavailable', () => {
    expect(reviewAvailability([], ['multiplication'], 2, 3)).toEqual({
      count: 0,
      reason: 'no-mistakes',
    })
    expect(
      reviewAvailability(
        [make('m', { mastered: true })],
        ['multiplication'],
        2,
        3,
      ),
    ).toEqual({ count: 0, reason: 'all-mastered' })
    expect(reviewAvailability([make('a')], ['division'], 2, 3)).toEqual({
      count: 0,
      reason: 'no-match',
    })
    expect(
      reviewAvailability([make('a'), make('b')], ['multiplication'], 2, 3),
    ).toEqual({
      count: 2,
      reason: null,
    })
  })
})
