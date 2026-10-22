import type { MathOperation } from '../../types/question'
import { OPERATION_OPTIONS } from '../../utils/practiceConfig'
import { ChoiceOption } from '../common/ChoiceOption'

interface OperationSelectorProps {
  value: MathOperation[]
  onChange: (operations: MathOperation[]) => void
  legend?: string
}

const ALL_OPERATIONS = OPERATION_OPTIONS.map((option) => option.value)

export function OperationSelector({
  value,
  onChange,
  legend = 'What do you want to practice?',
}: OperationSelectorProps) {
  const allSelected = ALL_OPERATIONS.every((operation) =>
    value.includes(operation),
  )

  function toggle(operation: MathOperation) {
    const next = value.includes(operation)
      ? value.filter((selected) => selected !== operation)
      : [...value, operation]
    // Keep a stable order regardless of click order.
    onChange(ALL_OPERATIONS.filter((option) => next.includes(option)))
  }

  return (
    <fieldset className="setup-group">
      <legend>{legend}</legend>
      <p className="setup-group__hint">Pick one or more.</p>
      <div className="choice-grid">
        <ChoiceOption
          type="checkbox"
          name="operations"
          label="Mixed"
          description="All four together"
          symbol="+−×÷"
          checked={allSelected}
          onChange={() => onChange(allSelected ? [] : ALL_OPERATIONS)}
        />
        {OPERATION_OPTIONS.map((option) => (
          <ChoiceOption
            key={option.value}
            type="checkbox"
            name="operations"
            label={option.label}
            symbol={option.symbol}
            checked={value.includes(option.value)}
            onChange={() => toggle(option.value)}
          />
        ))}
      </div>
    </fieldset>
  )
}
