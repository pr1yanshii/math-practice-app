import { describe, expect, it } from 'vitest'
import { shuffle } from './shuffle'

describe('shuffle', () => {
  it('keeps exactly the same items', () => {
    const items = [48, 54, 56, 64]
    expect([...shuffle(items)].sort()).toEqual([...items].sort())
  })

  it('does not change the original array', () => {
    const items = [1, 2, 3, 4]
    shuffle(items)
    expect(items).toEqual([1, 2, 3, 4])
  })

  it('handles empty and single-item lists', () => {
    expect(shuffle([])).toEqual([])
    expect(shuffle([5])).toEqual([5])
  })

  it('is deterministic for a fixed random source', () => {
    // With 0 every swap uses index 0: [1,2,3,4] → [2,3,4,1].
    expect(shuffle([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1])
    // With ~1 every item swaps with itself.
    expect(shuffle([1, 2, 3, 4], () => 0.999999)).toEqual([1, 2, 3, 4])
  })

  it('puts each item in each position about equally often', () => {
    const runs = 8000
    const counts = Array.from({ length: 4 }, () => [0, 0, 0, 0])
    for (let i = 0; i < runs; i++) {
      shuffle([0, 1, 2, 3]).forEach((item, position) => {
        counts[item][position]++
      })
    }
    // Expected 2000 each; ±300 is more than 8 standard deviations.
    for (const row of counts) {
      for (const count of row) {
        expect(count).toBeGreaterThan(1700)
        expect(count).toBeLessThan(2300)
      }
    }
  })
})
