import { describe, expect, it } from 'vitest'
import type { MistakePattern } from '../types/mistake'
import type { DifficultyLevel, MathOperation } from '../types/question'
import { validateQuestion } from '../utils/validation'
import { mistakePatternId } from './mistakeTracker'
import { generateQuestion, isSameQuestion } from './questionGenerator'
import { generateSimilarQuestion } from './similarQuestionGenerator'

function pattern(
  operation: MathOperation,
  firstOperand: number,
  secondOperand: number,
  correctAnswer: number,
  difficulty: DifficultyLevel = 2,
): MistakePattern {
  return {
    id: mistakePatternId(operation, firstOperand, secondOperand),
    operation,
    firstOperand,
    secondOperand,
    correctAnswer,
    difficulty,
    incorrectCount: 1,
    similarCorrectCount: 0,
    lastIncorrectAt: '2026-10-21T10:00:00.000Z',
    mastered: false,
  }
}

const sample = (p: MistakePattern, options = {}, n = 400) =>
  Array.from({ length: n }, () => generateSimilarQuestion(p, options))

const texts = (questions: { displayText: string }[]) =>
  new Set(questions.map((q) => q.displayText))

describe('generateSimilarQuestion', () => {
  it('produces the specification §6.4 examples for 8 × 7', () => {
    const seen = texts(sample(pattern('multiplication', 8, 7, 56)))
    for (const example of ['7 × 8', '8 × 6', '9 × 7', '56 ÷ 7', '56 ÷ 8']) {
      expect(seen).toContain(example)
    }
    // Only related questions: reversed, ±1 on one factor, or the fact family.
    expect([...seen].sort()).toEqual(
      ['7 × 7', '7 × 8', '8 × 6', '8 × 8', '9 × 7', '56 ÷ 7', '56 ÷ 8'].sort(),
    )
  })

  it.each([
    ['addition', 12, 30, 42],
    ['subtraction', 40, 15, 25],
    ['multiplication', 6, 9, 54],
    ['division', 72, 8, 9],
  ] as const)(
    '%s: valid, at the pattern’s level, labelled and linked, never the original',
    (operation, a, b, answer) => {
      const p = pattern(operation, a, b, answer)
      for (const question of sample(p)) {
        expect(validateQuestion(question)).toEqual([])
        expect(question.difficulty).toBe(2)
        expect(question.source).toBe('mistake-review')
        expect(question.mistakePatternId).toBe(p.id)
        expect(isSameQuestion(question, p)).toBe(false)
      }
    },
  )

  it.each([
    ['addition', 12, 30, 42, ['30 + 12', '42 − 12', '42 − 30']],
    ['subtraction', 40, 15, 25, ['15 + 25', '25 + 15', '41 − 15']],
    ['division', 72, 8, 9, ['8 × 9', '9 × 8', '80 ÷ 8', '64 ÷ 8']],
  ] as const)(
    '%s: uses reversed, nearby and fact-family questions',
    (operation, a, b, answer, examples) => {
      const seen = texts(sample(pattern(operation, a, b, answer)))
      for (const example of examples) expect(seen).toContain(example)
    },
  )

  it('never reverses subtraction or division (they are not the same fact)', () => {
    expect(texts(sample(pattern('subtraction', 40, 15, 25)))).not.toContain(
      '15 − 40',
    )
    expect(texts(sample(pattern('division', 72, 8, 9)))).not.toContain('8 ÷ 72')
  })

  it('keeps every question within the level rules at the edges', () => {
    // Level 1: addition sums ≤ 20 and subtraction 0–10, so 10 + 10 has no
    // "20 − 10" fact-family question (20 is outside subtraction's range).
    for (const question of sample(pattern('addition', 10, 10, 20, 1))) {
      expect(validateQuestion(question)).toEqual([])
    }
    // Division never by zero and always whole.
    for (const question of sample(pattern('division', 0, 1, 0, 1))) {
      expect(validateQuestion(question)).toEqual([])
      if (question.operation === 'division') {
        expect(question.secondOperand).toBeGreaterThan(0)
      }
    }
  })

  it('stays within the operations the student chose', () => {
    const questions = sample(pattern('multiplication', 8, 7, 56), {
      operations: ['multiplication'],
    })
    expect(questions.every((q) => q.operation === 'multiplication')).toBe(true)
  })

  it('does not repeat the previous question', () => {
    const p = pattern('multiplication', 8, 7, 56)
    let previous = generateSimilarQuestion(p)
    for (let i = 0; i < 300; i++) {
      const next = generateSimilarQuestion(p, { previous })
      expect(isSameQuestion(next, previous)).toBe(false)
      previous = next
    }
  })

  it('falls back to a valid question when nothing related fits', () => {
    // A damaged pattern whose numbers are outside its level: every related
    // question fails validation.
    const p = pattern('addition', 300, 400, 700, 1)
    const question = generateSimilarQuestion(p)
    expect(validateQuestion(question)).toEqual([])
    expect(question).toMatchObject({
      operation: 'addition',
      difficulty: 1,
      source: 'mistake-review',
      mistakePatternId: p.id,
    })
  })

  it('works for patterns made from real level 1–4 questions', () => {
    for (const level of [1, 2, 3, 4] as const) {
      for (const operation of [
        'addition',
        'subtraction',
        'multiplication',
        'division',
      ] as const) {
        for (let i = 0; i < 50; i++) {
          const q = generateQuestion(operation, level)
          const p = pattern(
            operation,
            q.firstOperand,
            q.secondOperand,
            q.correctAnswer,
            level,
          )
          const similar = generateSimilarQuestion(p)
          expect(validateQuestion(similar)).toEqual([])
          expect(similar.difficulty).toBe(level)
        }
      }
    }
  })
})

describe('equal numbers', () => {
  it('never asks the original back when reversing changes nothing (7 × 7, 5 + 5)', () => {
    for (const p of [
      pattern('multiplication', 7, 7, 49),
      pattern('addition', 5, 5, 10),
    ]) {
      for (const question of sample(p)) {
        expect(isSameQuestion(question, p)).toBe(false)
      }
    }
  })
})
