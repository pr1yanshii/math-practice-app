import { describe, expect, it } from 'vitest'
import type { Question } from '../types/question'
import { formatQuestionText, validateQuestion } from './validation'

function question(overrides: Partial<Question>): Question {
  const correctAnswer = overrides.correctAnswer ?? 56
  return {
    id: 'q1',
    operation: 'multiplication',
    firstOperand: 7,
    secondOperand: 8,
    displayText: '7 × 8',
    correctAnswer: 56,
    difficulty: 2,
    source: 'regular',
    ...overrides,
    // Four valid choices built from the answer unless a test sets them.
    choices: overrides.choices ?? [
      correctAnswer,
      correctAnswer + 1,
      correctAnswer + 2,
      correctAnswer + 3,
    ],
  }
}

describe('formatQuestionText', () => {
  it('uses the symbol and groups thousands', () => {
    expect(formatQuestionText('+', 1000, 25)).toBe('1,000 + 25')
  })
})

describe('validateQuestion', () => {
  it('accepts a valid question', () => {
    expect(validateQuestion(question({}))).toEqual([])
  })

  it.each<[string, Partial<Question>, RegExp]>([
    [
      'an unsupported operation',
      { operation: 'modulo' as Question['operation'] },
      /Unsupported operation/,
    ],
    [
      'an unsupported level',
      { difficulty: 7 as Question['difficulty'] },
      /Unsupported difficulty/,
    ],
    ['a wrong answer', { correctAnswer: 54 }, /does not match/],
    [
      'division by zero',
      {
        operation: 'division',
        firstOperand: 5,
        secondOperand: 0,
        displayText: '5 ÷ 0',
        correctAnswer: Infinity,
      },
      /Division by zero/,
    ],
    [
      'a fractional division answer',
      {
        operation: 'division',
        firstOperand: 7,
        secondOperand: 2,
        displayText: '7 ÷ 2',
        correctAnswer: 3.5,
      },
      /whole numbers/,
    ],
    [
      'a negative subtraction answer',
      {
        operation: 'subtraction',
        firstOperand: 3,
        secondOperand: 8,
        displayText: '3 − 8',
        correctAnswer: -5,
      },
      /Negative/,
    ],
    [
      'numbers above the level',
      {
        firstOperand: 12,
        displayText: '12 × 8',
        correctAnswer: 96,
      },
      /Outside the level 2 limits/,
    ],
    ['mismatched display text', { displayText: '8 × 7' }, /Display text/],
    [
      'choices without the answer',
      { choices: [48, 54, 63, 64] },
      /include the correct/,
    ],
    ['duplicate choices', { choices: [56, 56, 54, 64] }, /not unique/],
    ['three choices', { choices: [56, 54, 64] }, /exactly 4 choices/],
    ['five choices', { choices: [56, 54, 64, 48, 63] }, /exactly 4 choices/],
    ['a negative choice', { choices: [56, 54, 64, -1] }, /not negative/],
    ['a fractional choice', { choices: [56, 54, 64, 55.5] }, /whole numbers/],
  ])('rejects %s', (_label, overrides, problem) => {
    const problems = validateQuestion(question(overrides))
    expect(problems.some((p) => problem.test(p))).toBe(true)
  })

  it('accepts factors in either order', () => {
    expect(
      validateQuestion(
        question({
          firstOperand: 45,
          secondOperand: 7,
          displayText: '45 × 7',
          correctAnswer: 315,
          difficulty: 3,
        }),
      ),
    ).toEqual([])
    expect(
      validateQuestion(
        question({
          firstOperand: 7,
          secondOperand: 45,
          displayText: '7 × 45',
          correctAnswer: 315,
          difficulty: 3,
        }),
      ),
    ).toEqual([])
  })

  it('rejects two two-digit factors at level 3', () => {
    expect(
      validateQuestion(
        question({
          firstOperand: 12,
          secondOperand: 11,
          displayText: '12 × 11',
          correctAnswer: 132,
          difficulty: 3,
        }),
      ),
    ).toContain('Outside the level 3 limits')
  })
})
