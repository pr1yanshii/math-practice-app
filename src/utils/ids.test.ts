import { afterEach, describe, expect, it, vi } from 'vitest'
import { createId } from './ids'

describe('createId', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns unique non-empty strings', () => {
    const ids = new Set(Array.from({ length: 1000 }, createId))
    expect(ids.size).toBe(1000)
    for (const id of ids) expect(id).not.toBe('')
  })

  it('still returns unique ids without crypto.randomUUID', () => {
    vi.stubGlobal('crypto', {})
    const ids = new Set(Array.from({ length: 1000 }, createId))
    expect(ids.size).toBe(1000)
  })
})
