import { describe, expect, it } from 'vitest'
import type { DifficultyLevel, MathOperation } from '../types/question'
import { calculateAnswer } from '../utils/math'
import {
  DISTRACTOR_COUNT,
  generateDistractors,
  isPlausibleDistractor,
  operationMistakes,
  subtractWithoutBorrowing,
} from './distractorGenerator'
import { generateQuestion } from './questionGenerator'

const OPERATIONS: MathOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
]
const LEVELS: DifficultyLevel[] = [1, 2, 3, 4]
const LOWEST = () => 0
const HIGHEST = () => 0.999999

function expectValidDistractors(distractors: number[], correct: number) {
  expect(distractors).toHaveLength(DISTRACTOR_COUNT)
  expect(new Set(distractors).size).toBe(DISTRACTOR_COUNT)
  for (const d of distractors) {
    expect(d).not.toBe(correct)
    expect(Number.isInteger(d)).toBe(true)
    expect(d).toBeGreaterThanOrEqual(0)
    expect(isPlausibleDistractor(d, correct)).toBe(true)
  }
}

describe('generateDistractors', () => {
  it('uses neighbouring times-table facts for 8 × 7 = 56', () => {
    const distractors = generateDistractors('multiplication', 8, 7, 56)
    expectValidDistractors(distractors, 56)
    // The spec's example choices come from neighbouring facts.
    for (const d of distractors) {
      expect([48, 63, 49, 64]).toContain(d)
    }
  })

  it('suggests the "added instead of subtracting" mistake when it is close', () => {
    // 5 − 3 = 2; adding gives 8, which is a believable wrong answer.
    const seen = new Set<number>()
    for (let i = 0; i < 200; i++) {
      for (const d of generateDistractors('subtraction', 5, 3, 2)) seen.add(d)
    }
    expect(seen).toContain(8)
  })

  it('suggests the borrowing mistake for 52 − 17', () => {
    expect(subtractWithoutBorrowing(52, 17)).toBe(45)
    const seen = new Set<number>()
    for (let i = 0; i < 200; i++) {
      for (const d of generateDistractors('subtraction', 52, 17, 35))
        seen.add(d)
    }
    expect(seen).toContain(45)
  })

  it('suggests the forgot-to-carry mistake for 38 + 45', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 200; i++) {
      for (const d of generateDistractors('addition', 38, 45, 83)) seen.add(d)
    }
    expect(seen).toContain(73)
  })

  it('suggests the divisor and neighbouring quotients for 56 ÷ 7 = 8', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 200; i++) {
      for (const d of generateDistractors('division', 56, 7, 8)) seen.add(d)
    }
    expect(seen).toContain(7)
    expect(seen).toContain(9)
  })

  it('leaves out implausible mistakes', () => {
    // 8 × 7: adding gives 15, far from 56.
    expect(operationMistakes('multiplication', 8, 7, 56)).toContain(15)
    expect(isPlausibleDistractor(15, 56)).toBe(false)
    for (let i = 0; i < 200; i++) {
      expect(generateDistractors('multiplication', 8, 7, 56)).not.toContain(15)
    }
  })

  describe('answers at or near zero', () => {
    it.each([
      ['addition', 0, 0, 0],
      ['subtraction', 0, 0, 0],
      ['subtraction', 7, 7, 0],
      ['multiplication', 0, 0, 0],
      ['multiplication', 0, 5, 0],
      ['division', 0, 1, 0],
      ['division', 0, 5, 0],
      ['addition', 1, 0, 1],
      ['subtraction', 1, 0, 1],
      ['multiplication', 1, 1, 1],
      ['division', 1, 1, 1],
      ['division', 2, 1, 2],
    ] as const)('%s %s and %s = %s', (operation, a, b, answer) => {
      expect(calculateAnswer(operation, a, b)).toBe(answer)
      for (const random of [Math.random, LOWEST, HIGHEST]) {
        expectValidDistractors(
          generateDistractors(operation, a, b, answer, random),
          answer,
        )
      }
    })

    it('never offers negative choices for an answer of 0', () => {
      for (let i = 0; i < 300; i++) {
        for (const d of generateDistractors('multiplication', 0, 4, 0)) {
          expect(d).toBeGreaterThan(0)
        }
      }
    })
  })

  it('finishes even when every random value is the same', () => {
    // Constant sources make the random step repeat one value; the counting
    // fallback must still produce three distractors.
    for (const random of [LOWEST, HIGHEST, () => 0.5]) {
      for (const operation of OPERATIONS) {
        expectValidDistractors(
          generateDistractors(
            operation,
            0,
            1,
            calculateAnswer(operation, 0, 1),
            random,
          ),
          calculateAnswer(operation, 0, 1),
        )
      }
    }
  })

  it('works for the largest answers', () => {
    expectValidDistractors(
      generateDistractors('multiplication', 99, 99, 9801),
      9801,
    )
    expectValidDistractors(
      generateDistractors('addition', 1000, 1000, 2000),
      2000,
    )
    expectValidDistractors(generateDistractors('division', 1000, 20, 50), 50)
  })
})

describe('choices in generated questions', () => {
  it.each(
    LEVELS.flatMap((level) =>
      OPERATIONS.map((operation) => [operation, level] as const),
    ),
  )('%s at level %s: valid with fixed random sources', (operation, level) => {
    for (const random of [LOWEST, HIGHEST]) {
      const q = generateQuestion(operation, level, random)
      expect(q.choices).toHaveLength(4)
      expect(new Set(q.choices).size).toBe(4)
      expect(q.choices.filter((c) => c === q.correctAnswer)).toHaveLength(1)
    }
  })

  it.each(OPERATIONS)(
    '%s: the correct answer appears in every position about equally',
    (operation) => {
      const runs = 4000
      const positions = [0, 0, 0, 0]
      for (let i = 0; i < runs; i++) {
        const q = generateQuestion(operation, 2)
        positions[q.choices.indexOf(q.correctAnswer)]++
      }
      // Expected 1000 each; ±200 is more than 7 standard deviations.
      for (const count of positions) {
        expect(count).toBeGreaterThan(800)
        expect(count).toBeLessThan(1200)
      }
    },
  )

  it('is not always the smallest or largest choice', () => {
    let smallest = 0
    let largest = 0
    const runs = 1000
    for (let i = 0; i < runs; i++) {
      const q = generateQuestion('multiplication', 2)
      if (q.correctAnswer === Math.min(...q.choices)) smallest++
      if (q.correctAnswer === Math.max(...q.choices)) largest++
    }
    expect(smallest).toBeLessThan(runs * 0.6)
    expect(largest).toBeLessThan(runs * 0.6)
  })
})
