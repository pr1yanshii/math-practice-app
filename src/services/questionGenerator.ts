import type {
  DifficultyLevel,
  MathOperation,
  Question,
} from '../types/question'
import { createId } from '../utils/ids'
import {
  calculateAnswer,
  pickRandom,
  randomInt,
  type RandomSource,
} from '../utils/math'
import { OPERATION_OPTIONS } from '../utils/practiceConfig'
import { shuffle } from '../utils/shuffle'
import { formatQuestionText, validateQuestion } from '../utils/validation'
import {
  DIFFICULTY_RULES,
  type DifficultyRules,
  type NumberRange,
} from './difficultyRules'
import { generateDistractors } from './distractorGenerator'

export const MAX_GENERATION_ATTEMPTS = 20

export class QuestionGenerationError extends Error {
  name = 'QuestionGenerationError'
}

type Operands = readonly [number, number]
type OperandGenerator = (
  rules: DifficultyRules,
  random: RandomSource,
) => Operands

const draw = (range: NumberRange, random: RandomSource) =>
  randomInt(range.min, range.max, random)

export function generateAdditionOperands(
  rules: DifficultyRules,
  random: RandomSource,
): Operands {
  const { operand, maxResult } = rules.addition
  const first = draw(operand, random)
  // Cap the second operand so the sum stays within the level's limit.
  const secondMax =
    maxResult === undefined
      ? operand.max
      : Math.min(operand.max, maxResult - first)
  return [first, randomInt(operand.min, secondMax, random)]
}

export function generateSubtractionOperands(
  rules: DifficultyRules,
  random: RandomSource,
): Operands {
  const { operand } = rules.subtraction
  const x = draw(operand, random)
  const y = draw(operand, random)
  // Larger number first, so the answer is never negative.
  return [Math.max(x, y), Math.min(x, y)]
}

export function generateMultiplicationOperands(
  rules: DifficultyRules,
  random: RandomSource,
): Operands {
  const [rangeA, rangeB] = pickRandom(rules.multiplication.factorPairs, random)
  const a = draw(rangeA, random)
  const b = draw(rangeB, random)
  return random() < 0.5 ? [a, b] : [b, a]
}

// Specification §9: choose the divisor and a whole-number quotient, then
// build the dividend, so the answer is always whole and never ÷ 0.
export function generateDivisionOperands(
  rules: DifficultyRules,
  random: RandomSource,
): Operands {
  const { divisor: divisorRange, quotient: quotientRange } = rules.division
  const divisor = draw(divisorRange, random)
  const quotient = draw(quotientRange, random)
  return [divisor * quotient, divisor]
}

const OPERAND_GENERATORS: Record<MathOperation, OperandGenerator> = {
  addition: generateAdditionOperands,
  subtraction: generateSubtractionOperands,
  multiplication: generateMultiplicationOperands,
  division: generateDivisionOperands,
}

// Builds a regular question (with shuffled choices) from chosen operands.
// It is not validated here; callers run validateQuestion.
export function buildQuestion(
  operation: MathOperation,
  difficulty: DifficultyLevel,
  [firstOperand, secondOperand]: Operands,
  random: RandomSource,
): Question {
  const symbol = OPERATION_OPTIONS.find((o) => o.value === operation)!.symbol
  const correctAnswer = calculateAnswer(operation, firstOperand, secondOperand)
  const distractors = generateDistractors(
    operation,
    firstOperand,
    secondOperand,
    correctAnswer,
    random,
  )
  return {
    id: createId(),
    operation,
    firstOperand,
    secondOperand,
    displayText: formatQuestionText(symbol, firstOperand, secondOperand),
    correctAnswer,
    choices: shuffle([correctAnswer, ...distractors], random),
    difficulty,
    source: 'regular',
  }
}

export function generateQuestion(
  operation: MathOperation,
  difficulty: DifficultyLevel,
  random: RandomSource = Math.random,
): Question {
  // Guard values that bypass the types, such as data loaded from storage.
  if (!Object.hasOwn(OPERAND_GENERATORS, operation)) {
    throw new QuestionGenerationError(
      `Unsupported operation: ${String(operation)}`,
    )
  }
  if (!Object.hasOwn(DIFFICULTY_RULES, difficulty)) {
    throw new QuestionGenerationError(
      `Unsupported difficulty: ${String(difficulty)}`,
    )
  }

  const generateOperands = OPERAND_GENERATORS[operation]
  let problems: string[] = []
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    try {
      const operands = generateOperands(DIFFICULTY_RULES[difficulty], random)
      const question = buildQuestion(operation, difficulty, operands, random)
      problems = validateQuestion(question)
      if (problems.length === 0) return question
    } catch (error) {
      problems = [error instanceof Error ? error.message : String(error)]
    }
  }
  const message =
    `No valid ${operation} question at level ${difficulty} after ` +
    `${MAX_GENERATION_ATTEMPTS} attempts: ${problems.join('; ')}`

  // Fallback (Task 77): the level's smallest numbers always make a valid
  // question, so practice can carry on.
  const fallback = buildQuestion(
    operation,
    difficulty,
    generateOperands(DIFFICULTY_RULES[difficulty], () => 0),
    Math.random,
  )
  if (validateQuestion(fallback).length === 0) {
    if (import.meta.env.DEV) console.error(`${message}. Using a fallback.`)
    return fallback
  }
  throw new QuestionGenerationError(message)
}

// Picks one of the selected operations at random for each question.
export function generateQuestionForOperations(
  operations: readonly MathOperation[],
  difficulty: DifficultyLevel,
  random: RandomSource = Math.random,
): Question {
  if (operations.length === 0) {
    throw new QuestionGenerationError('No operations selected')
  }
  return generateQuestion(pickRandom(operations, random), difficulty, random)
}

export const MAX_REPEAT_AVOIDANCE_ATTEMPTS = 20

type QuestionFacts = Pick<
  Question,
  'operation' | 'firstOperand' | 'secondOperand'
>

export function isSameQuestion(a: QuestionFacts, b: QuestionFacts): boolean {
  return (
    a.operation === b.operation &&
    a.firstOperand === b.firstOperand &&
    a.secondOperand === b.secondOperand
  )
}

// Like generateQuestionForOperations, but tries not to repeat the previous
// question. Gives up after a few tries so it can't loop forever.
export function generateNextQuestion(
  operations: readonly MathOperation[],
  difficulty: DifficultyLevel,
  previous: Question | null,
  random: RandomSource = Math.random,
): Question {
  let question = generateQuestionForOperations(operations, difficulty, random)
  for (
    let attempt = 1;
    previous !== null &&
    isSameQuestion(question, previous) &&
    attempt < MAX_REPEAT_AVOIDANCE_ATTEMPTS;
    attempt++
  ) {
    question = generateQuestionForOperations(operations, difficulty, random)
  }
  return question
}
