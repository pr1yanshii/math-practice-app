import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../services/settings'
import {
  loadAttempts,
  loadMistakePatterns,
  loadSessions,
  loadSettings,
  saveAttempt,
  saveSession,
  saveSettings,
} from '../services/storageService'
import { archiveAttempts } from '../services/statisticsService'
import { makeAttempt, makeSession } from '../test/fixtures'
import { renderRouteReady } from '../test/renderRoute'

const section = (name: string) => within(screen.getByRole('region', { name }))

const totalsIn = (container: ReturnType<typeof within>) => {
  const read = (label: string) =>
    container.getByText(label, { selector: 'dt' }).nextElementSibling!
      .textContent
  return {
    attempted: read('Attempted'),
    correct: read('Correct'),
    incorrect: read('Incorrect'),
    accuracy: read('Accuracy'),
  }
}

const card = (region: string, heading: string) =>
  within(
    section(region).getByRole('heading', { level: 3, name: heading })
      .parentElement!,
  )

function seed() {
  // Three addition attempts at level 1 (2 right, 1 wrong) and one division
  // at level 3 (wrong). The first is right by self-report only.
  const add = {
    operation: 'addition' as const,
    firstOperand: 2,
    secondOperand: 3,
    correctAnswer: 5,
    difficulty: 1 as const,
  }
  saveAttempt(
    makeAttempt({
      ...add,
      id: 'a1',
      questionId: 'q1',
      selectedAnswer: 6,
      selfReportedCorrect: true,
    }),
  )
  saveAttempt(
    makeAttempt({
      ...add,
      id: 'a2',
      questionId: 'q2',
      selfReportedCorrect: true,
    }),
  )
  saveAttempt(
    makeAttempt({
      ...add,
      id: 'a3',
      questionId: 'q3',
      selectedAnswer: 5,
      selfReportedCorrect: false,
    }),
  )
  saveAttempt(
    makeAttempt({
      id: 'a4',
      questionId: 'q4',
      operation: 'division',
      firstOperand: 56,
      secondOperand: 7,
      correctAnswer: 8,
      difficulty: 3,
      selfReportedCorrect: false,
    }),
  )
  saveSession(
    makeSession({
      id: 'older',
      startedAt: '2026-10-20T09:00:00.000Z',
      operations: ['division'],
      difficulty: 3,
      sessionLength: 'continuous',
      attempted: 1,
      correct: 0,
      incorrect: 1,
    }),
  )
  saveSession(
    makeSession({
      id: 'newer',
      startedAt: '2026-10-21T09:00:00.000Z',
      operations: ['addition'],
      difficulty: 1,
      attempted: 3,
      correct: 2,
      incorrect: 1,
    }),
  )
}

describe('statistics page', () => {
  it('shows an empty state for a new user', async () => {
    const { user, router } = await renderRouteReady('/statistics')
    expect(screen.getByText(/No practice yet/)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Reset Statistics' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Start Practice' }))
    expect(router.state.location.pathname).toBe('/practice/setup')
  })

  it('says the numbers come from the student’s own answers', async () => {
    seed()
    await renderRouteReady('/statistics')
    expect(
      screen.getByText(/“I Got It Right” counts as correct/),
    ).toBeInTheDocument()
  })

  it('shows overall totals and accuracy from self-reports', async () => {
    seed()
    await renderRouteReady('/statistics')
    expect(totalsIn(section('Overall'))).toEqual({
      attempted: '4',
      correct: '2',
      incorrect: '2',
      accuracy: '50%',
    })
  })

  it('shows one card per operation', async () => {
    seed()
    await renderRouteReady('/statistics')
    expect(
      section('By operation').getAllByRole('heading', { level: 3 }),
    ).toHaveLength(4)
    expect(totalsIn(card('By operation', 'Addition (+)'))).toEqual({
      attempted: '3',
      correct: '2',
      incorrect: '1',
      accuracy: '67%',
    })
    expect(totalsIn(card('By operation', 'Division (÷)'))).toEqual({
      attempted: '1',
      correct: '0',
      incorrect: '1',
      accuracy: '0%',
    })
    expect(totalsIn(card('By operation', 'Subtraction (−)'))).toEqual({
      attempted: '0',
      correct: '0',
      incorrect: '0',
      accuracy: '0%',
    })
  })

  it('shows one clearly labelled card per level', async () => {
    seed()
    await renderRouteReady('/statistics')
    expect(
      section('By level')
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual([
      'Level 1: Beginner',
      'Level 2: Easy',
      'Level 3: Intermediate',
      'Level 4: Advanced',
    ])
    expect(totalsIn(card('By level', 'Level 1: Beginner'))).toMatchObject({
      attempted: '3',
      accuracy: '67%',
    })
    expect(totalsIn(card('By level', 'Level 3: Intermediate'))).toMatchObject({
      attempted: '1',
      incorrect: '1',
    })
  })

  it('lists recent sessions newest first with their details', async () => {
    seed()
    await renderRouteReady('/statistics')
    const items = within(
      section('Recent practice').getByRole('list'),
    ).getAllByRole('listitem')
    expect(items).toHaveLength(2)

    const newest = within(items[0])
    expect(newest.getByRole('heading').querySelector('time')).toHaveAttribute(
      'dateTime',
      '2026-10-21T09:00:00.000Z',
    )
    expect(newest.getByText('Addition')).toBeInTheDocument()
    expect(newest.getByText('Level 1: Beginner')).toBeInTheDocument()
    expect(totalsIn(newest)).toEqual({
      attempted: '3',
      correct: '2',
      incorrect: '1',
      accuracy: '67%',
    })
    expect(within(items[1]).getByText('Division')).toBeInTheDocument()
  })

  it('shows at most 10 recent sessions', async () => {
    for (let i = 0; i < 12; i++) {
      saveSession(
        makeSession({
          id: `s${i}`,
          startedAt: new Date(Date.UTC(2026, 9, 1 + i)).toISOString(),
        }),
      )
    }
    await renderRouteReady('/statistics')
    expect(
      within(section('Recent practice').getByRole('list')).getAllByRole(
        'listitem',
      ),
    ).toHaveLength(10)
  })

  it('shows an empty recent list if sessions are missing but attempts exist', async () => {
    saveAttempt(makeAttempt())
    await renderRouteReady('/statistics')
    expect(
      section('Recent practice').getByText('No practice sessions yet.'),
    ).toBeInTheDocument()
  })
})

describe('reset statistics', () => {
  it('asks with the exact confirmation text and does nothing on cancel', async () => {
    seed()
    const { user } = await renderRouteReady('/statistics')
    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))

    const dialog = screen.getByRole('dialog', {
      name: 'Are you sure you want to erase all practice history and statistics?',
    })
    await user.click(
      within(dialog).getByRole('button', { name: 'Keep History' }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(loadAttempts()).toHaveLength(4)
    expect(loadSessions()).toHaveLength(2)
    expect(totalsIn(section('Overall')).attempted).toBe('4')
  })

  it('erases history, statistics and mistakes after confirming, and keeps settings', async () => {
    seed()
    saveSettings({ ...DEFAULT_SETTINGS, defaultDifficulty: 4 })
    localStorage.setItem('otherApp.data', 'keep me')
    expect(loadMistakePatterns()).toHaveLength(2)
    const { user } = await renderRouteReady('/statistics')

    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Erase History',
      }),
    )

    expect(loadAttempts()).toEqual([])
    expect(loadSessions()).toEqual([])
    expect(loadMistakePatterns()).toEqual([])
    expect(loadSettings().settings.defaultDifficulty).toBe(4)
    expect(localStorage.getItem('otherApp.data')).toBe('keep me')
    // The page refreshes to the empty state straight away.
    expect(screen.getByText(/No practice yet/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Practice history and statistics were erased.',
    )
  })
})

describe('mistake statistics', () => {
  it('shows an empty state when there are no mistakes', async () => {
    saveAttempt(makeAttempt({ selfReportedCorrect: true }))
    await renderRouteReady('/statistics')
    expect(
      section('Mistakes').getByText('No mistakes saved yet.'),
    ).toBeInTheDocument()
  })

  it('shows counts, the most missed operation and facts, and details', async () => {
    seed() // 2 + 3 missed once (addition), 56 ÷ 7 missed once (division)
    saveAttempt(
      makeAttempt({
        id: 'a5',
        questionId: 'q5',
        operation: 'division',
        firstOperand: 56,
        secondOperand: 7,
        correctAnswer: 8,
        difficulty: 3,
        selfReportedCorrect: false,
        attemptedAt: '2026-10-22T09:00:00.000Z',
      }),
    )
    await renderRouteReady('/statistics')
    const mistakes = section('Mistakes')
    const read = (label: string) =>
      mistakes.getByText(label, { selector: 'dt' }).nextElementSibling!
        .textContent
    expect(read('Mistakes to practice')).toBe('2')
    expect(read('Mastered')).toBe('0')
    expect(read('Review questions')).toBe('0')
    expect(mistakes.getByText('Division')).toBeInTheDocument()

    const facts = within(mistakes.getAllByRole('list')[0]).getAllByRole(
      'listitem',
    )
    expect(facts[0]).toHaveTextContent('56 ÷ 7 = 8 missed 2 times')
    expect(facts[1]).toHaveTextContent('2 + 3 = 5 missed 1 time')

    const details = mistakes.getByRole('heading', {
      level: 4,
      name: '56 ÷ 7 = 8',
    }).parentElement!
    expect(details).toHaveTextContent('Missed 2 times')
    expect(details).toHaveTextContent('Practice progress: 0 of 3 right')
    expect(details.querySelector('time')).toHaveAttribute(
      'dateTime',
      '2026-10-22T09:00:00.000Z',
    )
  })

  it('lists mastered mistakes separately', async () => {
    seed()
    const [pattern] = loadMistakePatterns()
    localStorage.setItem(
      'mathPractice.mistakePatterns',
      JSON.stringify([{ ...pattern, mastered: true, similarCorrectCount: 3 }]),
    )
    const { user } = await renderRouteReady('/statistics')
    const mistakes = section('Mistakes')
    expect(
      mistakes.getByText('All saved mistakes are mastered.'),
    ).toBeInTheDocument()
    const summary = mistakes.getByText('Mastered mistakes (1)')
    await user.click(summary)
    expect(summary.closest('details')).toHaveAttribute('open')
    expect(summary.closest('details')).toHaveTextContent(
      'Practice progress: 3 of 3 right',
    )
  })
})

describe('archived totals', () => {
  it('are included in the statistics page totals', async () => {
    seed() // 4 attempts: 2 right, 2 wrong
    localStorage.setItem(
      'mathPractice.statistics',
      JSON.stringify(
        archiveAttempts(
          [
            makeAttempt({
              id: 'old1',
              questionId: 'oq1',
              selfReportedCorrect: true,
            }),
            makeAttempt({
              id: 'old2',
              questionId: 'oq2',
              selfReportedCorrect: true,
            }),
          ],
          null,
        ),
      ),
    )
    await renderRouteReady('/statistics')
    expect(totalsIn(section('Overall'))).toEqual({
      attempted: '6',
      correct: '4',
      incorrect: '2',
      accuracy: '67%',
    })
    expect(totalsIn(card('By operation', 'Multiplication (×)')).attempted).toBe(
      '2',
    )
  })

  it('count as practice history for a user whose detailed attempts were all archived', async () => {
    localStorage.setItem(
      'mathPractice.statistics',
      JSON.stringify(archiveAttempts([makeAttempt()], null)),
    )
    await renderRouteReady('/statistics')
    expect(screen.queryByText(/No practice yet/)).not.toBeInTheDocument()
    expect(totalsIn(section('Overall')).attempted).toBe('1')
  })
})
