import { useId, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAppData } from '../app/appContext'
import { Button } from '../components/common/Button'
import { ChoiceOption } from '../components/common/ChoiceOption'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { DifficultySelector } from '../components/setup/DifficultySelector'
import { OperationSelector } from '../components/setup/OperationSelector'
import { SessionLengthSelector } from '../components/setup/SessionLengthSelector'
import type { AppSettings } from '../types/settings'

const MASTERY_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export function SettingsPage() {
  const { settings, saveSettings, clearAllData } = useAppData()
  const navigate = useNavigate()
  const masteryId = useId()
  const [operationsMessage, setOperationsMessage] = useState('')
  const [confirmingClear, setConfirmingClear] = useState(false)

  // Every change is saved straight away.
  function update(changes: Partial<AppSettings>) {
    saveSettings({ ...settings, ...changes })
  }

  return (
    <section>
      <h1>Settings</h1>
      <p className="lead">Changes are saved automatically on this device.</p>

      <div className="setup-form">
        <fieldset className="setup-group">
          <legend>Practice options</legend>
          <div className="choice-grid">
            <ChoiceOption
              type="checkbox"
              name="animationsEnabled"
              label="Card animation"
              description="Turn the card over when it flips."
              checked={settings.animationsEnabled}
              onChange={() =>
                update({ animationsEnabled: !settings.animationsEnabled })
              }
            />
            <ChoiceOption
              type="checkbox"
              name="showExplanations"
              label="Show explanations"
              description="Show a quick way to check the answer."
              checked={settings.showExplanations}
              onChange={() =>
                update({ showExplanations: !settings.showExplanations })
              }
            />
            <ChoiceOption
              type="checkbox"
              name="feedbackEnabled"
              label="Encouraging messages"
              description="Show a short message like “Nice work!” after each answer."
              checked={settings.feedbackEnabled}
              onChange={() =>
                update({ feedbackEnabled: !settings.feedbackEnabled })
              }
            />
            <ChoiceOption
              type="checkbox"
              name="soundEnabled"
              label="Sound effects"
              description="The app has no sounds yet. This choice is saved for when they are added."
              checked={settings.soundEnabled}
              onChange={() => update({ soundEnabled: !settings.soundEnabled })}
            />
          </div>
        </fieldset>

        <OperationSelector
          legend="Default operations"
          value={settings.defaultOperations}
          onChange={(defaultOperations) => {
            if (defaultOperations.length === 0) {
              setOperationsMessage('Keep at least one operation selected.')
              return
            }
            setOperationsMessage('')
            update({ defaultOperations })
          }}
        />
        <p role="status" className="settings__message">
          {operationsMessage}
        </p>

        <DifficultySelector
          legend="Default level"
          value={settings.defaultDifficulty}
          onChange={(defaultDifficulty) => update({ defaultDifficulty })}
        />

        <SessionLengthSelector
          legend="Default number of questions"
          value={settings.defaultSessionLength}
          onChange={(defaultSessionLength) => update({ defaultSessionLength })}
        />

        <div className="setup-group">
          <label htmlFor={masteryId} className="settings__label">
            Correct similar answers needed to master a mistake
          </label>
          <select
            id={masteryId}
            className="settings__select"
            value={settings.masteryThreshold}
            onChange={(event) =>
              update({ masteryThreshold: Number(event.target.value) })
            }
          >
            {MASTERY_CHOICES.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </div>

        <section aria-labelledby="your-data">
          <h2 id="your-data">Your data</h2>
          <p>
            Your progress is saved only in this browser on this device. Nothing
            is sent anywhere, and no account or personal information is needed.
          </p>
          <p>
            Clearing this browser’s data (cookies and site data) will erase your
            progress.
          </p>
        </section>

        <section aria-labelledby="clear-data" className="danger-zone">
          <h2 id="clear-data">Clear all data</h2>
          <p>
            Erases all settings, practice history, statistics and saved mistakes
            on this device.
          </p>
          <Button variant="secondary" onClick={() => setConfirmingClear(true)}>
            Clear All Application Data
          </Button>
        </section>
      </div>

      {confirmingClear && (
        <ConfirmDialog
          title="Erase everything?"
          confirmLabel="Erase Everything"
          cancelLabel="Keep My Data"
          onConfirm={() => {
            clearAllData()
            navigate('/')
          }}
          onCancel={() => setConfirmingClear(false)}
        >
          <p>
            <strong>
              This permanently deletes all settings, practice history,
              statistics and saved mistakes on this device. It can’t be undone.
            </strong>
          </p>
        </ConfirmDialog>
      )}
    </section>
  )
}
