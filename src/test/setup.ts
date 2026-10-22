import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom does not implement scrolling; React Router's ScrollRestoration calls it.
window.scrollTo = () => {}

// Vitest globals are off, so Testing Library cannot register cleanup itself.
afterEach(() => {
  cleanup()
  // Each test starts with empty storage (test environment only).
  localStorage.clear()
})

// jsdom has no modal dialogs. A minimal stand-in: real modal behaviour
// (focus trapping, Escape, inert background) is checked in Chrome.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.removeAttribute('open')
}
