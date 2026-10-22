import { randomInt, type RandomSource } from './math'

// Fisher–Yates shuffle. Returns a new array and leaves the input unchanged.
export function shuffle<T>(
  items: readonly T[],
  random: RandomSource = Math.random,
): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i, random)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
