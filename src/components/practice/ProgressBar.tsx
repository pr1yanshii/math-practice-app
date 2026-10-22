import { useId } from 'react'

interface ProgressBarProps {
  answered: number
  total: number
}

// A native <progress> with a visible label: screen readers announce it as
// a progress bar, for example "3 of 10 answered, 30%".
export function ProgressBar({ answered, total }: ProgressBarProps) {
  const id = useId()
  return (
    <div className="session-progress">
      <label htmlFor={id} className="session-progress__label">
        {answered} of {total} answered
      </label>
      <progress
        id={id}
        className="session-progress__bar"
        max={total}
        value={answered}
      >
        {answered} of {total}
      </progress>
    </div>
  )
}
