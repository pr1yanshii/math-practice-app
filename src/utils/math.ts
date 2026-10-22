import type { MathOperation } from '../types/question'

// Returns a number in [0, 1), like Math.random. Tests pass fixed sources.
export type RandomSource = () => number

// Inclusive of both min and max.
export function randomInt(
  min: number,
  max: number,
  random: RandomSource = Math.random,
): number {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
    throw new RangeError(`Invalid integer range ${min}–${max}`)
  }
  return min + Math.floor(random() * (max - min + 1))
}

export function pickRandom<T>(
  items: readonly T[],
  random: RandomSource = Math.random,
): T {
  if (items.length === 0) throw new RangeError('Cannot pick from an empty list')
  return items[randomInt(0, items.length - 1, random)]
}

export function calculateAnswer(
  operation: MathOperation,
  firstOperand: number,
  secondOperand: number,
): number {
  switch (operation) {
    case 'addition':
      return firstOperand + secondOperand
    case 'subtraction':
      return firstOperand - secondOperand
    case 'multiplication':
      return firstOperand * secondOperand
    case 'division':
      return firstOperand / secondOperand
  }
}
