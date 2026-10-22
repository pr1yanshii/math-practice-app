import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_SETTINGS } from '../services/settings'
import * as storage from '../services/storageService'
import type { MistakePattern } from '../types/mistake'
import type { PracticeAttempt, PracticeSession } from '../types/session'
import type { AppSettings } from '../types/settings'
import { AppContext, type AppContextValue } from './appContext'

export function AppProvider({ children }: { children: ReactNode }) {
  // Loaded once at start-up. Loading never writes, so saved data is never
  // replaced by defaults.
  const [storageProblem, setStorageProblem] =
    useState<storage.StorageProblem | null>(() => storage.prepareStorage())
  const [settings, setSettings] = useState<AppSettings>(
    () => storage.loadSettings().settings,
  )
  const [mistakePatterns, setMistakePatterns] = useState<MistakePattern[]>(() =>
    storage.loadMistakePatterns(),
  )

  // Stable callbacks, so effects that save don't re-run when the warning
  // changes.
  const report = useCallback((result: storage.WriteResult) => {
    if (!result.ok) setStorageProblem(result.problem)
  }, [])
  const saveSettings = useCallback(
    (next: AppSettings) => {
      setSettings(next)
      report(storage.saveSettings(next))
    },
    [report],
  )
  const saveSession = useCallback(
    (session: PracticeSession) => report(storage.saveSession(session)),
    [report],
  )
  const saveAttempt = useCallback(
    (attempt: PracticeAttempt) => {
      report(storage.saveAttempt(attempt, settings.masteryThreshold))
      // Storage decides what changed; read it back so new mistakes and
      // review progress are available straight away. A regular "I Got It
      // Right" can't change patterns, so skip the update (and re-render).
      if (!attempt.selfReportedCorrect || attempt.source === 'mistake-review') {
        setMistakePatterns(storage.loadMistakePatterns())
      }
    },
    [report, settings.masteryThreshold],
  )
  const resetPracticeData = useCallback(() => {
    report(storage.clearPracticeData())
    setMistakePatterns([])
  }, [report])
  const clearAllData = useCallback(() => {
    report(storage.clearAllData())
    setSettings(DEFAULT_SETTINGS)
    setMistakePatterns([])
  }, [report])
  const dismissStorageProblem = useCallback(() => setStorageProblem(null), [])

  const value = useMemo<AppContextValue>(
    () => ({
      settings,
      mistakePatterns,
      storageProblem,
      dismissStorageProblem,
      saveSettings,
      saveSession,
      saveAttempt,
      resetPracticeData,
      clearAllData,
    }),
    [
      settings,
      mistakePatterns,
      storageProblem,
      dismissStorageProblem,
      saveSettings,
      saveSession,
      saveAttempt,
      resetPracticeData,
      clearAllData,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
