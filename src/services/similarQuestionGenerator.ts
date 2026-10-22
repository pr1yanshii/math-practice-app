import type { MistakePattern } from '../types/mistake'
import type { MathOperation, Question } from '../types/question'
import { pickRandom, type RandomSource } from '../utils/math'
import { validateQuestion } from '../utils/validation'
import {
  buildQuestion,
  generateQuestion,
  isSameQuestion,
} from './questionGenerator'

type Candidate = readonly [MathOperation, number, number]

// Spec §6.4: 7 × 8 → reversed.
function reversed({
  operation,
  firstOperand: a,
  secondOperand: b,
}: MistakePattern): Candidate[] {
  return operation === 'addition' || operation === 'multiplication'
    ? [[operation, b, a]]
    : // 9 − 4 is not 4 − 9, and 8 ÷ 2 is not 2 ÷ 8.
      []
}

// Spec §6.4: 8 × 7 → 8 × 6, 9 × 7. Division keeps whole answers by moving
// the quotient or the divisor, never just the dividend.
function nearby({
  operation,
  firstOperand: a,
  secondOperand: b,
  correctAnswer: c,
}: MistakePattern): Candidate[] {
  if (operation === 'division') {
    return [
      [operation, b * (c + 1), b],
      [operation, b * (c - 1), b],
      [operation, (b + 1) * c, b + 1],
      [operation, (b - 1) * c, b - 1],
    ]
  }
  return [
    [operation, a + 1, b],
    [operation, a - 1, b],
    [operation, a, b + 1],
    [operation, a, b - 1],
  ]
}

// Spec §6.4: 8 × 7 → 56 ÷ 7, 56 ÷ 8 (and the other inverse operations).
function factFamily({
  operation,
  firstOperand: a,
  secondOperand: b,
  correctAnswer: c,
}: MistakePattern): Candidate[] {
  switch (operation) {
    case 'multiplication':
      return [
        ['division', c, a],
        ['division', c, b],
      ]
    case 'division':
      return [
        ['multiplication', b, c],
        ['multiplication', c, b],
      ]
    case 'addition':
      return [
        ['subtraction', c, a],
        ['subtraction', c, b],
      ]
    case 'subtraction':
      return [
        ['addition', b, c],
        ['addition', c, b],
      ]
  }
}

const STRATEGIES = [reversed, nearby, factFamily]

export interface SimilarQuestionOptions {
  // Operations the student chose; related questions stay within them.
  operations?: readonly MathOperation[]
  // The question just shown, so it isn't repeated straight away.
  previous?: Question | null
  random?: RandomSource
}

// A question related to the mistake, at the pattern's level, labelled as
// mistake review and linked to the pattern.
export function generateSimilarQuestion(
  pattern: MistakePattern,
  {
    operations,
    previous = null,
    random = Math.random,
  }: SimilarQuestionOptions = {},
): Question {
  const allowed = (operation: MathOperation) =>
    operations === undefined || operations.includes(operation)

  const asReview = (question: Question): Question => ({
    ...question,
    source: 'mistake-review',
    mistakePatternId: pattern.id,
  })

  const build = ([operation, a, b]: Candidate): Question | null => {
    if (!allowed(operation) || a < 0 || b < 0) return null
    if (operation === 'division' && b === 0) return null
    const question = buildQuestion(
      operation,
      pattern.difficulty,
      [a, b],
      random,
    )
    // Rejects anything outside the level's limits (spec §7, §18).
    if (validateQuestion(question).length > 0) return null
    if (isSameQuestion(question, pattern)) return null
    if (previous && isSameQuestion(question, previous)) return null
    return question
  }

  // Pick a strategy that has at least one valid question, then a question.
  const options = STRATEGIES.map((strategy) =>
    strategy(pattern)
      .map(build)
      .filter((question): question is Question => question !== null),
  ).filter((questions) => questions.length > 0)
  if (options.length > 0) {
    return asReview(pickRandom(pickRandom(options, random), random))
  }

  // Nothing related fits (very small ranges): repeat the original fact if
  // it is valid, otherwise any question of the same kind at that level.
  const repeat = buildQuestion(
    pattern.operation,
    pattern.difficulty,
    [pattern.firstOperand, pattern.secondOperand],
    random,
  )
  return asReview(
    validateQuestion(repeat).length === 0
      ? repeat
      : generateQuestion(pattern.operation, pattern.difficulty, random),
  )
}
