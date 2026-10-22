import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeAttempt, makeSession } from '../test/fixtures'
import { generateQuestion } from './questionGenerator'
import { DEFAULT_SETTINGS } from './settings'
import {
  archiveAttempts,
  calculateMistakeStatistics,
  calculateStatistics,
} from './statisticsService'
import type { ActiveSessionSnapshot } from './storageSchemas'
import {
  MAX_STORED_ATTEMPTS,
  MAX_STORED_SESSIONS,
  SCHEMA_VERSION,
  STORAGE_KEYS,
  clearActiveSession,
  clearAllData,
  clearPracticeData,
  loadActiveSession,
  loadArchivedStatistics,
  loadAttempts,
  loadMistakePatterns,
  loadSessions,
  loadSettings,
  prepareStorage,
  saveActiveSession,
  saveAttempt,
  saveSession,
  saveSettings,
  type Migration,
} from './storageService'

const OTHER_KEYS = {
  'otherApp.data': '{"keep":true}',
  mathPracticeNotes: 'not ours either',
  unrelated: 'plain text',
}

function seedOtherData() {
  for (const [key, value] of Object.entries(OTHER_KEYS)) {
    localStorage.setItem(key, value)
  }
}

function expectOtherDataUntouched() {
  for (const [key, value] of Object.entries(OTHER_KEYS)) {
    expect(localStorage.getItem(key)).toBe(value)
  }
}

const storedJson = (key: string): unknown =>
  JSON.parse(localStorage.getItem(key)!)

function makeStorageUnavailable() {
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new DOMException('Access denied', 'SecurityError')
  })
}

function makeStorageFull() {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Quota exceeded', 'QuotaExceededError')
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('loading with nothing saved', () => {
  it('returns defaults and empty lists without writing anything', () => {
    expect(loadSettings()).toEqual({
      settings: DEFAULT_SETTINGS,
      status: 'missing',
    })
    expect(loadSessions()).toEqual([])
    expect(loadAttempts()).toEqual([])
    expect(prepareStorage()).toBeNull()
    expect(localStorage.length).toBe(0)
  })
})

describe('settings', () => {
  it('saves and loads them back', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      soundEnabled: true,
      defaultDifficulty: 3 as const,
      defaultOperations: ['division' as const],
      masteryThreshold: 5,
    }
    expect(saveSettings(settings)).toEqual({ ok: true })
    expect(loadSettings()).toEqual({ settings, status: 'ok' })
  })

  it('keeps valid fields and replaces only invalid ones with defaults', () => {
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({
        soundEnabled: true,
        animationsEnabled: 'yes',
        defaultDifficulty: 9,
        defaultOperations: ['addition', 'addition'],
        masteryThreshold: 4,
      }),
    )
    expect(loadSettings()).toEqual({
      settings: {
        ...DEFAULT_SETTINGS,
        soundEnabled: true,
        masteryThreshold: 4,
      },
      status: 'recovered',
    })
  })

  it.each([
    ['broken JSON', '{"soundEnabled": tr'],
    ['an array', '[1,2,3]'],
    ['a number', '42'],
    ['null', 'null'],
  ])('uses defaults for %s and leaves the stored value alone', (_l, raw) => {
    localStorage.setItem(STORAGE_KEYS.settings, raw)
    expect(loadSettings()).toEqual({
      settings: DEFAULT_SETTINGS,
      status: 'recovered',
    })
    expect(localStorage.getItem(STORAGE_KEYS.settings)).toBe(raw)
  })
})

describe('sessions', () => {
  it('saves session details and completion, and loads them back', () => {
    const session = makeSession()
    expect(saveSession(session)).toEqual({ ok: true })
    expect(loadSessions()).toEqual([session])
  })

  it('updates a stored session instead of adding a second copy', () => {
    const inProgress = makeSession({
      completedAt: undefined,
      attempted: 2,
      correct: 1,
      incorrect: 1,
    })
    saveSession(inProgress)
    const finished = makeSession()
    saveSession(finished)

    expect(loadSessions()).toEqual([finished])
  })

  it('loads recent sessions newest first', () => {
    saveSession(makeSession({ id: 'b', startedAt: '2026-10-20T09:00:00.000Z' }))
    saveSession(makeSession({ id: 'c', startedAt: '2026-10-22T09:00:00.000Z' }))
    saveSession(makeSession({ id: 'a', startedAt: '2026-10-21T09:00:00.000Z' }))
    expect(loadSessions().map((s) => s.id)).toEqual(['c', 'a', 'b'])
  })

  it(`keeps only the newest ${MAX_STORED_SESSIONS} sessions`, () => {
    const many = Array.from({ length: MAX_STORED_SESSIONS + 5 }, (_, i) =>
      makeSession({
        id: `s-${i}`,
        startedAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
      }),
    )
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(many))
    saveSession(
      makeSession({ id: 'newest', startedAt: '2026-10-21T09:00:00.000Z' }),
    )

    const stored = loadSessions()
    expect(stored).toHaveLength(MAX_STORED_SESSIONS)
    expect(stored[0].id).toBe('newest')
    // The six oldest were dropped.
    expect(stored.some((s) => s.id === 's-5')).toBe(false)
    expect(stored.some((s) => s.id === 's-6')).toBe(true)
  })

  it('skips damaged session records and keeps the good ones', () => {
    localStorage.setItem(
      STORAGE_KEYS.sessions,
      JSON.stringify([
        makeSession({ id: 'good' }),
        { id: 'missing-fields' },
        makeSession({ id: 'bad-totals', correct: 9 }),
        makeSession({ id: 'bad-level', difficulty: 7 as never }),
        'not a session',
        null,
      ]),
    )
    expect(loadSessions().map((s) => s.id)).toEqual(['good'])
  })
})

describe('attempts', () => {
  it('saves every field of a completed attempt', () => {
    const attempt = makeAttempt()
    expect(saveAttempt(attempt)).toEqual({ ok: true })

    const [stored] = storedJson(STORAGE_KEYS.attempts) as unknown[]
    expect(stored).toEqual({
      id: 'attempt-1',
      questionId: 'question-1',
      operation: 'multiplication',
      firstOperand: 7,
      secondOperand: 8,
      correctAnswer: 56,
      selectedAnswer: 54,
      selfReportedCorrect: true,
      difficulty: 2,
      source: 'regular',
      attemptedAt: '2026-10-21T09:01:00.000Z',
      sessionId: 'session-1',
    })
    expect(loadAttempts()).toEqual([attempt])
  })

  it('appends to what is stored instead of replacing it', () => {
    saveAttempt(makeAttempt({ id: 'a1', questionId: 'q1' }))
    saveAttempt(makeAttempt({ id: 'a2', questionId: 'q2' }))
    saveAttempt(makeAttempt({ id: 'a3', questionId: 'q3' }))
    expect(loadAttempts().map((a) => a.id)).toEqual(['a1', 'a2', 'a3'])
  })

  it('stores each attempt and each question only once', () => {
    saveAttempt(makeAttempt({ id: 'a1', questionId: 'q1' }))
    saveAttempt(makeAttempt({ id: 'a1', questionId: 'q1' }))
    saveAttempt(makeAttempt({ id: 'a2', questionId: 'q1' }))
    expect(loadAttempts()).toHaveLength(1)
  })

  it('skips damaged attempts and keeps the good ones', () => {
    localStorage.setItem(
      STORAGE_KEYS.attempts,
      JSON.stringify([
        makeAttempt({ id: 'good' }),
        makeAttempt({ id: 'wrong-answer', correctAnswer: 55 }),
        makeAttempt({ id: 'no-result', selfReportedCorrect: 'yes' as never }),
        makeAttempt({ id: 'bad-time', attemptedAt: 'yesterday' }),
        makeAttempt({ id: 'fraction', selectedAnswer: 3.5 }),
        { id: 'partial' },
      ]),
    )
    expect(loadAttempts().map((a) => a.id)).toEqual(['good'])
  })

  it('replaces an unreadable list on the next save, keeping the new attempt', () => {
    localStorage.setItem(STORAGE_KEYS.attempts, '[{"id": "half')
    expect(loadAttempts()).toEqual([])
    saveAttempt(makeAttempt())
    expect(loadAttempts()).toEqual([makeAttempt()])
  })
})

describe('schema version', () => {
  it('is written as {"version": 1} with the first save', () => {
    saveAttempt(makeAttempt())
    expect(storedJson(STORAGE_KEYS.version)).toEqual({
      version: SCHEMA_VERSION,
    })
  })

  it('is not written by loading', () => {
    loadSettings()
    loadSessions()
    loadAttempts()
    prepareStorage()
    expect(localStorage.getItem(STORAGE_KEYS.version)).toBeNull()
  })

  it('refuses to change data saved by a newer version, but still reads it', () => {
    localStorage.setItem(STORAGE_KEYS.version, '{"version": 99}')
    localStorage.setItem(STORAGE_KEYS.attempts, JSON.stringify([makeAttempt()]))
    const before = localStorage.getItem(STORAGE_KEYS.attempts)

    expect(prepareStorage()).toBe('newer-version')
    expect(loadAttempts()).toEqual([makeAttempt()])
    expect(saveAttempt(makeAttempt({ id: 'a2', questionId: 'q2' }))).toEqual({
      ok: false,
      problem: 'newer-version',
    })
    expect(localStorage.getItem(STORAGE_KEYS.attempts)).toBe(before)
  })

  it('rewrites a damaged version entry on the next save', () => {
    localStorage.setItem(STORAGE_KEYS.version, 'garbage')
    expect(prepareStorage()).toBeNull()
    saveAttempt(makeAttempt())
    expect(storedJson(STORAGE_KEYS.version)).toEqual({ version: 1 })
  })

  describe('migrations', () => {
    it('runs each step from the stored version up to the current one', () => {
      localStorage.setItem(STORAGE_KEYS.version, '{"version": 1}')
      localStorage.setItem('mathPractice.old', '"v1 data"')
      const steps: number[] = []
      const migrations: Record<number, Migration> = {
        1: (storage) => {
          steps.push(1)
          storage.setItem('mathPractice.old', '"v2 data"')
        },
        2: (storage) => {
          steps.push(2)
          storage.setItem('mathPractice.old', '"v3 data"')
        },
      }

      expect(prepareStorage(migrations, 3)).toBeNull()
      expect(steps).toEqual([1, 2])
      expect(localStorage.getItem('mathPractice.old')).toBe('"v3 data"')
      expect(storedJson(STORAGE_KEYS.version)).toEqual({ version: 3 })
    })

    it('stops, without writing, when a step is missing', () => {
      localStorage.setItem(STORAGE_KEYS.version, '{"version": 1}')
      expect(prepareStorage({}, 2)).toBe('migration-failed')
      expect(storedJson(STORAGE_KEYS.version)).toEqual({ version: 1 })
    })

    it('does nothing when the stored version is current', () => {
      localStorage.setItem(STORAGE_KEYS.version, '{"version": 1}')
      let ran = false
      prepareStorage({ 1: () => (ran = true) }, 1)
      expect(ran).toBe(false)
    })
  })
})

describe('unrelated browser data', () => {
  it('is never changed by loading, saving or preparing storage', () => {
    seedOtherData()
    prepareStorage()
    loadSettings()
    loadSessions()
    loadAttempts()
    saveSettings(DEFAULT_SETTINGS)
    saveSession(makeSession())
    saveAttempt(makeAttempt())
    expectOtherDataUntouched()
  })

  it('is untouched when our own data is damaged and recovered', () => {
    seedOtherData()
    localStorage.setItem(STORAGE_KEYS.sessions, '{oops')
    localStorage.setItem(STORAGE_KEYS.attempts, '"not a list"')
    saveSession(makeSession())
    saveAttempt(makeAttempt())
    expectOtherDataUntouched()
    expect(loadSessions()).toHaveLength(1)
    expect(loadAttempts()).toHaveLength(1)
  })
})

describe('unavailable storage', () => {
  it('loads defaults and reports problems without throwing', () => {
    makeStorageUnavailable()
    expect(prepareStorage()).toBe('unavailable')
    expect(loadSettings()).toEqual({
      settings: DEFAULT_SETTINGS,
      status: 'unavailable',
    })
    expect(loadSessions()).toEqual([])
    expect(loadAttempts()).toEqual([])
    expect(saveAttempt(makeAttempt())).toEqual({
      ok: false,
      problem: 'unavailable',
    })
    expect(saveSession(makeSession())).toEqual({
      ok: false,
      problem: 'unavailable',
    })
    expect(saveSettings(DEFAULT_SETTINGS)).toEqual({
      ok: false,
      problem: 'unavailable',
    })
  })
})

describe('full storage', () => {
  it('reports "full" without throwing and keeps what was already saved', () => {
    saveAttempt(makeAttempt({ id: 'a1', questionId: 'q1' }))
    const before = localStorage.getItem(STORAGE_KEYS.attempts)
    makeStorageFull()

    expect(saveAttempt(makeAttempt({ id: 'a2', questionId: 'q2' }))).toEqual({
      ok: false,
      problem: 'full',
    })
    expect(saveSession(makeSession())).toEqual({ ok: false, problem: 'full' })
    vi.restoreAllMocks()
    expect(localStorage.getItem(STORAGE_KEYS.attempts)).toBe(before)
  })

  it('reports other write errors as "write-failed"', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('disk on fire')
    })
    expect(saveAttempt(makeAttempt())).toEqual({
      ok: false,
      problem: 'write-failed',
    })
  })
})

describe('mistake patterns', () => {
  const wrong = (overrides = {}) =>
    makeAttempt({ selfReportedCorrect: false, ...overrides })

  it('are created when a wrong attempt is saved, and loaded back', () => {
    saveAttempt(wrong())
    expect(loadMistakePatterns()).toMatchObject([
      { id: 'multiplication:7:8', incorrectCount: 1 },
    ])
  })

  it('are not created for "I Got It Right"', () => {
    saveAttempt(makeAttempt({ selfReportedCorrect: true, selectedAnswer: 3 }))
    expect(localStorage.getItem(STORAGE_KEYS.mistakePatterns)).toBeNull()
  })

  it('count the same attempt only once, even if saved twice', () => {
    saveAttempt(wrong())
    saveAttempt(wrong())
    saveAttempt(wrong({ id: 'another-id' })) // same question id
    expect(loadMistakePatterns()).toMatchObject([{ incorrectCount: 1 }])
  })

  it('update one record for the same fact across sessions', () => {
    saveAttempt(wrong({ id: 'a1', questionId: 'q1' }))
    saveAttempt(
      wrong({ id: 'a2', questionId: 'q2', firstOperand: 8, secondOperand: 7 }),
    )
    expect(loadMistakePatterns()).toMatchObject([{ incorrectCount: 2 }])
  })

  it('are not updated when the attempt could not be saved', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })
    expect(saveAttempt(wrong())).toEqual({ ok: false, problem: 'full' })
    vi.restoreAllMocks()
    expect(loadMistakePatterns()).toEqual([])
  })

  it('skip damaged records and collapse duplicates', () => {
    saveAttempt(wrong())
    const [good] = loadMistakePatterns()
    localStorage.setItem(
      STORAGE_KEYS.mistakePatterns,
      JSON.stringify([
        good,
        { ...good, incorrectCount: 5 }, // duplicate id
        { ...good, id: 'bad-answer', correctAnswer: 55 },
        { ...good, id: 'zero-misses', incorrectCount: 0 },
        { ...good, id: 'bad-date', lastIncorrectAt: 'soon' },
        'nonsense',
      ]),
    )
    expect(loadMistakePatterns()).toEqual([good])
  })

  it('recover from an unreadable list on the next mistake', () => {
    localStorage.setItem(STORAGE_KEYS.mistakePatterns, '{nope')
    expect(loadMistakePatterns()).toEqual([])
    saveAttempt(wrong())
    expect(loadMistakePatterns()).toHaveLength(1)
  })
})

describe('clearing', () => {
  function seed() {
    seedOtherData()
    saveSettings({ ...DEFAULT_SETTINGS, soundEnabled: true })
    saveSession(makeSession())
    saveAttempt(makeAttempt({ selfReportedCorrect: false }))
  }

  it('clearPracticeData removes history and mistakes but keeps settings', () => {
    seed()
    expect(clearPracticeData()).toEqual({ ok: true })
    expect(loadSessions()).toEqual([])
    expect(loadAttempts()).toEqual([])
    expect(loadMistakePatterns()).toEqual([])
    expect(loadSettings().settings.soundEnabled).toBe(true)
    expectOtherDataUntouched()
  })

  it('clearAllData removes every key this app owns and nothing else', () => {
    seed()
    expect(clearAllData()).toEqual({ ok: true })
    for (const key of Object.values(STORAGE_KEYS)) {
      expect(localStorage.getItem(key)).toBeNull()
    }
    expectOtherDataUntouched()
    expect(Object.keys(localStorage).sort()).toEqual(
      Object.keys(OTHER_KEYS).sort(),
    )
  })

  it('reports unavailable storage without throwing', () => {
    makeStorageUnavailable()
    expect(clearPracticeData()).toEqual({ ok: false, problem: 'unavailable' })
    expect(clearAllData()).toEqual({ ok: false, problem: 'unavailable' })
  })
})

describe('active session snapshot', () => {
  const question = generateQuestion('multiplication', 2)
  const valid = (): ActiveSessionSnapshot => ({
    routeKey: 'key-1',
    config: { operations: ['multiplication'], difficulty: 2, sessionLength: 5 },
    session: makeSession({
      completedAt: undefined,
      operations: ['multiplication'],
      attempted: 1,
      correct: 1,
      incorrect: 0,
    }),
    currentQuestion: question,
    attempts: [makeAttempt({ selfReportedCorrect: true })],
    patterns: [],
    masteryThreshold: 3,
    selectedAnswer: question.choices[0],
    isCardFlipped: true,
  })

  it('saves and loads a session in progress', () => {
    saveActiveSession(valid())
    expect(loadActiveSession()).toEqual(valid())
    expect(clearActiveSession()).toEqual({ ok: true })
    expect(loadActiveSession()).toBeNull()
  })

  it.each<[string, (s: ActiveSessionSnapshot) => unknown]>([
    [
      'counts that disagree with the attempts',
      (s) => ({ ...s, session: { ...s.session, attempted: 2, correct: 2 } }),
    ],
    [
      'an attempt from another session',
      (s) => ({ ...s, attempts: [makeAttempt({ sessionId: 'other' })] }),
    ],
    [
      'a current question already answered',
      (s) => ({
        ...s,
        attempts: [makeAttempt({ questionId: s.currentQuestion.id })],
      }),
    ],
    [
      'a finished session',
      (s) => ({
        ...s,
        session: { ...s.session, completedAt: '2026-10-21T10:00:00.000Z' },
      }),
    ],
    ['a flipped card with no answer', (s) => ({ ...s, selectedAnswer: null })],
    [
      'an answer that is not one of the choices',
      (s) => ({ ...s, selectedAnswer: -7 }),
    ],
    [
      'a broken question',
      (s) => ({
        ...s,
        currentQuestion: { ...s.currentQuestion, correctAnswer: 1 },
      }),
    ],
    ['a bad configuration', (s) => ({ ...s, config: { operations: [] } })],
    ['a damaged pattern', (s) => ({ ...s, patterns: [{ id: 'x' }] })],
    ['no route key', (s) => ({ ...s, routeKey: '' })],
  ])('is rejected and removed for %s', (_label, damage) => {
    localStorage.setItem(
      STORAGE_KEYS.activeSession,
      JSON.stringify(damage(valid())),
    )
    expect(loadActiveSession()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull()
  })

  it('is removed by Reset Statistics and Clear All', () => {
    saveActiveSession(valid())
    clearPracticeData()
    expect(loadActiveSession()).toBeNull()
    saveActiveSession(valid())
    clearAllData()
    expect(loadActiveSession()).toBeNull()
  })
})

describe('archiving old attempts (large histories)', () => {
  const OPS = [
    ['addition', 12, 30, 42],
    ['subtraction', 40, 15, 25],
    ['multiplication', 7, 8, 56],
    ['division', 56, 7, 8],
  ] as const
  function many(count: number, start = 0) {
    return Array.from({ length: count }, (_, k) => {
      const i = start + k
      const [operation, a, b, c] = OPS[i % 4]
      return makeAttempt({
        id: `a${i}`,
        questionId: `q${i}`,
        operation,
        firstOperand: a,
        secondOperand: b,
        correctAnswer: c,
        selfReportedCorrect: i % 3 !== 0,
        difficulty: ((i % 4) + 1) as 1 | 2 | 3 | 4,
        source: i % 10 === 0 ? 'mistake-review' : 'regular',
        attemptedAt: new Date(Date.UTC(2026, 0, 1) + i * 60_000).toISOString(),
      })
    })
  }
  const totalsOf = (all: ReturnType<typeof many>) => ({
    stats: calculateStatistics(all),
    mistakes: calculateMistakeStatistics([], all, 3),
  })
  const storedTotals = () => {
    const archived = loadArchivedStatistics()
    return {
      stats: calculateStatistics(loadAttempts(), archived),
      mistakes: calculateMistakeStatistics([], loadAttempts(), 3, archived),
    }
  }

  it('keeps only the newest attempts but exactly the same totals', () => {
    const all = many(MAX_STORED_ATTEMPTS + 3)
    localStorage.setItem(
      STORAGE_KEYS.attempts,
      JSON.stringify(all.slice(0, MAX_STORED_ATTEMPTS + 2)),
    )
    saveAttempt(all[MAX_STORED_ATTEMPTS + 2])

    const kept = loadAttempts()
    expect(kept).toHaveLength(MAX_STORED_ATTEMPTS)
    expect(kept[0].id).toBe('a3')
    expect(kept.at(-1)!.id).toBe(`a${MAX_STORED_ATTEMPTS + 2}`)
    expect(loadArchivedStatistics()).toMatchObject({ attempted: 3 })
    expect(storedTotals()).toEqual(totalsOf(all))
  })

  it('adds up across repeated archiving', () => {
    const all = many(MAX_STORED_ATTEMPTS + 20)
    localStorage.setItem(
      STORAGE_KEYS.attempts,
      JSON.stringify(all.slice(0, MAX_STORED_ATTEMPTS)),
    )
    for (const attempt of all.slice(MAX_STORED_ATTEMPTS)) saveAttempt(attempt)
    expect(loadAttempts()).toHaveLength(MAX_STORED_ATTEMPTS)
    expect(loadArchivedStatistics()).toMatchObject({ attempted: 20 })
    expect(storedTotals()).toEqual(totalsOf(all))
  })

  it('keeps storage bounded', () => {
    localStorage.setItem(
      STORAGE_KEYS.attempts,
      JSON.stringify(many(MAX_STORED_ATTEMPTS)),
    )
    const before = localStorage.getItem(STORAGE_KEYS.attempts)!.length
    for (const attempt of many(50, MAX_STORED_ATTEMPTS)) saveAttempt(attempt)
    const after = localStorage.getItem(STORAGE_KEYS.attempts)!.length
    expect(after).toBeLessThan(before * 1.01)
  })

  it('puts the archive back if the attempts cannot be written, so nothing is counted twice', () => {
    const all = many(MAX_STORED_ATTEMPTS + 1)
    localStorage.setItem(
      STORAGE_KEYS.attempts,
      JSON.stringify(all.slice(0, MAX_STORED_ATTEMPTS)),
    )
    const setItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === STORAGE_KEYS.attempts) {
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      }
      setItem.call(this, key, value)
    })
    expect(saveAttempt(all[MAX_STORED_ATTEMPTS])).toEqual({
      ok: false,
      problem: 'full',
    })
    vi.restoreAllMocks()
    expect(loadArchivedStatistics()).toBeNull()
    expect(loadAttempts()).toHaveLength(MAX_STORED_ATTEMPTS)
    expect(storedTotals()).toEqual(totalsOf(all.slice(0, MAX_STORED_ATTEMPTS)))
  })

  it('ignores archived totals that do not add up', () => {
    const archived = archiveAttempts(many(10), null)
    for (const damaged of [
      { ...archived, correct: archived.correct + 1 },
      { ...archived, reviewCorrect: archived.reviewPracticed + 1 },
      {
        ...archived,
        byOperation: {
          ...archived.byOperation,
          addition: { attempted: 99, correct: 0, incorrect: 99 },
        },
      },
      'nonsense',
    ]) {
      localStorage.setItem(STORAGE_KEYS.statistics, JSON.stringify(damaged))
      expect(loadArchivedStatistics()).toBeNull()
    }
    localStorage.setItem(STORAGE_KEYS.statistics, JSON.stringify(archived))
    expect(loadArchivedStatistics()).toEqual(archived)
  })

  it('is cleared by Reset Statistics', () => {
    localStorage.setItem(
      STORAGE_KEYS.statistics,
      JSON.stringify(archiveAttempts(many(5), null)),
    )
    clearPracticeData()
    expect(loadArchivedStatistics()).toBeNull()
  })
})
