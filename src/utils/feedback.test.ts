import { describe, expect, it } from 'vitest'
import {
  POSITIVE_FEEDBACK,
  SUPPORTIVE_FEEDBACK,
  pickFeedback,
} from './feedback'

describe('feedback', () => {
  it('is positive after "right" and supportive after "wrong"', () => {
    for (let i = 0; i < 50; i++) {
      expect(POSITIVE_FEEDBACK).toContain(pickFeedback(true, null))
      expect(SUPPORTIVE_FEEDBACK).toContain(pickFeedback(false, null))
    }
  })

  it('includes the specification’s examples', () => {
    expect(POSITIVE_FEEDBACK).toEqual(
      expect.arrayContaining([
        'Great job!',
        'Nice work!',
        'You are improving!',
      ]),
    )
    expect(SUPPORTIVE_FEEDBACK).toContain('Keep practicing!')
  })

  it('never uses shaming words', () => {
    for (const message of [...POSITIVE_FEEDBACK, ...SUPPORTIVE_FEEDBACK]) {
      expect(message).not.toMatch(/wrong|bad|fail|silly|careless|stupid|no!/i)
    }
  })

  it('never repeats the previous message', () => {
    let last: string | null = null
    for (let i = 0; i < 200; i++) {
      const next = pickFeedback(i % 3 !== 0, last)
      expect(next).not.toBe(last)
      last = next
    }
  })
})
