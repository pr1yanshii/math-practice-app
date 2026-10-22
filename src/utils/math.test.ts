import { describe, expect, it } from 'vitest'
import { calculateAnswer, pickRandom, randomInt } from './math'

const LOWEST = () => 0
const HIGHEST = () => 0.999999

describe('randomInt', () => {
  it('returns min when the random source is at its lowest', () => {
    expect(randomInt(3, 9, LOWEST)).toBe(3)
  })

  it('returns max when the random source is at its highest', () => {
    expect(randomInt(3, 9, HIGHEST)).toBe(9)
  })

  it('includes both ends and only whole numbers over many draws', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) {
      const value = randomInt(0, 5)
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(5)
      seen.add(value)
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('returns the only value when min equals max', () => {
    expect(randomInt(7, 7)).toBe(7)
  })

  it('works with zero and negative bounds', () => {
    expect(randomInt(0, 0)).toBe(0)
    expect(randomInt(-3, -1, LOWEST)).toBe(-3)
  })

  it.each([
    [5, 4],
    [1.5, 4],
    [1, Number.NaN],
  ])('rejects the invalid range %s–%s', (min, max) => {
    expect(() => randomInt(min, max)).toThrow(RangeError)
  })
})

describe('pickRandom', () => {
  it('picks the first and last items at the extremes', () => {
    expect(pickRandom(['a', 'b', 'c'], LOWEST)).toBe('a')
    expect(pickRandom(['a', 'b', 'c'], HIGHEST)).toBe('c')
  })

  it('rejects an empty list', () => {
    expect(() => pickRandom([])).toThrow(RangeError)
  })
})

describe('calculateAnswer', () => {
  it.each([
    ['addition', 7, 8, 15],
    ['subtraction', 15, 7, 8],
    ['multiplication', 7, 8, 56],
    ['division', 56, 7, 8],
    ['addition', 0, 0, 0],
    ['multiplication', 9, 0, 0],
    ['division', 0, 4, 0],
  ] as const)('%s of %s and %s is %s', (operation, a, b, expected) => {
    expect(calculateAnswer(operation, a, b)).toBe(expected)
  })
})
