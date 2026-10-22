import { formatNumber } from '../../utils/questionText'

interface AnswerChoiceProps {
  value: number
  // 1–4: the number key that also picks this answer.
  shortcut: number
  selected: boolean
  disabled: boolean
  onSelect: (value: number) => void
}

export function AnswerChoice({
  value,
  shortcut,
  selected,
  disabled,
  onSelect,
}: AnswerChoiceProps) {
  return (
    <button
      type="button"
      className="answer-choice"
      aria-pressed={selected}
      aria-keyshortcuts={String(shortcut)}
      disabled={disabled}
      onClick={() => onSelect(value)}
    >
      {/* The check mark shows the selection by shape, not only colour. */}
      <span className="answer-choice__check" aria-hidden="true">
        {selected ? '✓' : ''}
      </span>
      <span className="answer-choice__value">{formatNumber(value)}</span>
      <span className="answer-choice__key" aria-hidden="true">
        {shortcut}
      </span>
    </button>
  )
}
