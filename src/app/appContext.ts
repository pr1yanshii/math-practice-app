import { createContext, useContext } from 'react'
import type { StorageProblem } from '../services/storageService'
import type { MistakePattern } from '../types/mistake'
import type { PracticeAttempt, PracticeSession } from '../types/session'
import type { AppSettings } from '../types/settings'

export interface AppContextValue {
  settings: AppSettings
  // Loaded at start-up; used by mistake review in later phases.
  mistakePatterns: MistakePattern[]
  // A saving problem to show the student, or null.
  storageProblem: StorageProblem | null
  dismissStorageProblem: () => void
  saveSettings: (settings: AppSettings) => void
  saveSession: (session: PracticeSession) => void
  saveAttempt: (attempt: PracticeAttempt) => void
  // Reset Statistics: sessions, attempts and mistakes; keeps settings.
  resetPracticeData: () => void
  // Clear All Application Data: everything, back to defaults.
  clearAllData: () => void
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useAppData(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useAppData must be used inside AppProvider')
  return value
}
