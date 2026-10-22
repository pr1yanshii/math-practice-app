import type { DifficultyLevel } from '../../types/question'
import { DIFFICULTY_OPTIONS } from '../../utils/practiceConfig'
import { ChoiceOption } from '../common/ChoiceOption'

interface DifficultySelectorProps {
  value: DifficultyLevel
  onChange: (difficulty: DifficultyLevel) => void
  legend?: string
}

export function DifficultySelector({
  value,
  onChange,
  legend = 'How hard should it be?',
}: DifficultySelectorProps) {
  return (
    <fieldset className="setup-group">
      <legend>{legend}</legend>
      <p className="setup-group__hint">Pick one level.</p>
      <div className="choice-grid">
        {DIFFICULTY_OPTIONS.map((option) => (
          <ChoiceOption
            key={option.value}
            type="radio"
            name="difficulty"
            label={`Level ${option.value}: ${option.name}`}
            description={option.description}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
        ))}
      </div>
    </fieldset>
  )
}
