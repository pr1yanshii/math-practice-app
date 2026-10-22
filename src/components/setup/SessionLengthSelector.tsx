import type { SessionLength } from '../../types/session'
import { SESSION_LENGTH_OPTIONS } from '../../utils/practiceConfig'
import { ChoiceOption } from '../common/ChoiceOption'

interface SessionLengthSelectorProps {
  value: SessionLength
  onChange: (sessionLength: SessionLength) => void
  legend?: string
}

export function SessionLengthSelector({
  value,
  onChange,
  legend = 'How many questions?',
}: SessionLengthSelectorProps) {
  return (
    <fieldset className="setup-group">
      <legend>{legend}</legend>
      <div className="choice-grid">
        {SESSION_LENGTH_OPTIONS.map((option) => (
          <ChoiceOption
            key={option.value}
            type="radio"
            name="sessionLength"
            label={option.label}
            description={option.description}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
        ))}
      </div>
    </fieldset>
  )
}
