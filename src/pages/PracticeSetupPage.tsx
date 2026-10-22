import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAppData } from '../app/appContext'
import { Button } from '../components/common/Button'
import { ChoiceOption } from '../components/common/ChoiceOption'
import { DifficultySelector } from '../components/setup/DifficultySelector'
import { OperationSelector } from '../components/setup/OperationSelector'
import { SessionLengthSelector } from '../components/setup/SessionLengthSelector'
import { reviewAvailability } from '../services/mistakeTracker'
import type { PracticeConfig } from '../types/session'
import { isValidPracticeConfig } from '../utils/practiceConfig'
import { REVIEW_UNAVAILABLE_TEXT, mistakeCountText } from '../utils/reviewText'

// Sent by the practice page when it was opened without a session.
function isMissingSessionNotice(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    (state as { notice?: unknown }).notice === 'missing-session'
  )
}

export function PracticeSetupPage() {
  const navigate = useNavigate()
  const previous: unknown = useLocation().state
  const { settings, mistakePatterns } = useAppData()
  // "Change Settings" from the summary brings the last choices back;
  // otherwise start from the saved defaults (Settings page). Either can be
  // changed for this session.
  const [config, setConfig] = useState<PracticeConfig>(() =>
    isValidPracticeConfig(previous)
      ? previous
      : {
          operations: settings.defaultOperations,
          difficulty: settings.defaultDifficulty,
          sessionLength: settings.defaultSessionLength,
        },
  )
  const reviewing = config.reviewMode === 'mistakes'
  const review = reviewAvailability(
    mistakePatterns,
    config.operations,
    config.difficulty,
    settings.masteryThreshold,
  )
  const canStart =
    isValidPracticeConfig(config) && (!reviewing || review.count > 0)
  const status = !isValidPracticeConfig(config)
    ? 'Pick at least one kind of problem to start.'
    : reviewing && review.reason
      ? REVIEW_UNAVAILABLE_TEXT[review.reason]
      : ''

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canStart) return
    navigate('/practice/session', { state: config })
  }

  return (
    <section>
      <h1>Set up your practice</h1>
      {isMissingSessionNotice(previous) && (
        <p className="setup-form__status" role="status">
          That practice session isn’t available any more. Choose your practice
          below to start a new one.
        </p>
      )}
      <form className="setup-form" onSubmit={handleSubmit}>
        <fieldset className="setup-group">
          <legend>What kind of practice?</legend>
          <div className="choice-grid">
            <ChoiceOption
              type="radio"
              name="reviewMode"
              label="Regular practice"
              description="New questions."
              checked={!reviewing}
              onChange={() => setConfig({ ...config, reviewMode: 'regular' })}
            />
            <ChoiceOption
              type="radio"
              name="reviewMode"
              label="Practice my mistakes"
              description={
                review.reason
                  ? REVIEW_UNAVAILABLE_TEXT[review.reason]
                  : `Questions like ones you got wrong. ${mistakeCountText(review.count)}.`
              }
              checked={reviewing}
              // Stays selectable while chosen, so changing operations or
              // level can't trap the student; Start explains instead.
              disabled={review.count === 0 && !reviewing}
              onChange={() => setConfig({ ...config, reviewMode: 'mistakes' })}
            />
          </div>
        </fieldset>
        <OperationSelector
          value={config.operations}
          onChange={(operations) => setConfig({ ...config, operations })}
        />
        <DifficultySelector
          value={config.difficulty}
          onChange={(difficulty) => setConfig({ ...config, difficulty })}
        />
        <SessionLengthSelector
          value={config.sessionLength}
          onChange={(sessionLength) => setConfig({ ...config, sessionLength })}
        />
        <div className="setup-form__actions">
          <p id="setup-status" className="setup-form__status" role="status">
            {status}
          </p>
          <Button
            type="submit"
            className="button--large"
            disabled={!canStart}
            aria-describedby="setup-status"
          >
            Start Session
          </Button>
        </div>
      </form>
    </section>
  )
}
