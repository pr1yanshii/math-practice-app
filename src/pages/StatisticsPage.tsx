import { useMemo, useState } from 'react'
import { useAppData } from '../app/appContext'
import { Button, ButtonLink } from '../components/common/Button'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { MistakeStatistics } from '../components/statistics/MistakeStatistics'
import { RecentSessions } from '../components/statistics/RecentSessions'
import { StatTotals } from '../components/statistics/StatTotals'
import { StatisticsBreakdown } from '../components/statistics/StatisticsBreakdown'
import {
  calculateMistakeStatistics,
  calculateStatistics,
} from '../services/statisticsService'
import {
  loadArchivedStatistics,
  loadAttempts,
  loadSessions,
} from '../services/storageService'
import { DIFFICULTY_OPTIONS, OPERATION_OPTIONS } from '../utils/practiceConfig'

export const RECENT_SESSION_COUNT = 10

export function StatisticsPage() {
  const { resetPracticeData, mistakePatterns, settings } = useAppData()
  const [data, setData] = useState(() => ({
    attempts: loadAttempts(),
    sessions: loadSessions(),
    archived: loadArchivedStatistics(),
  }))
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const stats = useMemo(
    () => calculateStatistics(data.attempts, data.archived),
    [data],
  )
  const mistakeStats = useMemo(
    () =>
      calculateMistakeStatistics(
        mistakePatterns,
        data.attempts,
        settings.masteryThreshold,
        data.archived,
      ),
    [mistakePatterns, data, settings.masteryThreshold],
  )
  const hasData = stats.attempted > 0 || data.sessions.length > 0

  function reset() {
    resetPracticeData()
    // Show the cleared page straight away.
    setData({ attempts: [], sessions: [], archived: null })
    setConfirmingReset(false)
    setResetDone(true)
  }

  return (
    <section className="statistics">
      <h1>Statistics</h1>
      <p className="lead">
        Based on the student’s own answers: “I Got It Right” counts as correct
        and “I Got It Wrong” as incorrect.
      </p>
      <p role="status" className="statistics__status">
        {resetDone ? 'Practice history and statistics were erased.' : ''}
      </p>

      {!hasData ? (
        <div className="empty-state">
          <p>
            No practice yet. Answer some questions and your statistics will
            appear here.
          </p>
          <ButtonLink to="/practice/setup">Start Practice</ButtonLink>
        </div>
      ) : (
        <>
          <section aria-labelledby="stats-overall">
            <h2 id="stats-overall">Overall</h2>
            <StatTotals totals={stats} />
          </section>

          <section aria-labelledby="stats-operation">
            <h2 id="stats-operation">By operation</h2>
            <StatisticsBreakdown
              items={OPERATION_OPTIONS.map((option) => ({
                key: option.value,
                label: `${option.label} (${option.symbol})`,
                totals: stats.byOperation[option.value],
              }))}
            />
          </section>

          <section aria-labelledby="stats-level">
            <h2 id="stats-level">By level</h2>
            <StatisticsBreakdown
              items={DIFFICULTY_OPTIONS.map((option) => ({
                key: String(option.value),
                label: `Level ${option.value}: ${option.name}`,
                totals: stats.byDifficulty[option.value],
              }))}
            />
          </section>

          <section aria-labelledby="stats-mistakes">
            <h2 id="stats-mistakes">Mistakes</h2>
            <MistakeStatistics
              stats={mistakeStats}
              masteryThreshold={settings.masteryThreshold}
            />
          </section>

          <section aria-labelledby="stats-recent">
            <h2 id="stats-recent">Recent practice</h2>
            <RecentSessions
              sessions={data.sessions.slice(0, RECENT_SESSION_COUNT)}
            />
          </section>

          <Button variant="secondary" onClick={() => setConfirmingReset(true)}>
            Reset Statistics
          </Button>
        </>
      )}

      {confirmingReset && (
        <ConfirmDialog
          title="Are you sure you want to erase all practice history and statistics?"
          confirmLabel="Erase History"
          cancelLabel="Keep History"
          onConfirm={reset}
          onCancel={() => setConfirmingReset(false)}
        >
          <p>
            This also removes saved mistakes. Settings are kept. This can’t be
            undone.
          </p>
        </ConfirmDialog>
      )}
    </section>
  )
}
