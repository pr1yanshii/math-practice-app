import {
  DIFFICULTY_RULES,
  isInRange,
  type DifficultyRules,
} from '../services/difficultyRules'
import type { Question } from '../types/question'
import { calculateAnswer } from './math'
import { OPERATION_OPTIONS } from './practiceConfig'

export function formatQuestionText(
  symbol: string,
  firstOperand: number,
  secondOperand: number,
): string {
  const format = (value: number) => value.toLocaleString('en-US')
  return `${format(firstOperand)} ${symbol} ${format(secondOperand)}`
}

function fitsDifficulty(question: Question, rules: DifficultyRules): boolean {
  const { firstOperand: a, secondOperand: b, correctAnswer } = question

  switch (question.operation) {
    case 'addition': {
      const { operand, maxResult } = rules.addition
      return (
        isInRange(a, operand) &&
        isInRange(b, operand) &&
        (maxResult === undefined || correctAnswer <= maxResult)
      )
    }
    case 'subtraction': {
      const { operand } = rules.subtraction
      return isInRange(a, operand) && isInRange(b, operand) && a >= b
    }
    case 'multiplication':
      return rules.multiplication.factorPairs.some(
        ([x, y]) =>
          (isInRange(a, x) && isInRange(b, y)) ||
          (isInRange(a, y) && isInRange(b, x)),
      )
    case 'division': {
      const { divisor, quotient, maxDividend } = rules.division
      return (
        isInRange(b, divisor) &&
        isInRange(correctAnswer, quotient) &&
        (maxDividend === undefined || a <= maxDividend)
      )
    }
  }
}

export const CHOICE_COUNT = 4

// Checks the rules from specification §18. Returns a list of problems; an
// empty list means the question is valid. Unique choices that include the
// answer means the answer appears exactly once.
export function validateQuestion(question: Question): string[] {
  const { operation, firstOperand, secondOperand, correctAnswer } = question
  const option = OPERATION_OPTIONS.find((o) => o.value === operation)
  if (!option) return [`Unsupported operation: ${String(operation)}`]

  if (!Object.hasOwn(DIFFICULTY_RULES, question.difficulty)) {
    return [`Unsupported difficulty: ${String(question.difficulty)}`]
  }

  const problems: string[] = []
  const integers = [firstOperand, secondOperand, correctAnswer]
  if (!integers.every(Number.isInteger)) {
    problems.push('Operands and answer must be whole numbers')
  }
  if (operation === 'division' && secondOperand === 0) {
    problems.push('Division by zero')
  }
  if (
    correctAnswer !== calculateAnswer(operation, firstOperand, secondOperand)
  ) {
    problems.push('Correct answer does not match the operands')
  }
  if (correctAnswer < 0) {
    problems.push('Negative answers are not allowed')
  }
  if (!fitsDifficulty(question, DIFFICULTY_RULES[question.difficulty])) {
    problems.push(`Outside the level ${question.difficulty} limits`)
  }
  if (
    question.displayText !==
    formatQuestionText(option.symbol, firstOperand, secondOperand)
  ) {
    problems.push('Display text does not match the operands')
  }
  const { choices } = question
  if (choices.length !== CHOICE_COUNT) {
    problems.push(`There must be exactly ${CHOICE_COUNT} choices`)
  }
  if (!choices.every((choice) => Number.isInteger(choice) && choice >= 0)) {
    problems.push('Choices must be whole numbers that are not negative')
  }
  if (!choices.includes(correctAnswer)) {
    problems.push('Choices do not include the correct answer')
  }
  if (new Set(choices).size !== choices.length) {
    problems.push('Choices are not unique')
  }
  return problems
}
