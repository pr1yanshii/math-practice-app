import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router'

type ButtonVariant = 'primary' | 'secondary'

function buttonClassName(variant: ButtonVariant, className?: string) {
  return ['button', `button--${variant}`, className].filter(Boolean).join(' ')
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName(variant, className)}
      {...props}
    />
  )
}

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant
}

// Navigation that looks like a button but stays a link for assistive tech.
export function ButtonLink({
  variant = 'primary',
  className,
  ...props
}: ButtonLinkProps) {
  return <Link className={buttonClassName(variant, className)} {...props} />
}
