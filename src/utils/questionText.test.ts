import { describe, expect, it } from 'vitest'
import type { Question } from '../types/question'
import { explainAnswer } from './questionText'

const q = (
  operation: Question['operation'],
  firstOperand: number,
  secondOperand: number,
  correctAnswer: number,
): Question => ({
  id: 'q',
  operation,
  firstOperand,
  secondOperand,
  displayText: '',
  correctAnswer,
  choices: [],
  difficulty: 1,
  source: 'regular',
})

describe('explainAnswer', () => {
  it.each([
    [q('addition', 8, 7, 15), 'Check: 15 − 7 = 8'],
    [q('subtraction', 15, 7, 8), 'Check: 8 + 7 = 15'],
    [q('multiplication', 7, 8, 56), 'Check: 56 ÷ 8 = 7'],
    [q('multiplication', 7, 0, 0), 'Any number times 0 is 0.'],
    [q('multiplication', 0, 7, 0), 'Check: 0 ÷ 7 = 0'],
    [q('division', 56, 7, 8), 'Check: 8 × 7 = 56'],
    [q('division', 0, 5, 0), 'Check: 0 × 5 = 0'],
    [q('addition', 1000, 250, 1250), 'Check: 1,250 − 250 = 1,000'],
  ])('%#: %s', (question, text) => {
    expect(explainAnswer(question)).toBe(text)
  })
})
