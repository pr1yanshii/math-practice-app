import { useCallback, useEffect, useState } from 'react'
import { Navigate, useBlocker, useLocation, useNavigate } from 'react-router'
import { useAppData } from '../app/appContext'
import { Button, ButtonLink } from '../components/common/Button'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { ProgressBar } from '../components/practice/ProgressBar'
import { QuestionCard } from '../components/practice/QuestionCard'
import { usePracticeSession } from '../hooks/usePracticeSession'
import { reviewAvailability } from '../services/mistakeTracker'
import type { ActiveSessionSnapshot } from '../services/storageSchemas'
import {
  clearActiveSession,
  loadActiveSession,
  loadAttempts,
  saveActiveSession,
} from '../services/storageService'
import type { MistakePattern } from '../types/mistake'
import type { PracticeConfig } from '../types/session'
import { pickFeedback } from '../utils/feedback'
import { isValidPracticeConfig } from '../utils/practiceConfig'
import { REVIEW_UNAVAILABLE_TEXT } from '../utils/reviewText'
import type { SummaryState } from './SessionSummaryPage'

export function PracticePage() {
  const location = useLocation()
  const config: unknown = location.state
  // Missing or invalid setup (typed URL, bookmark, bad history state):
  // send the student to set up a session, and say why there.
  if (!isValidPracticeConfig(config)) {
    return (
      <Navigate
        to="/practice/setup"
        replace
        state={{ notice: 'missing-session' }}
      />
    )
  }
  // A new navigation here (for example Practice Again) starts a new
  // session; a page refresh keeps the same key and continues it.
  return (
    <ActiveSession key={location.key} routeKey={location.key} config={config} />
  )
}

const sameConfig = (a: PracticeConfig, b: PracticeConfig) =>
  JSON.stringify({ ...a, reviewMode: a.reviewMode ?? 'regular' }) ===
  JSON.stringify({ ...b, reviewMode: b.reviewMode ?? 'regular' })

// The saved session to continue after a refresh, if it belongs to this
// navigation and none of its questions has been stored yet as answered.
function findRestorableSession(
  routeKey: string,
  config: PracticeConfig,
): ActiveSessionSnapshot | null {
  const snapshot = loadActiveSession()
  if (!snapshot) return null
  const answered = loadAttempts().some(
    (a) => a.questionId === snapshot.currentQuestion.id,
  )
  if (
    snapshot.routeKey !== routeKey ||
    !sameConfig(snapshot.config, config) ||
    answered
  ) {
    return null
  }
  return snapshot
}

function ActiveSession({
  routeKey,
  config,
}: {
  routeKey: string
  config: PracticeConfig
}) {
  const { settings, mistakePatterns } = useAppData()
  // Taken once when the session starts. Patterns change as answers are
  // saved; the session keeps its own up-to-date copy.
  const [start] = useState(() => {
    const restored = findRestorableSession(routeKey, config)
    return {
      restored,
      patterns: restored ? restored.patterns : mistakePatterns,
      threshold: restored
        ? restored.masteryThreshold
        : settings.masteryThreshold,
    }
  })

  if (config.reviewMode === 'mistakes' && !start.restored) {
    const { reason } = reviewAvailability(
      start.patterns,
      config.operations,
      config.difficulty,
      start.threshold,
    )
    // For example a bookmarked review session after everything was mastered.
    if (reason) {
      return (
        <section>
          <h1>Practice my mistakes</h1>
          <p className="lead">{REVIEW_UNAVAILABLE_TEXT[reason]}</p>
          <div className="session-finished__actions">
            <ButtonLink to="/practice/setup">Set Up Practice</ButtonLink>
            <ButtonLink to="/" variant="secondary">
              Return Home
            </ButtonLink>
          </div>
        </section>
      )
    }
  }

  return (
    <SessionRunner
      routeKey={routeKey}
      config={config}
      startPatterns={start.patterns}
      masteryThreshold={start.threshold}
      restored={start.restored}
    />
  )
}

function SessionRunner({
  routeKey,
  config,
  startPatterns,
  masteryThreshold,
  restored,
}: {
  routeKey: string
  config: PracticeConfig
  startPatterns: MistakePattern[]
  masteryThreshold: number
  restored: ActiveSessionSnapshot | null
}) {
  const { state, recordResult, endSession, patterns } = usePracticeSession(
    config,
    startPatterns,
    masteryThreshold,
    restored,
  )
  const { settings, saveSession } = useAppData()
  const [feedback, setFeedback] = useState<string | null>(null)
  const [confirmingEnd, setConfirmingEnd] = useState(false)
  const [card, setCard] = useState(() => ({
    questionId: restored?.currentQuestion.id ?? '',
    selectedAnswer: restored?.selectedAnswer ?? null,
    flipped: restored?.isCardFlipped ?? false,
  }))
  const navigate = useNavigate()
  const { session, currentQuestion, currentQuestionIndex, attempts } = state

  const onCardStateChange = useCallback(
    (selectedAnswer: number | null, flipped: boolean) =>
      setCard({ questionId: currentQuestion.id, selectedAnswer, flipped }),
    [currentQuestion.id],
  )

  // Keep the session in progress saved, so a refresh can continue it
  // (Task 74); forget it once the session ends.
  useEffect(() => {
    if (!state.isActive) {
      clearActiveSession()
      return
    }
    const onThisCard = card.questionId === currentQuestion.id
    saveActiveSession({
      routeKey,
      config,
      session,
      currentQuestion,
      attempts,
      patterns: [...patterns.current],
      masteryThreshold,
      selectedAnswer: onThisCard ? card.selectedAnswer : null,
      isCardFlipped: onThisCard && card.flipped,
    })
  }, [
    state.isActive,
    session,
    currentQuestion,
    attempts,
    card,
    routeKey,
    config,
    masteryThreshold,
    patterns,
  ])

  // Leaving mid-session (header links, Back) asks first (spec §16).
  // Nothing to lose before the first answer, and no warning once finished.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      state.isActive &&
      session.attempted > 0 &&
      currentLocation.pathname !== nextLocation.pathname,
  )

  // When the session ends (last fixed question or End Session), show the
  // summary. `replace` means Back doesn't return to a finished session.
  // The hook's saving effect runs before this one.
  useEffect(() => {
    if (state.isActive) return
    const summary: SummaryState = {
      session,
      reviewCount: attempts.filter((a) => a.source === 'mistake-review').length,
      reviewMode: config.reviewMode ?? 'regular',
      allMastered: state.allMastered,
    }
    navigate('/practice/summary', { replace: true, state: summary })
  }, [
    state.isActive,
    state.allMastered,
    session,
    attempts,
    config.reviewMode,
    navigate,
  ])

  if (!state.isActive) return null

  const total =
    session.sessionLength === 'continuous' ? null : session.sessionLength

  function requestEnd() {
    // Nothing to lose before the first answer, so no need to ask.
    if (session.attempted === 0) endSession()
    else setConfirmingEnd(true)
  }

  function leaveSession() {
    // Answers are already saved; record the session as ended where it is.
    saveSession({ ...session, completedAt: new Date().toISOString() })
    clearActiveSession()
    blocker.proceed?.()
  }

  const restoredCard = restored?.currentQuestion.id === currentQuestion.id

  return (
    <section className="practice">
      <h1 className="visually-hidden">Practice</h1>
      {/* One polite announcement per answer: the feedback (if turned on)
          and, for screen readers, the progress so far. */}
      <p className="session-status" role="status">
        {settings.feedbackEnabled && feedback && (
          <span className="feedback">{feedback}</span>
        )}
        {session.attempted > 0 && (
          <span className="visually-hidden">
            {' '}
            {total === null
              ? `${session.attempted} answered.`
              : `${session.attempted} of ${total} answered.`}
          </span>
        )}
      </p>
      {total !== null && (
        <ProgressBar answered={session.attempted} total={total} />
      )}
      <QuestionCard
        key={currentQuestion.id}
        question={currentQuestion}
        questionNumber={currentQuestionIndex + 1}
        totalQuestions={total}
        focusOnMount={currentQuestionIndex > 0}
        animationsEnabled={settings.animationsEnabled}
        showExplanation={settings.showExplanations}
        initialSelectedAnswer={restoredCard ? restored.selectedAnswer : null}
        initialFlipped={restoredCard ? restored.isCardFlipped : false}
        onCardStateChange={onCardStateChange}
        onResult={(result) => {
          recordResult(currentQuestion, result)
          setFeedback((last) => pickFeedback(result.selfReportedCorrect, last))
        }}
      />
      {total === null && (
        <Button variant="secondary" onClick={requestEnd}>
          End Session
        </Button>
      )}
      {confirmingEnd && (
        <ConfirmDialog
          title="End this practice session?"
          confirmLabel="End Session"
          cancelLabel="Keep Practicing"
          onConfirm={() => {
            setConfirmingEnd(false)
            endSession()
          }}
          onCancel={() => setConfirmingEnd(false)}
        >
          <p>
            You have answered {session.attempted}{' '}
            {session.attempted === 1 ? 'question' : 'questions'}. You can see
            how you did after you finish.
          </p>
        </ConfirmDialog>
      )}
      {blocker.state === 'blocked' && (
        <ConfirmDialog
          title="Leave this practice?"
          confirmLabel="Leave"
          cancelLabel="Keep Practicing"
          onConfirm={leaveSession}
          onCancel={() => blocker.reset?.()}
        >
          <p>
            Your {session.attempted}{' '}
            {session.attempted === 1 ? 'answer is' : 'answers are'} saved, but
            this practice session will end.
          </p>
        </ConfirmDialog>
      )}
    </section>
  )
}
