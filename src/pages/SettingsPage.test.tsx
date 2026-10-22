import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../services/settings'
import {
  STORAGE_KEYS,
  loadMistakePatterns,
  loadSettings,
  saveAttempt,
  saveSession,
  saveSettings,
} from '../services/storageService'
import { makeAttempt, makeSession } from '../test/fixtures'
import { renderRoute, renderRouteReady } from '../test/renderRoute'

const group = (name: string) => within(screen.getByRole('group', { name }))

describe('settings page', () => {
  it('shows the saved settings', async () => {
    saveSettings({
      ...DEFAULT_SETTINGS,
      soundEnabled: true,
      animationsEnabled: false,
      defaultOperations: ['division'],
      defaultDifficulty: 3,
      defaultSessionLength: 'continuous',
      masteryThreshold: 5,
    })
    await renderRouteReady('/settings')

    expect(
      screen.getByRole('checkbox', { name: /Sound effects/ }),
    ).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: /Card animation/ }),
    ).not.toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: /Show explanations/ }),
    ).toBeChecked()
    expect(
      group('Default operations').getByRole('checkbox', { name: /Division/ }),
    ).toBeChecked()
    expect(
      group('Default operations').getByRole('checkbox', { name: /Addition/ }),
    ).not.toBeChecked()
    expect(
      group('Default level').getByRole('radio', { name: /Level 3/ }),
    ).toBeChecked()
    expect(
      group('Default number of questions').getByRole('radio', {
        name: /Keep going/,
      }),
    ).toBeChecked()
    expect(
      screen.getByRole('combobox', { name: /needed to master a mistake/ }),
    ).toHaveValue('5')
  })

  it('saves each change automatically', async () => {
    const { user } = await renderRouteReady('/settings')

    await user.click(screen.getByRole('checkbox', { name: /Sound effects/ }))
    await user.click(screen.getByRole('checkbox', { name: /Card animation/ }))
    await user.click(
      screen.getByRole('checkbox', { name: /Show explanations/ }),
    )
    await user.click(
      group('Default operations').getByRole('checkbox', { name: /Mixed/ }),
    )
    // Unticking Mixed with everything selected would leave none: refused.
    expect(loadSettings().settings.defaultOperations).toHaveLength(4)
    await user.click(
      group('Default operations').getByRole('checkbox', { name: /Addition/ }),
    )
    await user.click(
      group('Default level').getByRole('radio', { name: /Level 2/ }),
    )
    await user.click(
      group('Default number of questions').getByRole('radio', {
        name: /20 questions/,
      }),
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: /needed to master/ }),
      '4',
    )

    expect(loadSettings()).toEqual({
      status: 'ok',
      settings: {
        soundEnabled: true,
        animationsEnabled: false,
        showExplanations: false,
        feedbackEnabled: true,
        defaultOperations: ['subtraction', 'multiplication', 'division'],
        defaultDifficulty: 2,
        defaultSessionLength: 20,
        masteryThreshold: 4,
      },
    })
  })

  it('keeps at least one default operation and explains why', async () => {
    saveSettings({ ...DEFAULT_SETTINGS, defaultOperations: ['addition'] })
    const { user } = await renderRouteReady('/settings')

    await user.click(
      group('Default operations').getByRole('checkbox', { name: /Addition/ }),
    )

    expect(
      group('Default operations').getByRole('checkbox', { name: /Addition/ }),
    ).toBeChecked()
    expect(
      screen.getByText('Keep at least one operation selected.'),
    ).toBeInTheDocument()
    expect(loadSettings().settings.defaultOperations).toEqual(['addition'])
  })

  it('is honest that there are no sounds yet', async () => {
    await renderRouteReady('/settings')
    expect(
      screen.getByRole('checkbox', { name: /Sound effects/ }),
    ).toHaveAccessibleName(/The app has no sounds yet/)
  })
})

describe('default practice settings on the setup page', () => {
  it('starts from the saved defaults', async () => {
    saveSettings({
      ...DEFAULT_SETTINGS,
      defaultOperations: ['subtraction'],
      defaultDifficulty: 4,
      defaultSessionLength: 5,
    })
    renderRoute('/practice/setup')

    const operations = group('What do you want to practice?')
    expect(
      operations.getByRole('checkbox', { name: /Subtraction/ }),
    ).toBeChecked()
    expect(
      operations.getByRole('checkbox', { name: /Addition/ }),
    ).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /Level 4/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /5 questions/ })).toBeChecked()
  })

  it('lets one session differ without changing the defaults', async () => {
    saveSettings({ ...DEFAULT_SETTINGS, defaultDifficulty: 4 })
    const { user, router } = renderRoute('/practice/setup')

    await user.click(screen.getByRole('radio', { name: /Level 2/ }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))

    expect(router.state.location.state).toMatchObject({ difficulty: 2 })
    expect(loadSettings().settings.defaultDifficulty).toBe(4)
  })

  it('a settings change is used the next time setup opens', async () => {
    const { user } = await renderRouteReady('/settings')
    await user.click(
      group('Default level').getByRole('radio', { name: /Level 3/ }),
    )
    await user.click(
      within(screen.getByRole('navigation', { name: 'Main' })).getByRole(
        'link',
        { name: 'Practice' },
      ),
    )
    expect(screen.getByRole('radio', { name: /Level 3/ })).toBeChecked()
  })
})

describe('clear all application data', () => {
  function seed() {
    saveSettings({ ...DEFAULT_SETTINGS, soundEnabled: true })
    saveSession(makeSession())
    saveAttempt(makeAttempt({ selfReportedCorrect: false }))
    localStorage.setItem('otherApp.data', 'keep me')
  }

  it('shows a strong warning and keeps everything on cancel', async () => {
    seed()
    const { user } = await renderRouteReady('/settings')
    await user.click(
      screen.getByRole('button', { name: 'Clear All Application Data' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Erase everything?' })
    expect(dialog).toHaveTextContent(
      'permanently deletes all settings, practice history, statistics and saved mistakes',
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Keep My Data' }),
    )
    expect(localStorage.getItem(STORAGE_KEYS.attempts)).not.toBeNull()
    expect(loadSettings().settings.soundEnabled).toBe(true)
  })

  it('clears everything, restores defaults and returns home', async () => {
    seed()
    const { user, router } = await renderRouteReady('/settings')
    await user.click(
      screen.getByRole('button', { name: 'Clear All Application Data' }),
    )
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Erase Everything',
      }),
    )

    expect(router.state.location.pathname).toBe('/')
    for (const key of Object.values(STORAGE_KEYS)) {
      expect(localStorage.getItem(key)).toBeNull()
    }
    expect(loadMistakePatterns()).toEqual([])
    expect(localStorage.getItem('otherApp.data')).toBe('keep me')

    // The app is back on defaults straight away.
    await user.click(
      within(screen.getByRole('navigation', { name: 'Main' })).getByRole(
        'link',
        { name: 'Settings' },
      ),
    )
    expect(
      screen.getByRole('checkbox', { name: /Sound effects/ }),
    ).not.toBeChecked()
  })
})

describe('feedback setting', () => {
  it('is on by default and can be turned off', async () => {
    const { user } = await renderRouteReady('/settings')
    const toggle = screen.getByRole('checkbox', {
      name: /Encouraging messages/,
    })
    expect(toggle).toBeChecked()
    await user.click(toggle)
    expect(loadSettings().settings.feedbackEnabled).toBe(false)
  })
})

describe('privacy note', () => {
  it('explains that progress stays in this browser and clearing data erases it', async () => {
    await renderRouteReady('/settings')
    const note = within(screen.getByRole('region', { name: 'Your data' }))
    expect(
      note.getByText(/saved only in this browser on this device/),
    ).toBeInTheDocument()
    expect(note.getByText(/Nothing is sent anywhere/)).toBeInTheDocument()
    expect(note.getByText(/will erase your progress/)).toBeInTheDocument()
  })
})
