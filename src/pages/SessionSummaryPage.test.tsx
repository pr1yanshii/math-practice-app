import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { calculateAccuracy } from '../services/statisticsService'
import { saveAttempt } from '../services/storageService'
import { makeAttempt, makeSession } from '../test/fixtures'
import { renderRoute } from '../test/renderRoute'
import type { SummaryState } from './SessionSummaryPage'

const value = (label: string) =>
  screen.getByText(label, { selector: 'dt' }).nextElementSibling!.textContent

function renderSummary(state: Partial<SummaryState> = {}) {
  return renderRoute('/practice/summary', {
    session: makeSession(),
    reviewCount: 0,
    ...state,
  })
}

describe('calculateAccuracy', () => {
  it.each([
    [3, 5, 60],
    [5, 5, 100],
    [0, 5, 0],
    [1, 3, 33],
    [2, 3, 67],
    [0, 0, 0],
  ])('%s of %s is %s%%', (correct, attempted, expected) => {
    expect(calculateAccuracy(correct, attempted)).toBe(expected)
  })
})

describe('session summary page', () => {
  it('shows every summary item from the specification', () => {
    renderSummary({ reviewCount: 0 })

    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice finished!' }),
    ).toBeInTheDocument()
    expect(screen.getByText('You answered 5 questions.')).toBeInTheDocument()
    expect(value('Questions answered')).toBe('5')
    expect(value('I got it right')).toBe('3')
    expect(value('I got it wrong')).toBe('2')
    expect(value('Accuracy')).toBe('60%')
    expect(value('Practiced')).toBe('Addition, Multiplication')
    expect(value('Level')).toBe('Level 2: Easy')
    expect(value('Mistake review questions')).toBe('0')
  })

  it('moves focus to the heading', async () => {
    renderSummary()
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toHaveFocus(),
    )
  })

  it('handles a session ended before any answers', () => {
    renderSummary({
      session: makeSession({
        sessionLength: 'continuous',
        attempted: 0,
        correct: 0,
        incorrect: 0,
      }),
    })
    expect(
      screen.getByText('You didn’t answer any questions this time.'),
    ).toBeInTheDocument()
    expect(value('Accuracy')).toBe('0%')
  })

  it('says "1 question" for a single answer', () => {
    renderSummary({
      session: makeSession({ attempted: 1, correct: 1, incorrect: 0 }),
    })
    expect(screen.getByText('You answered 1 question.')).toBeInTheDocument()
  })

  it.each([
    ['no state', undefined],
    ['a damaged session', { session: { id: 'x' }, reviewCount: 0 }],
    [
      'totals that do not add up',
      { session: makeSession({ correct: 4 }), reviewCount: 0 },
    ],
    [
      'more review questions than answers',
      { session: makeSession(), reviewCount: 6 },
    ],
  ])('shows a safe message for %s', async (_label, state) => {
    const { user, router } = renderRoute('/practice/summary', state)
    expect(
      screen.getByRole('heading', { name: 'No practice to show' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Start Practice' }))
    expect(router.state.location.pathname).toBe('/practice/setup')
  })
})

describe('summary actions', () => {
  it('Practice Again starts a new session with the same settings', async () => {
    const { user, router } = renderSummary()
    await user.click(screen.getByRole('button', { name: 'Practice Again' }))

    expect(router.state.location.pathname).toBe('/practice/session')
    expect(router.state.location.state).toEqual({
      operations: ['addition', 'multiplication'],
      difficulty: 2,
      sessionLength: 5,
      reviewMode: 'regular',
    })
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
  })

  it('Practice Mistakes is disabled with a reason when there are no mistakes', () => {
    renderSummary()
    const button = screen.getByRole('button', { name: 'Practice Mistakes' })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription(
      'You don’t have any mistakes to practice yet. Questions you mark “I Got It Wrong” will show up here.',
    )
  })

  it('Practice Mistakes starts mistake review for this session’s level', async () => {
    saveAttempt(
      makeAttempt({ selfReportedCorrect: false, difficulty: 2 }), // 7 × 8
    )
    const { user, router } = renderSummary({
      session: makeSession({ operations: ['multiplication'] }),
    })
    const button = screen.getByRole('button', { name: 'Practice Mistakes' })
    expect(button).toHaveAccessibleDescription(
      'Practice Mistakes: 1 mistake to practice at this level.',
    )
    await user.click(button)
    expect(router.state.location.state).toMatchObject({
      operations: ['multiplication'],
      difficulty: 2,
      reviewMode: 'mistakes',
    })
  })

  it('Practice Again repeats mistake review after a review session', async () => {
    saveAttempt(makeAttempt({ selfReportedCorrect: false }))
    const { user, router } = renderSummary({ reviewMode: 'mistakes' })
    await user.click(screen.getByRole('button', { name: 'Practice Again' }))
    expect(router.state.location.state).toMatchObject({
      reviewMode: 'mistakes',
    })
  })

  it('says when a review session ended because everything was mastered', () => {
    renderSummary({ reviewMode: 'mistakes', allMastered: true })
    expect(
      screen.getByText(/You mastered every mistake in this practice/),
    ).toBeInTheDocument()
  })

  it('Change Settings opens setup with the same choices selected', async () => {
    const { user, router } = renderSummary({
      session: makeSession({
        operations: ['division'],
        difficulty: 3,
        sessionLength: 20,
      }),
    })
    await user.click(screen.getByRole('button', { name: 'Change Settings' }))

    expect(router.state.location.pathname).toBe('/practice/setup')
    const operations = within(
      screen.getByRole('group', { name: 'What do you want to practice?' }),
    )
    expect(operations.getByRole('checkbox', { name: /Division/ })).toBeChecked()
    expect(
      operations.getByRole('checkbox', { name: /Addition/ }),
    ).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /Level 3/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /20 questions/ })).toBeChecked()
  })

  it.each([
    ['View Statistics', '/statistics'],
    ['Return Home', '/'],
  ])('%s goes to %s', async (name, path) => {
    const { user, router } = renderSummary()
    await user.click(
      within(screen.getByRole('main')).getByRole('link', { name }),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe(path))
  })
})

describe('after every mistake is mastered', () => {
  it('Practice Again starts regular practice instead of an empty review', async () => {
    const { user, router } = renderSummary({
      reviewMode: 'mistakes',
      allMastered: true,
    })
    await user.click(screen.getByRole('button', { name: 'Practice Again' }))
    expect(router.state.location.state).toMatchObject({
      reviewMode: 'regular',
    })
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
  })
})
