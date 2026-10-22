import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import type { PracticeConfig } from '../types/session'
import { AppProvider } from '../app/AppProvider'
import { usePracticeSession } from './usePracticeSession'

const wrapper = ({ children }: { children: ReactNode }) => (
  <AppProvider>{children}</AppProvider>
)

const CONFIG: PracticeConfig = {
  operations: ['addition'],
  difficulty: 1,
  sessionLength: 10,
}

describe('usePracticeSession', () => {
  it('records an attempt built from the card that sent it', () => {
    const { result } = renderHook(() => usePracticeSession(CONFIG), { wrapper })
    const first = result.current.state.currentQuestion

    act(() => {
      result.current.recordResult(first, {
        selectedAnswer: first.correctAnswer + 1,
        selfReportedCorrect: true,
      })
    })

    const [attempt] = result.current.state.attempts
    expect(attempt).toMatchObject({
      questionId: first.id,
      operation: first.operation,
      firstOperand: first.firstOperand,
      secondOperand: first.secondOperand,
      correctAnswer: first.correctAnswer,
      selectedAnswer: first.correctAnswer + 1,
      selfReportedCorrect: true,
      difficulty: 1,
      source: 'regular',
      sessionId: result.current.state.session.id,
    })
    expect(Date.parse(attempt.attemptedAt)).not.toBeNaN()
    expect(result.current.state.currentQuestion.id).not.toBe(first.id)
  })

  it('ignores a late result from an earlier card instead of recording it against the new one', () => {
    const { result } = renderHook(() => usePracticeSession(CONFIG), { wrapper })
    const first = result.current.state.currentQuestion

    act(() => {
      result.current.recordResult(first, {
        selectedAnswer: first.correctAnswer,
        selfReportedCorrect: true,
      })
    })
    const second = result.current.state.currentQuestion

    // The same card's event arrives again after the session moved on.
    act(() => {
      result.current.recordResult(first, {
        selectedAnswer: first.correctAnswer,
        selfReportedCorrect: false,
      })
    })

    expect(result.current.state.session).toMatchObject({
      attempted: 1,
      correct: 1,
      incorrect: 0,
    })
    expect(result.current.state.currentQuestion).toBe(second)
  })
})
