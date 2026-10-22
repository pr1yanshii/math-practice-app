import { useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAppData } from '../app/appContext'
import { Button, ButtonLink } from '../components/common/Button'
import { SessionSummary } from '../components/practice/SessionSummary'
import { useFocusWhen } from '../hooks/useFocusWhen'
import { reviewAvailability } from '../services/mistakeTracker'
import { isPracticeSession } from '../services/storageSchemas'
import type {
  PracticeConfig,
  PracticeSession,
  ReviewMode,
} from '../types/session'
import { REVIEW_UNAVAILABLE_TEXT, mistakeCountText } from '../utils/reviewText'

// What the session page passes here when a session ends. Passing it in
// navigation state means the summary still works if saving failed.
export interface SummaryState {
  session: PracticeSession
  reviewCount: number
  reviewMode?: ReviewMode
  // A mistake-review session that ended because nothing was left to review.
  allMastered?: boolean
}

function isSummaryState(value: unknown): value is SummaryState {
  if (typeof value !== 'object' || value === null) return false
  const { session, reviewCount, reviewMode, allMastered } = value as Record<
    string,
    unknown
  >
  return (
    (reviewMode === undefined ||
      reviewMode === 'regular' ||
      reviewMode === 'mistakes') &&
    (allMastered === undefined || typeof allMastered === 'boolean') &&
    isPracticeSession(session) &&
    Number.isInteger(reviewCount) &&
    (reviewCount as number) >= 0 &&
    (reviewCount as number) <= session.attempted
  )
}

export function SessionSummaryPage() {
  const state: unknown = useLocation().state
  const navigate = useNavigate()
  const { mistakePatterns, settings } = useAppData()
  const headingRef = useRef<HTMLHeadingElement>(null)
  useFocusWhen(headingRef, true)

  if (!isSummaryState(state)) {
    return (
      <section>
        <h1 ref={headingRef} tabIndex={-1}>
          No practice to show
        </h1>
        <p className="lead">Finish a practice session to see how you did.</p>
        <div className="session-finished__actions">
          <ButtonLink to="/practice/setup">Start Practice</ButtonLink>
          <ButtonLink to="/" variant="secondary">
            Return Home
          </ButtonLink>
        </div>
      </section>
    )
  }

  const { session, reviewCount, reviewMode = 'regular', allMastered } = state
  // Uses the latest saved patterns, so mistakes from this session count.
  const review = reviewAvailability(
    mistakePatterns,
    session.operations,
    session.difficulty,
    settings.masteryThreshold,
  )
  const config: PracticeConfig = {
    operations: session.operations,
    difficulty: session.difficulty,
    sessionLength: session.sessionLength,
    // Repeat mistake review only if something is left to review; otherwise
    // Practice Again would open an empty review.
    reviewMode:
      reviewMode === 'mistakes' && review.count > 0 ? 'mistakes' : 'regular',
  }

  return (
    <section className="session-finished">
      <h1 ref={headingRef} tabIndex={-1}>
        Practice finished!
      </h1>
      <p className="lead">
        {session.attempted === 0
          ? 'You didn’t answer any questions this time.'
          : `You answered ${session.attempted} ${
              session.attempted === 1 ? 'question' : 'questions'
            }.`}
      </p>
      {allMastered && (
        <p className="lead">
          You mastered every mistake in this practice, so it finished early.
          Great work!
        </p>
      )}
      <SessionSummary session={session} reviewCount={reviewCount} />
      <div className="session-finished__actions">
        <Button
          onClick={() => navigate('/practice/session', { state: config })}
        >
          Practice Again
        </Button>
        <Button
          variant="secondary"
          disabled={review.count === 0}
          aria-describedby="practice-mistakes-note"
          onClick={() =>
            navigate('/practice/session', {
              state: { ...config, reviewMode: 'mistakes' },
            })
          }
        >
          Practice Mistakes
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate('/practice/setup', { state: config })}
        >
          Change Settings
        </Button>
        <ButtonLink to="/statistics" variant="secondary">
          View Statistics
        </ButtonLink>
        <ButtonLink to="/" variant="secondary">
          Return Home
        </ButtonLink>
      </div>
      <p id="practice-mistakes-note" className="session-finished__note">
        {review.reason
          ? REVIEW_UNAVAILABLE_TEXT[review.reason]
          : `Practice Mistakes: ${mistakeCountText(review.count)} at this level.`}
      </p>
    </section>
  )
}
