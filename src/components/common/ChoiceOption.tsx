interface ChoiceOptionProps {
  type: 'checkbox' | 'radio'
  name: string
  label: string
  description?: string
  symbol?: string
  checked: boolean
  disabled?: boolean
  onChange: () => void
}

// A large selectable tile built on a native checkbox or radio, so keyboard
// and screen-reader behaviour come from the browser.
export function ChoiceOption({
  type,
  name,
  label,
  description,
  symbol,
  checked,
  disabled = false,
  onChange,
}: ChoiceOptionProps) {
  return (
    <label className="choice">
      <input
        className="choice__input"
        type={type}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="choice__body">
        {symbol && (
          <span className="choice__symbol" aria-hidden="true">
            {symbol}
          </span>
        )}
        <span className="choice__text">
          <span className="choice__label">{label}</span>
          {description && (
            <span className="choice__description">{description}</span>
          )}
        </span>
        <span className="choice__check" aria-hidden="true">
          ✓
        </span>
      </span>
    </label>
  )
}
