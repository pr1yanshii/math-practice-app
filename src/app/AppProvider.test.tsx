import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../services/settings'
import { makeAttempt } from '../test/fixtures'
import { STORAGE_KEYS, loadSettings } from '../services/storageService'
import { AppProvider } from './AppProvider'
import { useAppData } from './appContext'

function SettingsProbe() {
  const { settings, saveSettings } = useAppData()
  return (
    <>
      <p>sound: {String(settings.soundEnabled)}</p>
      <p>threshold: {settings.masteryThreshold}</p>
      <button
        onClick={() => saveSettings({ ...settings, masteryThreshold: 7 })}
      >
        change
      </button>
    </>
  )
}

describe('AppProvider settings', () => {
  it('loads saved settings when the app starts', () => {
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ ...DEFAULT_SETTINGS, soundEnabled: true }),
    )
    render(
      <AppProvider>
        <SettingsProbe />
      </AppProvider>,
    )
    expect(screen.getByText('sound: true')).toBeInTheDocument()
  })

  it('uses defaults when nothing is saved, without saving them', () => {
    render(
      <AppProvider>
        <SettingsProbe />
      </AppProvider>,
    )
    expect(screen.getByText('sound: false')).toBeInTheDocument()
    expect(screen.getByText('threshold: 3')).toBeInTheDocument()
    expect(localStorage.length).toBe(0)
  })

  it('saves changed settings and updates the app', async () => {
    render(
      <AppProvider>
        <SettingsProbe />
      </AppProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'change' }))
    expect(screen.getByText('threshold: 7')).toBeInTheDocument()
    expect(loadSettings().settings.masteryThreshold).toBe(7)
  })
})

describe('AppProvider updates', () => {
  it('does not re-render the app for a regular "I Got It Right" (patterns cannot change)', async () => {
    let renders = 0
    const probe: {
      save: (attempt: ReturnType<typeof makeAttempt>) => void
    } = { save: () => {} }
    function Probe() {
      const { saveAttempt, mistakePatterns } = useAppData()
      renders++
      useEffect(() => {
        probe.save = saveAttempt
      })
      return <p>patterns: {mistakePatterns.length}</p>
    }
    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    )
    const before = renders
    act(() =>
      probe.save(
        makeAttempt({ id: 'a1', questionId: 'q1', selfReportedCorrect: true }),
      ),
    )
    expect(renders).toBe(before)

    act(() =>
      probe.save(
        makeAttempt({ id: 'a2', questionId: 'q2', selfReportedCorrect: false }),
      ),
    )
    expect(renders).toBe(before + 1)
    expect(screen.getByText('patterns: 1')).toBeInTheDocument()
  })
})
