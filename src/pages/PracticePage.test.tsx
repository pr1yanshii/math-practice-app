import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../services/settings'
import { calculateStatistics } from '../services/statisticsService'
import {
  STORAGE_KEYS,
  loadAttempts,
  loadMistakePatterns,
  loadSessions,
  saveAttempt,
  saveSession,
  saveSettings,
} from '../services/storageService'
import { makeAttempt, makeSession } from '../test/fixtures'
import { POSITIVE_FEEDBACK, SUPPORTIVE_FEEDBACK } from '../utils/feedback'
import { renderRoute } from '../test/renderRoute'
import type { PracticeConfig } from '../types/session'

type User = ReturnType<typeof renderRoute>['user']

const FIVE: PracticeConfig = {
  operations: ['addition', 'subtraction', 'multiplication', 'division'],
  difficulty: 1,
  sessionLength: 5,
}
const CONTINUOUS: PracticeConfig = {
  operations: ['multiplication'],
  difficulty: 2,
  sessionLength: 'continuous',
}

const front = () => document.querySelector<HTMLElement>('.card__face--front')!
const back = () => document.querySelector<HTMLElement>('.card__face--back')!
const questionText = () =>
  front().querySelector('.card__question [aria-hidden="true"]')!.textContent!

// Works out the correct answer from the question shown, e.g. "56 ÷ 7 = ?".
function correctAnswerShown(): number {
  const [a, symbol, b] = questionText().replaceAll(',', '').split(' ')
  const x = Number(a)
  const y = Number(b)
  return { '+': x + y, '−': x - y, '×': x * y, '÷': x / y }[symbol]!
}

const choiceButtons = () =>
  within(
    within(front()).getByRole('group', { name: 'Answer choices' }),
  ).getAllByRole('button')

async function selectAndFlip(user: User, pick: 'correct' | 'wrong') {
  const correct = correctAnswerShown()
  const button = choiceButtons().find(
    (b) =>
      (Number(
        b
          .querySelector('.answer-choice__value')!
          .textContent!.replace(/[^\d]/g, ''),
      ) ===
        correct) ===
      (pick === 'correct'),
  )!
  await user.click(button)
  await user.click(within(front()).getByRole('button', { name: 'Flip Card' }))
}

async function answer(
  user: User,
  pick: 'correct' | 'wrong',
  report: 'right' | 'wrong',
) {
  await selectAndFlip(user, pick)
  await user.click(
    within(back()).getByRole('button', {
      name: report === 'right' ? 'I Got It Right' : 'I Got It Wrong',
    }),
  )
}

const progressText = () =>
  document.querySelector('.session-progress__label')!.textContent

describe('starting a session', () => {
  it('redirects to setup when there is no configuration', () => {
    const { router } = renderRoute('/practice/session')
    expect(router.state.location.pathname).toBe('/practice/setup')
  })

  it.each([
    ['an empty object', {}],
    ['no operations', { ...FIVE, operations: [] }],
    ['an unknown level', { ...FIVE, difficulty: 9 }],
    ['a made-up length', { ...FIVE, sessionLength: 3 }],
    ['a string', 'addition'],
  ])('redirects to setup for %s', (_label, state) => {
    const { router } = renderRoute('/practice/session', state)
    expect(router.state.location.pathname).toBe('/practice/setup')
  })

  it('shows the first question from the chosen operations and level', () => {
    renderRoute('/practice/session', {
      ...FIVE,
      operations: ['division'],
    })
    expect(within(front()).getByText('Question 1 of 5')).toBeInTheDocument()
    expect(questionText()).toMatch(/÷/)
    expect(progressText()).toBe('0 of 5 answered')
  })

  it('works from the setup page through to the first card', async () => {
    const { user } = renderRoute('/practice/setup')
    await user.click(screen.getByRole('radio', { name: /5 questions/ }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))
    expect(within(front()).getByText('Question 1 of 5')).toBeInTheDocument()
  })
})

describe('recording results', () => {
  it('does not count anything for selecting or flipping', async () => {
    const { user } = renderRoute('/practice/session', FIVE)
    await selectAndFlip(user, 'correct')
    expect(progressText()).toBe('0 of 5 answered')
    expect(within(back()).getByText(/Your answer/)).toBeInTheDocument()
  })

  it('counts one attempt per result and moves to a fresh card', async () => {
    const { user } = renderRoute('/practice/session', FIVE)
    const first = questionText()

    await answer(user, 'correct', 'right')

    expect(progressText()).toBe('1 of 5 answered')
    expect(within(front()).getByText('Question 2 of 5')).toBeInTheDocument()
    expect(questionText()).not.toBe(first)
    // The new card starts unselected and unflipped.
    expect(
      within(front()).queryAllByRole('button', { pressed: true }),
    ).toHaveLength(0)
    expect(
      within(front()).getByRole('button', { name: 'Flip Card' }),
    ).toBeDisabled()
    expect(front()).not.toHaveAttribute('inert')
  })

  it('moves focus to the new question', async () => {
    const { user } = renderRoute('/practice/session', FIVE)
    await answer(user, 'correct', 'right')
    await waitFor(() =>
      expect(within(front()).getByRole('heading', { level: 2 })).toHaveFocus(),
    )
  })

  it('counts a double click as one attempt', async () => {
    const { user } = renderRoute('/practice/session', FIVE)
    await selectAndFlip(user, 'correct')
    await user.dblClick(
      within(back()).getByRole('button', { name: 'I Got It Right' }),
    )

    expect(progressText()).toBe('1 of 5 answered')
    expect(within(front()).getByText('Question 2 of 5')).toBeInTheDocument()
  })

  it('finishes a five-question session with self-reported totals', async () => {
    const { user, router } = renderRoute('/practice/session', FIVE)

    // Self-reports deliberately disagree with the maths twice.
    await answer(user, 'correct', 'right')
    await answer(user, 'wrong', 'right') // counted as right
    await answer(user, 'correct', 'wrong') // counted as wrong
    await answer(user, 'wrong', 'wrong')
    expect(progressText()).toBe('4 of 5 answered')
    await answer(user, 'correct', 'right')

    expect(router.state.location.pathname).toBe('/practice/summary')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice finished!' }),
    ).toBeInTheDocument()
    expect(screen.getByText('You answered 5 questions.')).toBeInTheDocument()
    expect(screen.getByText('I got it right').nextSibling).toHaveTextContent(
      '3',
    )
    expect(screen.getByText('I got it wrong').nextSibling).toHaveTextContent(
      '2',
    )
    // No more questions after the last one.
    expect(document.querySelector('.card')).toBeNull()
  })

  it('starts a fresh session with Practice Again', async () => {
    const { user } = renderRoute('/practice/session', {
      ...FIVE,
      sessionLength: 5,
    })
    for (let i = 0; i < 5; i++) await answer(user, 'correct', 'right')

    await user.click(screen.getByRole('button', { name: 'Practice Again' }))

    expect(within(front()).getByText('Question 1 of 5')).toBeInTheDocument()
    expect(progressText()).toBe('0 of 5 answered')
  })
})

describe('progress', () => {
  it('has an accessible progress bar that updates after each attempt', async () => {
    const { user } = renderRoute('/practice/session', FIVE)
    const bar = screen.getByRole('progressbar', { name: '0 of 5 answered' })
    expect(bar).toHaveAttribute('max', '5')
    expect(bar).toHaveAttribute('value', '0')

    await answer(user, 'correct', 'right')
    await answer(user, 'correct', 'wrong')

    expect(
      screen.getByRole('progressbar', { name: '2 of 5 answered' }),
    ).toHaveAttribute('value', '2')
  })
})

describe('continuous practice', () => {
  it('has no total, no progress bar, and keeps going past 20 questions', async () => {
    const { user } = renderRoute('/practice/session', CONTINUOUS)
    expect(within(front()).getByText('Question 1')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()

    for (let i = 0; i < 21; i++) await answer(user, 'correct', 'right')

    expect(within(front()).getByText('Question 22')).toBeInTheDocument()
    expect(questionText()).toMatch(/×/)
  })

  it('ends straight away with End Session before any answers', async () => {
    const { user } = renderRoute('/practice/session', CONTINUOUS)
    await user.click(screen.getByRole('button', { name: 'End Session' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.getByText('You didn’t answer any questions this time.'),
    ).toBeInTheDocument()
  })

  it('asks before ending once questions have been answered', async () => {
    const { user } = renderRoute('/practice/session', CONTINUOUS)
    await answer(user, 'correct', 'right')
    await answer(user, 'correct', 'wrong')

    await user.click(screen.getByRole('button', { name: 'End Session' }))
    const dialog = screen.getByRole('dialog', {
      name: 'End this practice session?',
    })
    expect(dialog).toHaveTextContent('You have answered 2 questions.')

    await user.click(
      within(dialog).getByRole('button', { name: 'Keep Practicing' }),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(front()).getByText('Question 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'End Session' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'End Session',
      }),
    )

    expect(screen.getByText('You answered 2 questions.')).toBeInTheDocument()
    expect(screen.getByText('I got it right').nextSibling).toHaveTextContent(
      '1',
    )
    expect(screen.getByText('I got it wrong').nextSibling).toHaveTextContent(
      '1',
    )
  })

  it('cancels with Escape', async () => {
    const { user } = renderRoute('/practice/session', CONTINUOUS)
    await answer(user, 'correct', 'right')
    await user.click(screen.getByRole('button', { name: 'End Session' }))

    screen
      .getByRole('dialog')
      .dispatchEvent(new Event('cancel', { cancelable: true }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(within(front()).getByText('Question 2')).toBeInTheDocument()
  })

  it('fixed sessions have no End Session button', () => {
    renderRoute('/practice/session', FIVE)
    expect(
      screen.queryByRole('button', { name: 'End Session' }),
    ).not.toBeInTheDocument()
  })
})

describe('saving', () => {
  const historyKeys = () =>
    [
      STORAGE_KEYS.attempts,
      STORAGE_KEYS.sessions,
      STORAGE_KEYS.mistakePatterns,
    ].filter((key) => localStorage.getItem(key) !== null)

  const stored = (key: string) =>
    JSON.parse(localStorage.getItem(key) ?? 'null') as unknown

  it('saves every counted attempt and the finished session', async () => {
    const { user } = renderRoute('/practice/session', FIVE)
    await answer(user, 'wrong', 'right')
    await answer(user, 'correct', 'wrong')
    await answer(user, 'correct', 'right')
    await answer(user, 'correct', 'right')
    await answer(user, 'wrong', 'wrong')

    const attempts = loadAttempts()
    expect(attempts).toHaveLength(5)
    expect(attempts.map((a) => a.selfReportedCorrect)).toEqual([
      true,
      false,
      true,
      true,
      false,
    ])
    // The first was answered wrongly but reported right: both are kept.
    expect(attempts[0].selectedAnswer).not.toBe(attempts[0].correctAnswer)
    const [session] = loadSessions()
    expect(session).toMatchObject({
      attempted: 5,
      correct: 3,
      incorrect: 2,
      operations: FIVE.operations,
      difficulty: 1,
      sessionLength: 5,
    })
    expect(session.completedAt).toBeDefined()
    for (const attempt of attempts) {
      expect(attempt.sessionId).toBe(session.id)
      expect(Date.parse(attempt.attemptedAt)).not.toBeNaN()
    }
    expect(stored(STORAGE_KEYS.version)).toEqual({ version: 1 })
  })

  it('saves after each answer, so progress survives leaving mid-session', async () => {
    const { user } = renderRoute('/practice/session', FIVE)
    await answer(user, 'correct', 'right')
    await answer(user, 'correct', 'wrong')

    expect(loadAttempts()).toHaveLength(2)
    expect(loadSessions()[0]).toMatchObject({ attempted: 2 })
    expect(loadSessions()[0].completedAt).toBeUndefined()
  })

  it('stores a double-clicked answer once', async () => {
    const { user } = renderRoute('/practice/session', FIVE)
    await selectAndFlip(user, 'correct')
    await user.dblClick(
      within(back()).getByRole('button', { name: 'I Got It Right' }),
    )
    expect(loadAttempts()).toHaveLength(1)
  })

  it('does not save anything for selecting or flipping', async () => {
    const { user } = renderRoute('/practice/session', FIVE)
    await selectAndFlip(user, 'correct')
    // Only the in-progress snapshot (Task 74) is saved, never history.
    expect(historyKeys()).toEqual([])
  })

  it('does not save a continuous session ended before any answers', async () => {
    const { user } = renderRoute('/practice/session', CONTINUOUS)
    await user.click(screen.getByRole('button', { name: 'End Session' }))
    expect(historyKeys()).toEqual([])
    expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull()
  })

  it('saves the end time of a continuous session', async () => {
    const { user } = renderRoute('/practice/session', CONTINUOUS)
    await answer(user, 'correct', 'right')
    expect(loadSessions()[0].completedAt).toBeUndefined()
    await user.click(screen.getByRole('button', { name: 'End Session' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'End Session',
      }),
    )
    expect(loadSessions()[0]).toMatchObject({
      attempted: 1,
      sessionLength: 'continuous',
    })
    expect(loadSessions()[0].completedAt).toBeDefined()
  })

  it('adds to earlier saved practice instead of replacing it', async () => {
    saveSession(makeSession({ id: 'earlier' }))
    saveAttempt(makeAttempt({ id: 'earlier-attempt' }))
    localStorage.setItem('otherApp.data', 'keep me')

    const { user } = renderRoute('/practice/session', FIVE)
    await answer(user, 'correct', 'right')

    expect(loadSessions().map((s) => s.id)).toContain('earlier')
    expect(loadSessions()).toHaveLength(2)
    expect(loadAttempts()[0].id).toBe('earlier-attempt')
    expect(loadAttempts()).toHaveLength(2)
    expect(localStorage.getItem('otherApp.data')).toBe('keep me')
  })

  it('opening the app does not overwrite saved data with defaults', () => {
    const settings = { ...DEFAULT_SETTINGS, soundEnabled: true }
    saveSettings(settings)
    saveSession(makeSession())
    saveAttempt(makeAttempt())
    const before = { ...localStorage }

    renderRoute('/')
    renderRoute('/practice/session', FIVE)

    // Everything already saved is unchanged; the only addition is the
    // snapshot of the session now in progress.
    const { [STORAGE_KEYS.activeSession]: snapshot, ...after } = {
      ...localStorage,
    }
    expect(after).toEqual(before)
    expect(snapshot).toBeDefined()
  })

  describe('when storage fails', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('warns when storage is full, and the session carries on', async () => {
      const { user } = renderRoute('/practice/session', FIVE)
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      })

      await answer(user, 'correct', 'right')

      expect(screen.getByRole('alert')).toHaveTextContent(
        'storage is full, so your latest answers weren’t saved',
      )
      expect(progressText()).toBe('1 of 5 answered')
      await answer(user, 'correct', 'wrong')
      expect(progressText()).toBe('2 of 5 answered')

      await user.click(
        within(screen.getByRole('alert')).getByRole('button', { name: 'OK' }),
      )
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('warns at start-up when storage is unavailable, and practice still works to the summary', async () => {
      vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
        throw new DOMException('Access denied', 'SecurityError')
      })
      const { user, router } = renderRoute('/practice/session', {
        ...FIVE,
        sessionLength: 5,
      })
      expect(screen.getByRole('alert')).toHaveTextContent(
        'can’t be saved in this browser',
      )
      for (let i = 0; i < 5; i++) await answer(user, 'correct', 'right')

      expect(router.state.location.pathname).toBe('/practice/summary')
      expect(screen.getByText('You answered 5 questions.')).toBeInTheDocument()
    })

    it('warns when saved data is from a newer version, and leaves it alone', async () => {
      localStorage.setItem(STORAGE_KEYS.version, '{"version": 2}')
      localStorage.setItem(STORAGE_KEYS.attempts, '[]')
      const { user } = renderRoute('/practice/session', FIVE)

      expect(screen.getByRole('alert')).toHaveTextContent('newer version')
      await answer(user, 'correct', 'right')
      expect(localStorage.getItem(STORAGE_KEYS.attempts)).toBe('[]')
    })
  })
})

describe('settings during practice', () => {
  it('uses the card animation setting', () => {
    saveSettings({ ...DEFAULT_SETTINGS, animationsEnabled: false })
    renderRoute('/practice/session', FIVE)
    expect(document.querySelector('.card')).toHaveClass('card--static')
  })

  it('animates by default', () => {
    renderRoute('/practice/session', FIVE)
    expect(document.querySelector('.card')).not.toHaveClass('card--static')
  })

  it('shows an explanation on the back when the setting is on', async () => {
    const { user } = renderRoute('/practice/session', FIVE)
    await selectAndFlip(user, 'correct')
    expect(within(back()).getByText(/Check:|times 0 is 0/)).toBeInTheDocument()
  })

  it('hides the explanation when the setting is off', async () => {
    saveSettings({ ...DEFAULT_SETTINGS, showExplanations: false })
    const { user } = renderRoute('/practice/session', FIVE)
    await selectAndFlip(user, 'correct')
    expect(
      within(back()).queryByText(/Check:|times 0 is 0/),
    ).not.toBeInTheDocument()
  })
})

describe('mistake tracking', () => {
  it('remembers questions the student marks wrong, using the self-report', async () => {
    const { user } = renderRoute('/practice/session', {
      ...FIVE,
      operations: ['multiplication'],
    })
    await answer(user, 'wrong', 'right') // not a mistake: self-report wins
    expect(loadMistakePatterns()).toEqual([])

    const shown = questionText()
    await answer(user, 'correct', 'wrong') // a mistake, though picked right
    const patterns = loadMistakePatterns()
    expect(patterns).toHaveLength(1)
    const [a, , b] = shown.split(' ').map((part) => part.replaceAll(',', ''))
    expect(patterns[0]).toMatchObject({
      operation: 'multiplication',
      correctAnswer: Number(a) * Number(b),
      difficulty: 1,
      incorrectCount: 1,
      similarCorrectCount: 0,
      mastered: false,
    })
  })

  it('does not count a double-clicked "I Got It Wrong" twice', async () => {
    const { user } = renderRoute('/practice/session', FIVE)
    await selectAndFlip(user, 'correct')
    await user.dblClick(
      within(back()).getByRole('button', { name: 'I Got It Wrong' }),
    )
    expect(loadMistakePatterns()).toMatchObject([{ incorrectCount: 1 }])
  })

  it('keeps one pattern per fact across sessions', async () => {
    // A level 1 division session has few possible questions, so repeats
    // across sessions are likely; every stored pattern must be unique.
    for (let run = 0; run < 3; run++) {
      const { user, unmount } = renderRoute('/practice/session', {
        operations: ['division'],
        difficulty: 1,
        sessionLength: 5,
      })
      for (let i = 0; i < 5; i++) await answer(user, 'correct', 'wrong')
      unmount()
    }
    const patterns = loadMistakePatterns()
    expect(new Set(patterns.map((p) => p.id)).size).toBe(patterns.length)
    expect(patterns.reduce((sum, p) => sum + p.incorrectCount, 0)).toBe(15)
    expect(loadAttempts().filter((a) => !a.selfReportedCorrect)).toHaveLength(
      15,
    )
  })
})

describe('mistake review', () => {
  // Saves "I Got It Wrong" attempts for these multiplication facts (level 2).
  function saveMistakes(...facts: [number, number][]) {
    facts.forEach(([a, b], i) =>
      saveAttempt(
        makeAttempt({
          id: `m${i}`,
          questionId: `mq${i}`,
          firstOperand: a,
          secondOperand: b,
          correctAnswer: a * b,
          difficulty: 2,
          selfReportedCorrect: false,
        }),
      ),
    )
  }
  const REVIEW: PracticeConfig = {
    operations: ['multiplication', 'division'],
    difficulty: 2,
    sessionLength: 10,
    reviewMode: 'mistakes',
  }
  const reviewQuestionIds = () =>
    loadAttempts()
      .filter((a) => a.source === 'mistake-review')
      .map((a) => a.mistakePatternId)

  describe('on the setup page', () => {
    const reviewOption = () =>
      screen.getByRole('radio', { name: /Practice my mistakes/ })

    it('is unavailable, with the reason, when there are no mistakes', () => {
      renderRoute('/practice/setup')
      expect(reviewOption()).toBeDisabled()
      expect(reviewOption()).toHaveAccessibleName(
        /You don’t have any mistakes to practice yet/,
      )
      expect(
        screen.getByRole('radio', { name: /Regular practice/ }),
      ).toBeChecked()
    })

    it('shows how many mistakes match the chosen operations and level', async () => {
      saveMistakes([7, 8], [6, 9])
      const { user } = renderRoute('/practice/setup')
      await user.click(screen.getByRole('radio', { name: /Level 2/ }))
      expect(reviewOption()).toBeEnabled()
      expect(reviewOption()).toHaveAccessibleName(/2 mistakes to practice/)

      await user.click(screen.getByRole('radio', { name: /Level 3/ }))
      expect(reviewOption()).toBeDisabled()
      expect(reviewOption()).toHaveAccessibleName(
        /None of your saved mistakes match/,
      )
    })

    it('disables Start with a reason if the choices leave nothing to review', async () => {
      saveMistakes([7, 8])
      const { user } = renderRoute('/practice/setup')
      await user.click(screen.getByRole('radio', { name: /Level 2/ }))
      await user.click(reviewOption())
      await user.click(screen.getByRole('radio', { name: /Level 1/ }))

      expect(
        screen.getByRole('button', { name: 'Start Session' }),
      ).toBeDisabled()
      expect(screen.getByRole('status')).toHaveTextContent(
        'None of your saved mistakes match',
      )
    })

    it('starts a review session', async () => {
      saveMistakes([7, 8])
      const { user, router } = renderRoute('/practice/setup')
      await user.click(screen.getByRole('radio', { name: /Level 2/ }))
      await user.click(reviewOption())
      await user.click(screen.getByRole('button', { name: 'Start Session' }))
      expect(router.state.location.state).toMatchObject({
        reviewMode: 'mistakes',
        difficulty: 2,
      })
      expect(front()).toBeInTheDocument()
    })
  })

  it('asks questions related to the mistakes, within the chosen operations and level', async () => {
    saveMistakes([7, 8], [6, 9])
    const { user } = renderRoute('/practice/session', {
      ...REVIEW,
      operations: ['multiplication'],
    })
    for (let i = 0; i < 4; i++) {
      expect(questionText()).toMatch(/×/)
      await answer(user, 'correct', 'wrong')
    }
    const ids = reviewQuestionIds()
    expect(ids).toHaveLength(4)
    // Every review answer is linked to one of the two saved mistakes, and
    // both mistakes get reviewed.
    expect(new Set(ids)).toEqual(
      new Set(['multiplication:7:8', 'multiplication:6:9']),
    )
  })

  it('goes from mistake to review to mastery, then ends early', async () => {
    saveMistakes([7, 8])
    const { user, router } = renderRoute('/practice/session', REVIEW)

    await answer(user, 'wrong', 'right') // self-report counts, not the pick
    await answer(user, 'correct', 'right')
    expect(loadMistakePatterns()[0]).toMatchObject({
      similarCorrectCount: 2,
      mastered: false,
    })
    await answer(user, 'correct', 'right')

    expect(loadMistakePatterns()[0]).toMatchObject({
      similarCorrectCount: 3,
      mastered: true,
      incorrectCount: 1,
    })
    // Nothing left to review: the 10-question session ends after 3.
    expect(router.state.location.pathname).toBe('/practice/summary')
    expect(
      screen.getByText(/You mastered every mistake in this practice/),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Mistake review questions').nextSibling,
    ).toHaveTextContent('3')
    expect(
      screen.getByRole('button', { name: 'Practice Mistakes' }),
    ).toHaveAccessibleDescription(
      'You’ve mastered all your saved mistakes. Great work!',
    )
  })

  it('uses the mastery threshold from Settings', async () => {
    saveSettings({ ...DEFAULT_SETTINGS, masteryThreshold: 1 })
    saveMistakes([7, 8])
    const { router, user } = renderRoute('/practice/session', REVIEW)
    await answer(user, 'correct', 'right')
    expect(loadMistakePatterns()[0].mastered).toBe(true)
    expect(router.state.location.pathname).toBe('/practice/summary')
  })

  it('a wrong review answer resets progress on the original mistake', async () => {
    saveMistakes([7, 8])
    const { user } = renderRoute('/practice/session', REVIEW)
    await answer(user, 'correct', 'right')
    await answer(user, 'correct', 'right')
    await answer(user, 'correct', 'wrong')

    const patterns = loadMistakePatterns()
    expect(patterns).toHaveLength(1)
    expect(patterns[0]).toMatchObject({
      id: 'multiplication:7:8',
      incorrectCount: 2,
      similarCorrectCount: 0,
      mastered: false,
    })
    // Still reviewable, so the session carries on.
    expect(within(front()).getByText('Question 4 of 10')).toBeInTheDocument()
  })

  it('counts a double-clicked review answer once', async () => {
    saveMistakes([7, 8])
    const { user } = renderRoute('/practice/session', REVIEW)
    await selectAndFlip(user, 'correct')
    await user.dblClick(
      within(back()).getByRole('button', { name: 'I Got It Right' }),
    )
    expect(loadMistakePatterns()[0].similarCorrectCount).toBe(1)
    expect(reviewQuestionIds()).toHaveLength(1)
  })

  it('makes mistakes from a regular session available straight away', async () => {
    const { user } = renderRoute('/practice/session', {
      operations: ['multiplication'],
      difficulty: 2,
      sessionLength: 5,
    })
    for (let i = 0; i < 5; i++) await answer(user, 'correct', 'wrong')
    const button = screen.getByRole('button', { name: 'Practice Mistakes' })
    expect(button).toBeEnabled()

    await user.click(button)
    expect(within(front()).getByText('Question 1 of 5')).toBeInTheDocument()
    await answer(user, 'correct', 'right')
    expect(reviewQuestionIds()).toHaveLength(1)
  })

  it('keeps progress after the app is reloaded', async () => {
    saveMistakes([7, 8])
    const first = renderRoute('/practice/session', REVIEW)
    await answer(first.user, 'correct', 'right')
    await answer(first.user, 'correct', 'right')
    first.unmount()

    // A fresh app reads everything back from storage.
    const { user } = renderRoute('/practice/setup')
    await user.click(screen.getByRole('radio', { name: /Level 2/ }))
    expect(
      screen.getByRole('radio', { name: /Practice my mistakes/ }),
    ).toHaveAccessibleName(/1 mistake to practice/)
    expect(loadMistakePatterns()[0].similarCorrectCount).toBe(2)

    const again = renderRoute('/practice/session', REVIEW)
    await answer(again.user, 'correct', 'right')
    expect(loadMistakePatterns()[0].mastered).toBe(true)
  })

  it('explains instead of starting when nothing is left to review', () => {
    saveMistakes([7, 8])
    saveSettings({ ...DEFAULT_SETTINGS, masteryThreshold: 1 })
    localStorage.setItem(
      STORAGE_KEYS.mistakePatterns,
      JSON.stringify([{ ...loadMistakePatterns()[0], mastered: true }]),
    )
    renderRoute('/practice/session', REVIEW)
    expect(
      screen.getByText('You’ve mastered all your saved mistakes. Great work!'),
    ).toBeInTheDocument()
    expect(document.querySelector('.card')).toBeNull()
  })

  it('includes review answers in statistics', async () => {
    saveMistakes([7, 8])
    const { user } = renderRoute('/practice/session', REVIEW)
    await answer(user, 'correct', 'right')
    await answer(user, 'correct', 'wrong')
    const stats = calculateStatistics(loadAttempts())
    // 1 saved mistake + 2 review answers.
    expect(stats).toMatchObject({ attempted: 3, correct: 1, incorrect: 2 })
  })
})

describe('feedback and announcements', () => {
  const status = () => document.querySelector('.session-status')!

  it('shows encouraging feedback after "right" and supportive feedback after "wrong"', async () => {
    const { user } = renderRoute('/practice/session', FIVE)
    await answer(user, 'wrong', 'right')
    expect(POSITIVE_FEEDBACK).toContain(
      status().querySelector('.feedback')!.textContent,
    )
    await answer(user, 'correct', 'wrong')
    expect(SUPPORTIVE_FEEDBACK).toContain(
      status().querySelector('.feedback')!.textContent,
    )
  })

  it('announces progress after each answer', async () => {
    const { user } = renderRoute('/practice/session', FIVE)
    expect(status()).toBeEmptyDOMElement()
    await answer(user, 'correct', 'right')
    expect(screen.getByRole('status')).toHaveTextContent('1 of 5 answered.')
  })

  it('can turn feedback off; progress is still announced', async () => {
    saveSettings({ ...DEFAULT_SETTINGS, feedbackEnabled: false })
    const { user } = renderRoute('/practice/session', CONTINUOUS)
    await answer(user, 'correct', 'right')
    expect(status().querySelector('.feedback')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('1 answered.')
  })

  it('works with number keys during a real session', async () => {
    const { user } = renderRoute('/practice/session', FIVE)
    await user.keyboard('2')
    expect(
      within(front()).getAllByRole('button', { pressed: true }),
    ).toHaveLength(1)
  })
})

describe('refreshing during a session', () => {
  // Rendering the same route again with the same key is a page refresh.
  function refresh(
    view: ReturnType<typeof renderRoute>,
    state: unknown = FIVE,
  ) {
    view.unmount()
    return renderRoute('/practice/session', state)
  }
  const pressed = () =>
    within(front()).queryAllByRole('button', { pressed: true })

  it('keeps the same question before an answer is picked', () => {
    const first = renderRoute('/practice/session', FIVE)
    const question = questionText()
    refresh(first)
    expect(questionText()).toBe(question)
    expect(within(front()).getByText('Question 1 of 5')).toBeInTheDocument()
    expect(pressed()).toHaveLength(0)
  })

  it('keeps the picked answer', async () => {
    const first = renderRoute('/practice/session', FIVE)
    await first.user.click(choiceButtons()[2])
    const picked = choiceButtons()[2].querySelector(
      '.answer-choice__value',
    )!.textContent
    refresh(first)
    expect(pressed()).toHaveLength(1)
    expect(pressed()[0]).toHaveTextContent(picked!)
  })

  it('keeps a flipped card flipped, without recording anything', async () => {
    const first = renderRoute('/practice/session', FIVE)
    await selectAndFlip(first.user, 'wrong')
    refresh(first)
    expect(front()).toHaveAttribute('inert')
    expect(back()).not.toHaveAttribute('inert')
    expect(within(back()).getByText(/Your answer:/)).toBeInTheDocument()
    expect(loadAttempts()).toEqual([])
    expect(progressText()).toBe('0 of 5 answered')
  })

  it('continues the totals, and counts each answer exactly once', async () => {
    const first = renderRoute('/practice/session', FIVE)
    await answer(first.user, 'correct', 'right')
    await answer(first.user, 'correct', 'wrong')
    const { user, router } = refresh(first)

    expect(progressText()).toBe('2 of 5 answered')
    expect(within(front()).getByText('Question 3 of 5')).toBeInTheDocument()
    expect(loadAttempts()).toHaveLength(2)

    await answer(user, 'correct', 'right')
    await answer(user, 'correct', 'right')
    await answer(user, 'correct', 'wrong')
    expect(router.state.location.pathname).toBe('/practice/summary')
    expect(screen.getByText('You answered 5 questions.')).toBeInTheDocument()
    expect(loadAttempts()).toHaveLength(5)
    expect(new Set(loadAttempts().map((a) => a.questionId)).size).toBe(5)
    expect(loadSessions()).toHaveLength(1)
    expect(loadSessions()[0]).toMatchObject({
      attempted: 5,
      correct: 3,
      incorrect: 2,
    })
    expect(
      loadMistakePatterns().reduce((n, p) => n + p.incorrectCount, 0),
    ).toBe(2)
  })

  it('forgets the session once it has finished', async () => {
    const { user } = renderRoute('/practice/session', {
      ...FIVE,
      sessionLength: 5,
    })
    for (let i = 0; i < 5; i++) await answer(user, 'correct', 'right')
    expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull()
  })

  it('starts a new session for a new navigation (for example Practice Again)', async () => {
    const first = renderRoute('/practice/session', FIVE)
    await answer(first.user, 'correct', 'right')
    first.unmount()
    renderRoute('/practice/session', FIVE, 'another-navigation')
    expect(progressText()).toBe('0 of 5 answered')
  })

  it('starts a new session if the settings no longer match', async () => {
    const first = renderRoute('/practice/session', FIVE)
    await answer(first.user, 'correct', 'right')
    refresh(first, { ...FIVE, difficulty: 2 })
    expect(progressText()).toBe('0 of 5 answered')
  })

  it('continues a mistake-review session with its progress', async () => {
    saveAttempt(
      makeAttempt({ selfReportedCorrect: false, difficulty: 2 }), // 7 × 8
    )
    const review = {
      operations: ['multiplication', 'division'],
      difficulty: 2,
      sessionLength: 10,
      reviewMode: 'mistakes',
    }
    const first = renderRoute('/practice/session', review)
    await answer(first.user, 'correct', 'right')
    await answer(first.user, 'correct', 'right')
    const { user, router } = refresh(first, review)
    expect(within(front()).getByText('Question 3 of 10')).toBeInTheDocument()
    await answer(user, 'correct', 'right')
    expect(loadMistakePatterns()[0]).toMatchObject({
      similarCorrectCount: 3,
      mastered: true,
    })
    expect(router.state.location.pathname).toBe('/practice/summary')
  })

  it('ignores a damaged saved session and starts fresh, keeping other data', async () => {
    saveSession(makeSession({ id: 'earlier' }))
    localStorage.setItem('otherApp.data', 'keep me')
    localStorage.setItem(STORAGE_KEYS.activeSession, '{"routeKey":"default",')
    renderRoute('/practice/session', FIVE)
    expect(progressText()).toBe('0 of 5 answered')
    expect(loadSessions()[0].id).toBe('earlier')
    expect(localStorage.getItem('otherApp.data')).toBe('keep me')
  })

  it('does not count a question twice if the saved session is out of date', async () => {
    const first = renderRoute('/practice/session', FIVE)
    await selectAndFlip(first.user, 'correct')
    const stale = localStorage.getItem(STORAGE_KEYS.activeSession)!
    await first.user.click(
      within(back()).getByRole('button', { name: 'I Got It Right' }),
    )
    // Pretend the snapshot from before the answer is what survived.
    localStorage.setItem(STORAGE_KEYS.activeSession, stale)
    const { user } = refresh(first)
    expect(progressText()).toBe('0 of 5 answered')
    await answer(user, 'correct', 'right')
    expect(loadAttempts()).toHaveLength(2)
    expect(new Set(loadAttempts().map((a) => a.questionId)).size).toBe(2)
  })

  it('still works when storage is unavailable (nothing to restore)', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Access denied', 'SecurityError')
    })
    const first = renderRoute('/practice/session', FIVE)
    await answer(first.user, 'correct', 'right')
    refresh(first)
    expect(progressText()).toBe('0 of 5 answered')
    vi.restoreAllMocks()
  })
})

describe('leaving an active session', () => {
  const homeLink = () =>
    within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', {
      name: 'Home',
    })

  it('does not ask before the first answer', async () => {
    const { user, router } = renderRoute('/practice/session', FIVE)
    await user.click(homeLink())
    expect(router.state.location.pathname).toBe('/')
  })

  it('asks after an answer, and Keep Practicing stays on the same card', async () => {
    const { user, router } = renderRoute('/practice/session', FIVE)
    await answer(user, 'correct', 'right')
    const question = questionText()
    await user.click(homeLink())

    const dialog = screen.getByRole('dialog', { name: 'Leave this practice?' })
    expect(dialog).toHaveTextContent('Your 1 answer is saved')
    await user.click(
      within(dialog).getByRole('button', { name: 'Keep Practicing' }),
    )
    expect(router.state.location.pathname).toBe('/practice/session')
    expect(questionText()).toBe(question)
    expect(progressText()).toBe('1 of 5 answered')
  })

  it('Leave goes there, ends the session and keeps the answers', async () => {
    const { user, router } = renderRoute('/practice/session', FIVE)
    await answer(user, 'correct', 'right')
    await answer(user, 'correct', 'wrong')
    await user.click(homeLink())
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Leave',
      }),
    )

    expect(router.state.location.pathname).toBe('/')
    expect(loadAttempts()).toHaveLength(2)
    expect(loadSessions()[0]).toMatchObject({ attempted: 2 })
    expect(loadSessions()[0].completedAt).toBeDefined()
    expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull()
  })

  it('also asks for the browser Back button', async () => {
    const { user, router } = renderRoute('/practice/setup')
    await user.click(screen.getByRole('button', { name: 'Start Session' }))
    await answer(user, 'correct', 'right')
    await act(() => router.navigate(-1))
    expect(
      screen.getByRole('dialog', { name: 'Leave this practice?' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/practice/session')
  })

  it('does not warn once the session has finished', async () => {
    const { user, router } = renderRoute('/practice/session', {
      ...FIVE,
      sessionLength: 5,
    })
    for (let i = 0; i < 5; i++) await answer(user, 'correct', 'right')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(homeLink())
    expect(router.state.location.pathname).toBe('/')
  })
})

describe('missing sessions', () => {
  it('explains on the setup page why practice could not continue', () => {
    renderRoute('/practice/session')
    expect(
      screen.getByText(/That practice session isn’t available any more/),
    ).toBeInTheDocument()
  })

  it('shows no notice when setup is opened normally', () => {
    renderRoute('/practice/setup')
    expect(
      screen.queryByText(/isn’t available any more/),
    ).not.toBeInTheDocument()
  })
})

describe('damaged data everywhere', () => {
  it('every page still opens, using defaults, and other apps’ data is untouched', async () => {
    localStorage.setItem('otherApp.data', 'keep me')
    for (const key of Object.values(STORAGE_KEYS)) {
      localStorage.setItem(key, '{"broken": tr')
    }
    for (const path of [
      '/',
      '/practice/setup',
      '/statistics',
      '/settings',
      '/practice/summary',
    ]) {
      const { unmount } = renderRoute(path)
      expect(
        await screen.findByRole('heading', { level: 1 }),
      ).toBeInTheDocument()
      unmount()
    }
    const { unmount } = renderRoute('/practice/session', FIVE)
    expect(front()).toBeInTheDocument()
    unmount()
    expect(localStorage.getItem('otherApp.data')).toBe('keep me')
  })
})

describe('complete sessions (integration)', () => {
  it('runs a full 10-question addition session', async () => {
    const { user, router } = renderRoute('/practice/session', {
      operations: ['addition'],
      difficulty: 1,
      sessionLength: 10,
    })
    for (let i = 1; i <= 10; i++) {
      expect(
        within(front()).getByText(`Question ${i} of 10`),
      ).toBeInTheDocument()
      expect(questionText()).toMatch(/ \+ /)
      await answer(user, 'correct', i % 3 === 0 ? 'wrong' : 'right')
    }
    expect(router.state.location.pathname).toBe('/practice/summary')
    expect(
      screen.getByText('Questions answered').nextSibling,
    ).toHaveTextContent('10')
    expect(screen.getByText('I got it right').nextSibling).toHaveTextContent(
      '7',
    )
    expect(screen.getByText('Accuracy').nextSibling).toHaveTextContent('70%')
    expect(loadAttempts().every((a) => a.operation === 'addition')).toBe(true)
    expect(loadMistakePatterns().every((p) => p.operation === 'addition')).toBe(
      true,
    )
  })

  it('mixes the chosen operations within one session', async () => {
    const { user } = renderRoute('/practice/session', {
      operations: ['addition', 'subtraction', 'multiplication', 'division'],
      difficulty: 2,
      sessionLength: 20,
    })
    for (let i = 0; i < 20; i++) await answer(user, 'correct', 'right')
    const used = new Set(loadAttempts().map((a) => a.operation))
    // 20 random picks from 4 operations: all four appear except with
    // probability under 1 in 300.
    expect(used.size).toBeGreaterThanOrEqual(3)
    expect(loadAttempts()).toHaveLength(20)
  })
})
