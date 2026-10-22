import type { MathOperation } from '../types/question'
import { randomInt, type RandomSource } from '../utils/math'
import { shuffle } from '../utils/shuffle'

export const DISTRACTOR_COUNT = 3
export const MAX_NEARBY_ATTEMPTS = 30

// A wrong answer is plausible when it is within 10, or within half the
// correct answer for larger answers (891 allows ±445; 12 allows ±10).
export function isPlausibleDistractor(candidate: number, correct: number) {
  return Math.abs(candidate - correct) <= Math.max(10, correct / 2)
}

// Subtracts each column smaller-from-larger, the classic borrowing
// mistake: 52 − 17 → 45 instead of 35.
export function subtractWithoutBorrowing(a: number, b: number): number {
  let result = 0
  for (let place = 1; a > 0 || b > 0; place *= 10) {
    result += Math.abs((a % 10) - (b % 10)) * place
    a = Math.floor(a / 10)
    b = Math.floor(b / 10)
  }
  return result
}

// Wrong answers a child might really give for this question. Some may be
// negative, duplicates, or implausible; the caller filters them.
export function operationMistakes(
  operation: MathOperation,
  a: number,
  b: number,
  answer: number,
): number[] {
  switch (operation) {
    case 'addition': {
      const carried = (a % 10) + (b % 10) >= 10
      return [
        Math.abs(a - b), // subtracted instead of adding
        carried ? answer - 10 : answer + 10, // forgot to carry / place value
        answer - 1, // counting slip
        answer + 1,
      ]
    }
    case 'subtraction':
      return [
        a + b, // added instead of subtracting
        subtractWithoutBorrowing(a, b), // borrowing mistake
        answer - 1,
        answer + 1,
        answer + 10,
        answer - 10,
      ]
    case 'multiplication':
      return [
        (a - 1) * b, // neighbouring times-table facts
        (a + 1) * b,
        a * (b - 1),
        a * (b + 1),
        a + b, // added instead of multiplying
      ]
    case 'division':
      return [
        b, // answered with the divisor from the same fact family
        answer - 1, // neighbouring facts: (q ± 1) × b
        answer + 1,
        answer + 2,
        answer - 2,
      ]
  }
}

// Returns exactly three different wrong answers: whole numbers, never
// negative (no level allows negative answers), never the correct answer.
export function generateDistractors(
  operation: MathOperation,
  firstOperand: number,
  secondOperand: number,
  correctAnswer: number,
  random: RandomSource = Math.random,
): number[] {
  const chosen: number[] = []
  const tryAdd = (candidate: number) => {
    if (
      chosen.length < DISTRACTOR_COUNT &&
      Number.isInteger(candidate) &&
      candidate >= 0 &&
      candidate !== correctAnswer &&
      !chosen.includes(candidate) &&
      isPlausibleDistractor(candidate, correctAnswer)
    ) {
      chosen.push(candidate)
    }
  }

  // 1. Operation-specific mistakes, in random order.
  const mistakes = operationMistakes(
    operation,
    firstOperand,
    secondOperand,
    correctAnswer,
  )
  shuffle(mistakes, random).forEach(tryAdd)

  // 2. Nearby numbers, with a limited number of random tries.
  const spread = Math.max(3, Math.round(correctAnswer * 0.1))
  for (
    let attempt = 0;
    attempt < MAX_NEARBY_ATTEMPTS && chosen.length < DISTRACTOR_COUNT;
    attempt++
  ) {
    tryAdd(correctAnswer + randomInt(-spread, spread, random))
  }

  // 3. Guaranteed finish: counting up from the answer always gives new,
  // non-negative, plausible values, so this ends within a few steps even
  // when the answer is 0.
  for (
    let candidate = correctAnswer + 1;
    chosen.length < DISTRACTOR_COUNT;
    candidate++
  ) {
    tryAdd(candidate)
  }

  return chosen
}
