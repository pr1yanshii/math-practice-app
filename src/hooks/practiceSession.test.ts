import { describe, expect, it } from 'vitest'
import type { Question } from '../types/question'
import type { PracticeAttempt, PracticeConfig } from '../types/session'
import { validateQuestion } from '../utils/validation'
import {
  createSessionState,
  practiceSessionReducer,
  type PracticeSessionState,
} from './practiceSession'

const FIXED: PracticeConfig = {
  operations: ['addition', 'multiplication'],
  difficulty: 2,
  sessionLength: 5,
}
const CONTINUOUS: PracticeConfig = { ...FIXED, sessionLength: 'continuous' }

let nextId = 0
function question(): Question {
  nextId += 1
  return {
    id: `q-${nextId}`,
    operation: 'addition',
    firstOperand: nextId,
    secondOperand: 1,
    displayText: `${nextId} + 1`,
    correctAnswer: nextId + 1,
    choices: [nextId + 1, nextId + 2, nextId + 3, nextId + 4],
    difficulty: 2,
    source: 'regular',
  }
}

function attemptFor(
  state: PracticeSessionState,
  selfReportedCorrect: boolean,
  overrides: Partial<PracticeAttempt> = {},
): PracticeAttempt {
  const q = state.currentQuestion
  return {
    id: `a-${q.id}`,
    questionId: q.id,
    operation: q.operation,
    firstOperand: q.firstOperand,
    secondOperand: q.secondOperand,
    correctAnswer: q.correctAnswer,
    selectedAnswer: q.correctAnswer,
    selfReportedCorrect,
    difficulty: q.difficulty,
    source: q.source,
    attemptedAt: '2026-10-21T10:00:00.000Z',
    sessionId: state.session.id,
    ...overrides,
  }
}

function record(
  state: PracticeSessionState,
  selfReportedCorrect: boolean,
  overrides: Partial<PracticeAttempt> = {},
) {
  return practiceSessionReducer(state, {
    type: 'recordResult',
    attempt: attemptFor(state, selfReportedCorrect, overrides),
    nextQuestion: question(),
  })
}

describe('createSessionState', () => {
  it('stores the id, configuration, totals, first question and active flag', () => {
    const state = createSessionState(
      FIXED,
      new Date('2026-10-21T09:00:00.000Z'),
    )

    expect(state.session).toMatchObject({
      startedAt: '2026-10-21T09:00:00.000Z',
      operations: ['addition', 'multiplication'],
      difficulty: 2,
      sessionLength: 5,
      attempted: 0,
      correct: 0,
      incorrect: 0,
    })
    expect(state.session.id).not.toBe('')
    expect(state.session.completedAt).toBeUndefined()
    expect(state.currentQuestionIndex).toBe(0)
    expect(state.attempts).toEqual([])
    expect(state.isActive).toBe(true)
    expect(validateQuestion(state.currentQuestion)).toEqual([])
    expect(FIXED.operations).toContain(state.currentQuestion.operation)
    expect(state.currentQuestion.difficulty).toBe(2)
  })

  it('gives every session its own id', () => {
    expect(createSessionState(FIXED).session.id).not.toBe(
      createSessionState(FIXED).session.id,
    )
  })

  it('copies the operations so later changes to the config do not leak in', () => {
    const operations: PracticeConfig['operations'] = ['division']
    const state = createSessionState({ ...FIXED, operations })
    operations.push('addition')
    expect(state.session.operations).toEqual(['division'])
  })
})

describe('recording a result', () => {
  it('counts "I Got It Right" as correct and moves to the next question', () => {
    const start = createSessionState(FIXED)
    const next = question()
    const state = practiceSessionReducer(start, {
      type: 'recordResult',
      attempt: attemptFor(start, true),
      nextQuestion: next,
    })

    expect(state.session).toMatchObject({
      attempted: 1,
      correct: 1,
      incorrect: 0,
    })
    expect(state.currentQuestion).toBe(next)
    expect(state.currentQuestionIndex).toBe(1)
    expect(state.isActive).toBe(true)
  })

  it('counts "I Got It Wrong" as incorrect', () => {
    const state = record(createSessionState(FIXED), false)
    expect(state.session).toMatchObject({
      attempted: 1,
      correct: 0,
      incorrect: 1,
    })
  })

  it('uses the self-reported result, not whether the selected answer was right', () => {
    let state = createSessionState(FIXED)
    const correctAnswer = state.currentQuestion.correctAnswer
    // Wrong answer, but the student says they got it right.
    state = record(state, true, { selectedAnswer: correctAnswer + 1 })
    // Right answer, but the student says they got it wrong.
    state = record(state, false, {
      selectedAnswer: state.currentQuestion.correctAnswer,
    })

    expect(state.session).toMatchObject({
      attempted: 2,
      correct: 1,
      incorrect: 1,
    })
    expect(state.attempts.map((a) => a.selfReportedCorrect)).toEqual([
      true,
      false,
    ])
  })

  it('stores the completed attempt', () => {
    const start = createSessionState(FIXED)
    const attempt = attemptFor(start, true, { selectedAnswer: 99 })
    const state = practiceSessionReducer(start, {
      type: 'recordResult',
      attempt,
      nextQuestion: question(),
    })
    expect(state.attempts).toEqual([attempt])
    expect(state.attempts[0]).toMatchObject({
      questionId: start.currentQuestion.id,
      sessionId: start.session.id,
      selectedAnswer: 99,
      selfReportedCorrect: true,
    })
  })

  describe('duplicates', () => {
    it('ignores the same result arriving twice', () => {
      const start = createSessionState(FIXED)
      const action = {
        type: 'recordResult' as const,
        attempt: attemptFor(start, true),
        nextQuestion: question(),
      }
      const once = practiceSessionReducer(start, action)
      const twice = practiceSessionReducer(once, action)

      expect(twice).toBe(once)
      expect(twice.session.attempted).toBe(1)
      expect(twice.attempts).toHaveLength(1)
    })

    it('ignores a late result for a question that is no longer showing', () => {
      const start = createSessionState(FIXED)
      const late = attemptFor(start, false)
      const moved = record(start, true)

      const after = practiceSessionReducer(moved, {
        type: 'recordResult',
        attempt: late,
        nextQuestion: question(),
      })
      expect(after).toBe(moved)
      expect(after.session).toMatchObject({ attempted: 1, correct: 1 })
    })

    it('ignores a result whose question was already recorded', () => {
      const start = createSessionState(FIXED)
      const first = attemptFor(start, true)
      const moved = practiceSessionReducer(start, {
        type: 'recordResult',
        attempt: first,
        // The "next" question has the same id as the one just answered.
        nextQuestion: start.currentQuestion,
      })
      const again = practiceSessionReducer(moved, {
        type: 'recordResult',
        attempt: { ...first, id: 'another-id' },
        nextQuestion: question(),
      })
      expect(again).toBe(moved)
    })
  })
})

describe('fixed-length sessions', () => {
  it('ends after the chosen number of questions', () => {
    let state = createSessionState(FIXED)
    const results = [true, false, true, true, false]
    results.forEach((right, i) => {
      expect(state.isActive).toBe(true)
      expect(state.currentQuestionIndex).toBe(i)
      state = record(state, right, {
        attemptedAt: `2026-10-21T10:0${i}:00.000Z`,
      })
    })

    expect(state.isActive).toBe(false)
    expect(state.session).toMatchObject({
      attempted: 5,
      correct: 3,
      incorrect: 2,
      completedAt: '2026-10-21T10:04:00.000Z',
    })
    expect(state.attempts).toHaveLength(5)
  })

  it('ignores results after the session has ended', () => {
    let state = createSessionState({ ...FIXED, sessionLength: 1 })
    state = record(state, true)
    const after = record(state, false)
    expect(after).toBe(state)
    expect(after.session.attempted).toBe(1)
  })
})

describe('continuous sessions', () => {
  it('keeps going with no fixed end', () => {
    let state = createSessionState(CONTINUOUS)
    for (let i = 0; i < 50; i++) state = record(state, i % 2 === 0)

    expect(state.isActive).toBe(true)
    expect(state.session).toMatchObject({
      attempted: 50,
      correct: 25,
      incorrect: 25,
    })
    expect(state.session.completedAt).toBeUndefined()
    expect(state.currentQuestionIndex).toBe(50)
  })

  it('ends when End Session is chosen, keeping the totals', () => {
    let state = record(record(createSessionState(CONTINUOUS), true), false)
    state = practiceSessionReducer(state, {
      type: 'endSession',
      endedAt: '2026-10-21T11:00:00.000Z',
    })

    expect(state.isActive).toBe(false)
    expect(state.session).toMatchObject({
      attempted: 2,
      correct: 1,
      incorrect: 1,
      completedAt: '2026-10-21T11:00:00.000Z',
    })
  })

  it('ignores End Session once the session has ended', () => {
    const ended = practiceSessionReducer(createSessionState(CONTINUOUS), {
      type: 'endSession',
      endedAt: '2026-10-21T11:00:00.000Z',
    })
    const again = practiceSessionReducer(ended, {
      type: 'endSession',
      endedAt: '2026-10-21T12:00:00.000Z',
    })
    expect(again).toBe(ended)
  })
})
