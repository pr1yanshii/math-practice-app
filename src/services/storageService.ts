import type { MistakePattern } from '../types/mistake'
import type { PracticeAttempt, PracticeSession } from '../types/session'
import type { AppSettings } from '../types/settings'
import type { ArchivedStatistics } from '../types/statistics'
import { DEFAULT_MASTERY_THRESHOLD, applyAttempt } from './mistakeTracker'
import { archiveAttempts } from './statisticsService'
import { sanitizeSettings } from './settings'
import {
  isActiveSessionSnapshot,
  isArchivedStatistics,
  isMistakePattern,
  isPracticeAttempt,
  isPracticeSession,
  type ActiveSessionSnapshot,
} from './storageSchemas'

// Only these keys are ever read or written. The app never calls
// localStorage.clear(), so other sites' and apps' data is untouched.
export const STORAGE_KEYS = {
  version: 'mathPractice.version',
  settings: 'mathPractice.settings',
  sessions: 'mathPractice.sessions',
  attempts: 'mathPractice.attempts',
  mistakePatterns: 'mathPractice.mistakePatterns',
  // The session in progress, so a page refresh can continue it (Task 74).
  activeSession: 'mathPractice.activeSession',
  // Totals for attempts trimmed from the detailed history (Task 84).
  statistics: 'mathPractice.statistics',
} as const

export const SCHEMA_VERSION = 1
export const MAX_STORED_SESSIONS = 200
// About 1.3 MB; keeps well inside the browser's ~5 MB limit
// (REQUIREMENTS.md D-12). Older attempts become archived totals.
export const MAX_STORED_ATTEMPTS = 5000

export type StorageProblem =
  'unavailable' | 'full' | 'newer-version' | 'migration-failed' | 'write-failed'

export type WriteResult = { ok: true } | { ok: false; problem: StorageProblem }

// MIGRATIONS[n] upgrades stored data from version n to n + 1. Version 1 is
// the first format, so there are none yet.
export type Migration = (storage: Storage) => void
export const MIGRATIONS: Readonly<Record<number, Migration>> = {}

// --- Low-level access -----------------------------------------------------

function getStorage(): Storage | null {
  try {
    // Reading the property can throw (blocked cookies, some private modes).
    const storage = window.localStorage
    storage.getItem(STORAGE_KEYS.version)
    return storage
  } catch {
    return null
  }
}

type ReadResult =
  | { status: 'ok'; value: unknown }
  | { status: 'missing' }
  | { status: 'corrupt' }
  | { status: 'unavailable' }

function readJson(key: string): ReadResult {
  const storage = getStorage()
  if (!storage) return { status: 'unavailable' }
  let raw: string | null
  try {
    raw = storage.getItem(key)
  } catch {
    return { status: 'unavailable' }
  }
  if (raw === null) return { status: 'missing' }
  try {
    return { status: 'ok', value: JSON.parse(raw) }
  } catch {
    return { status: 'corrupt' }
  }
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22)
  )
}

// null when no usable version is stored (nothing saved yet, or a damaged
// version entry; the first save writes a fresh one).
function readStoredVersion(storage: Storage): number | null {
  try {
    const raw = storage.getItem(STORAGE_KEYS.version)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    const version = (parsed as { version?: unknown } | null)?.version
    return Number.isInteger(version) && (version as number) >= 1
      ? (version as number)
      : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): WriteResult {
  const storage = getStorage()
  if (!storage) return { ok: false, problem: 'unavailable' }

  // Never write over data in a format this version doesn't understand.
  const version = readStoredVersion(storage)
  if (version !== null && version > SCHEMA_VERSION) {
    return { ok: false, problem: 'newer-version' }
  }
  if (version !== null && version < SCHEMA_VERSION) {
    return { ok: false, problem: 'migration-failed' }
  }

  try {
    storage.setItem(key, JSON.stringify(value))
    if (version === null) {
      storage.setItem(
        STORAGE_KEYS.version,
        JSON.stringify({ version: SCHEMA_VERSION }),
      )
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, problem: isQuotaError(error) ? 'full' : 'write-failed' }
  }
}

function readList<T>(
  key: string,
  isValid: (value: unknown) => value is T,
): T[] {
  const result = readJson(key)
  if (result.status !== 'ok' || !Array.isArray(result.value)) return []
  // Keep the good records; skip damaged ones instead of losing everything.
  return result.value.filter(isValid)
}

// --- Start-up check and migrations ----------------------------------------

// Run once when the app starts. Reads only, unless an older stored version
// has a migration to apply. Returns a problem to show the student, if any.
export function prepareStorage(
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  targetVersion: number = SCHEMA_VERSION,
): StorageProblem | null {
  const storage = getStorage()
  if (!storage) return 'unavailable'

  const version = readStoredVersion(storage)
  if (version === null || version === targetVersion) return null
  if (version > targetVersion) return 'newer-version'

  try {
    for (let from = version; from < targetVersion; from++) {
      const migrate = migrations[from]
      if (!migrate) return 'migration-failed'
      migrate(storage)
      storage.setItem(
        STORAGE_KEYS.version,
        JSON.stringify({ version: from + 1 }),
      )
    }
    return null
  } catch (error) {
    return isQuotaError(error) ? 'full' : 'migration-failed'
  }
}

// --- Settings -------------------------------------------------------------

export type SettingsLoadStatus = 'ok' | 'missing' | 'recovered' | 'unavailable'

export function loadSettings(): {
  settings: AppSettings
  status: SettingsLoadStatus
} {
  const result = readJson(STORAGE_KEYS.settings)
  if (result.status === 'unavailable' || result.status === 'missing') {
    return {
      settings: sanitizeSettings(undefined).settings,
      status: result.status,
    }
  }
  if (result.status === 'corrupt') {
    return {
      settings: sanitizeSettings(undefined).settings,
      status: 'recovered',
    }
  }
  const { settings, allValid } = sanitizeSettings(result.value)
  return { settings, status: allValid ? 'ok' : 'recovered' }
}

export function saveSettings(settings: AppSettings): WriteResult {
  return writeJson(STORAGE_KEYS.settings, settings)
}

// --- Sessions -------------------------------------------------------------

// Newest first.
export function loadSessions(): PracticeSession[] {
  return readList(STORAGE_KEYS.sessions, isPracticeSession).sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt),
  )
}

// Adds the session, or updates it if it is already stored (for example when
// it ends). Keeps the newest MAX_STORED_SESSIONS.
export function saveSession(session: PracticeSession): WriteResult {
  const others = loadSessions().filter((stored) => stored.id !== session.id)
  const sessions = [session, ...others]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, MAX_STORED_SESSIONS)
  return writeJson(STORAGE_KEYS.sessions, sessions)
}

// --- Attempts -------------------------------------------------------------

// Oldest first, in the order they were answered.
export function loadAttempts(): PracticeAttempt[] {
  return readList(STORAGE_KEYS.attempts, isPracticeAttempt)
}

// Re-reads what is stored and appends, so it never replaces saved attempts
// with an in-memory copy. A question can only be stored once, and mistake
// patterns are only updated when the attempt is newly stored, so the same
// answer can never count twice (as a mistake or as review progress).
export function saveAttempt(
  attempt: PracticeAttempt,
  masteryThreshold: number = DEFAULT_MASTERY_THRESHOLD,
): WriteResult {
  const attempts = loadAttempts()
  if (
    attempts.some(
      (stored) =>
        stored.id === attempt.id || stored.questionId === attempt.questionId,
    )
  ) {
    return { ok: true }
  }
  const saved = writeAttemptsKeepingTotals([...attempts, attempt])
  // Regular correct answers never change patterns; skip the write.
  if (
    !saved.ok ||
    (attempt.selfReportedCorrect && attempt.source !== 'mistake-review')
  ) {
    return saved
  }
  return writeJson(
    STORAGE_KEYS.mistakePatterns,
    applyAttempt(loadMistakePatterns(), attempt, masteryThreshold),
  )
}

// Writes the attempts, moving the oldest beyond MAX_STORED_ATTEMPTS into the
// archived totals first, so statistics stay exact. If the attempts can't be
// written, the archive is put back so nothing is counted twice.
function writeAttemptsKeepingTotals(attempts: PracticeAttempt[]): WriteResult {
  const overflow = attempts.length - MAX_STORED_ATTEMPTS
  if (overflow <= 0) return writeJson(STORAGE_KEYS.attempts, attempts)

  const previous = readJson(STORAGE_KEYS.statistics)
  const archived = archiveAttempts(
    attempts.slice(0, overflow),
    loadArchivedStatistics(),
  )
  const archivedResult = writeJson(STORAGE_KEYS.statistics, archived)
  if (!archivedResult.ok) return archivedResult

  const saved = writeJson(STORAGE_KEYS.attempts, attempts.slice(overflow))
  if (!saved.ok) {
    if (previous.status === 'ok') {
      writeJson(STORAGE_KEYS.statistics, previous.value)
    } else {
      removeKeys([STORAGE_KEYS.statistics])
    }
  }
  return saved
}

export function loadArchivedStatistics(): ArchivedStatistics | null {
  const result = readJson(STORAGE_KEYS.statistics)
  return result.status === 'ok' && isArchivedStatistics(result.value)
    ? result.value
    : null
}

// --- Mistake patterns ------------------------------------------------------

export function loadMistakePatterns(): MistakePattern[] {
  const valid = readList(STORAGE_KEYS.mistakePatterns, isMistakePattern)
  // Keep the first record for each id, so damaged duplicates collapse.
  return valid.filter(
    (pattern, index) => valid.findIndex((p) => p.id === pattern.id) === index,
  )
}

// --- Clearing --------------------------------------------------------------

function removeKeys(keys: readonly string[]): WriteResult {
  const storage = getStorage()
  if (!storage) return { ok: false, problem: 'unavailable' }
  try {
    for (const key of keys) storage.removeItem(key)
    return { ok: true }
  } catch {
    return { ok: false, problem: 'write-failed' }
  }
}

// Reset Statistics: practice history only. Settings stay
// (REQUIREMENTS.md D-13).
export function clearPracticeData(): WriteResult {
  return removeKeys([
    STORAGE_KEYS.sessions,
    STORAGE_KEYS.attempts,
    STORAGE_KEYS.mistakePatterns,
    STORAGE_KEYS.activeSession,
    STORAGE_KEYS.statistics,
  ])
}

// --- Active session ---------------------------------------------------------

// Returns null (and removes the entry) when what is stored isn't a usable
// session, so a damaged snapshot only costs the session in progress.
export function loadActiveSession(): ActiveSessionSnapshot | null {
  const result = readJson(STORAGE_KEYS.activeSession)
  if (result.status === 'ok' && isActiveSessionSnapshot(result.value)) {
    return result.value
  }
  if (result.status === 'ok' || result.status === 'corrupt') {
    clearActiveSession()
  }
  return null
}

export function saveActiveSession(
  snapshot: ActiveSessionSnapshot,
): WriteResult {
  return writeJson(STORAGE_KEYS.activeSession, snapshot)
}

export function clearActiveSession(): WriteResult {
  return removeKeys([STORAGE_KEYS.activeSession])
}

// Clear All Application Data: every key this app owns, nothing else.
export function clearAllData(): WriteResult {
  return removeKeys(Object.values(STORAGE_KEYS))
}
