import { useEffect, useReducer, useRef } from 'react'
import { useAppData } from '../app/appContext'
import type { CardResult } from '../components/practice/QuestionCard'
import {
  DEFAULT_MASTERY_THRESHOLD,
  applyAttempt,
} from '../services/mistakeTracker'
import type { ActiveSessionSnapshot } from '../services/storageSchemas'
import type { MistakePattern } from '../types/mistake'
import type { Question } from '../types/question'
import type { PracticeAttempt, PracticeConfig } from '../types/session'
import { createId } from '../utils/ids'
import {
  chooseNextQuestion,
  createSessionState,
  practiceSessionReducer,
} from './practiceSession'

// `startPatterns` and `masteryThreshold` are what mistake review starts
// from; review sessions must only be started when a first question exists.
// `restored` continues a session saved before a page refresh.
export function usePracticeSession(
  config: PracticeConfig,
  startPatterns: readonly MistakePattern[] = [],
  masteryThreshold: number = DEFAULT_MASTERY_THRESHOLD,
  restored: ActiveSessionSnapshot | null = null,
) {
  const [state, dispatch] = useReducer(practiceSessionReducer, null, () =>
    restored
      ? {
          session: restored.session,
          currentQuestion: restored.currentQuestion,
          currentQuestionIndex: restored.attempts.length,
          attempts: restored.attempts,
          isActive: true,
          allMastered: false,
        }
      : createSessionState(
          config,
          new Date(),
          chooseNextQuestion(config, startPatterns, masteryThreshold, null) ??
            undefined,
        ),
  )
  const { saveAttempt, saveSession } = useAppData()
  const savedAttemptIds = useRef(new Set<string>())
  // This session's view of the patterns, updated as answers come in, so the
  // next review question reflects the answer just given (saving happens
  // after the reducer runs). Each question is applied once.
  const patterns = useRef(restored ? restored.patterns : startPatterns)
  const appliedQuestionIds = useRef(new Set<string>())

  // Save after the reducer has accepted a result, so only attempts that
  // were actually counted are stored, each once. Sessions with no answers
  // are not saved (REQUIREMENTS.md D-15).
  useEffect(() => {
    for (const attempt of state.attempts) {
      if (savedAttemptIds.current.has(attempt.id)) continue
      savedAttemptIds.current.add(attempt.id)
      saveAttempt(attempt)
    }
    if (state.session.attempted > 0) saveSession(state.session)
  }, [state.attempts, state.session, saveAttempt, saveSession])

  // `question` is the card the result came from, not whatever is current
  // by the time the event runs, so a late event can't be recorded against
  // the next question.
  function recordResult(question: Question, result: CardResult) {
    const attempt: PracticeAttempt = {
      id: createId(),
      questionId: question.id,
      operation: question.operation,
      firstOperand: question.firstOperand,
      secondOperand: question.secondOperand,
      correctAnswer: question.correctAnswer,
      selectedAnswer: result.selectedAnswer,
      selfReportedCorrect: result.selfReportedCorrect,
      difficulty: question.difficulty,
      source: question.source,
      mistakePatternId: question.mistakePatternId,
      attemptedAt: new Date().toISOString(),
      sessionId: state.session.id,
    }
    if (!appliedQuestionIds.current.has(question.id)) {
      appliedQuestionIds.current.add(question.id)
      patterns.current = applyAttempt(
        patterns.current,
        attempt,
        masteryThreshold,
      )
    }
    dispatch({
      type: 'recordResult',
      attempt,
      nextQuestion: chooseNextQuestion(
        config,
        patterns.current,
        masteryThreshold,
        question,
      ),
    })
  }

  function endSession() {
    dispatch({ type: 'endSession', endedAt: new Date().toISOString() })
  }

  return { state, recordResult, endSession, patterns }
}
