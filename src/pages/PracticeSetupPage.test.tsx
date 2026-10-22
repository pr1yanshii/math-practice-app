import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'

function group(name: string) {
  return within(screen.getByRole('group', { name }))
}

const operations = () => group('What do you want to practice?')
const difficulty = () => group('How hard should it be?')
const length = () => group('How many questions?')
const startButton = () => screen.getByRole('button', { name: 'Start Session' })

describe('Practice setup page', () => {
  it('starts with all operations, Level 1, and 10 questions selected', () => {
    renderRoute('/practice/setup')

    for (const name of [
      /Mixed/,
      /Addition/,
      /Subtraction/,
      /Multiplication/,
      /Division/,
    ]) {
      expect(operations().getByRole('checkbox', { name })).toBeChecked()
    }
    expect(difficulty().getByRole('radio', { name: /Level 1/ })).toBeChecked()
    expect(length().getByRole('radio', { name: /10 questions/ })).toBeChecked()
    expect(startButton()).toBeEnabled()
  })

  describe('operations', () => {
    it('allows more than one operation and any combination', async () => {
      const { user } = renderRoute('/practice/setup')

      await user.click(operations().getByRole('checkbox', { name: /Mixed/ }))
      await user.click(
        operations().getByRole('checkbox', { name: /Multiplication/ }),
      )
      await user.click(operations().getByRole('checkbox', { name: /Division/ }))

      expect(
        operations().getByRole('checkbox', { name: /Multiplication/ }),
      ).toBeChecked()
      expect(
        operations().getByRole('checkbox', { name: /Division/ }),
      ).toBeChecked()
      expect(
        operations().getByRole('checkbox', { name: /Addition/ }),
      ).not.toBeChecked()
      expect(
        operations().getByRole('checkbox', { name: /Mixed/ }),
      ).not.toBeChecked()
    })

    it('Mixed selects all four, and clears them when unticked', async () => {
      const { user } = renderRoute('/practice/setup')
      const mixed = operations().getByRole('checkbox', { name: /Mixed/ })

      await user.click(mixed)
      expect(
        operations().queryAllByRole('checkbox', { checked: true }),
      ).toHaveLength(0)

      await user.click(
        operations().getByRole('checkbox', { name: /Subtraction/ }),
      )
      expect(mixed).not.toBeChecked()

      await user.click(mixed)
      expect(
        operations().getAllByRole('checkbox', { checked: true }),
      ).toHaveLength(5)
    })

    it('ticking the last missing operation also ticks Mixed', async () => {
      const { user } = renderRoute('/practice/setup')
      const addition = operations().getByRole('checkbox', { name: /Addition/ })

      await user.click(addition)
      expect(
        operations().getByRole('checkbox', { name: /Mixed/ }),
      ).not.toBeChecked()
      await user.click(addition)
      expect(
        operations().getByRole('checkbox', { name: /Mixed/ }),
      ).toBeChecked()
    })

    it('can be toggled with the keyboard', async () => {
      const { user } = renderRoute('/practice/setup')
      const division = operations().getByRole('checkbox', { name: /Division/ })

      division.focus()
      await user.keyboard(' ')
      expect(division).not.toBeChecked()
      await user.keyboard(' ')
      expect(division).toBeChecked()
    })
  })

  describe('difficulty', () => {
    it('offers four labelled levels with descriptions', () => {
      renderRoute('/practice/setup')

      const levels = difficulty().getAllByRole('radio')
      expect(levels).toHaveLength(4)
      for (const name of [
        'Level 1: Beginner',
        'Level 2: Easy',
        'Level 3: Intermediate',
        'Level 4: Advanced',
      ]) {
        expect(
          difficulty().getByRole('radio', { name: new RegExp(name) }),
        ).toBeInTheDocument()
      }
      expect(
        difficulty().getByRole('radio', { name: /Numbers up to 1,000/ }),
      ).toBeInTheDocument()
    })

    it('allows only one level at a time', async () => {
      const { user } = renderRoute('/practice/setup')

      await user.click(difficulty().getByRole('radio', { name: /Level 3/ }))

      expect(difficulty().getByRole('radio', { name: /Level 3/ })).toBeChecked()
      expect(
        difficulty().getAllByRole('radio', { checked: true }),
      ).toHaveLength(1)
    })

    it('can be changed with arrow keys', async () => {
      const { user } = renderRoute('/practice/setup')

      difficulty()
        .getByRole('radio', { name: /Level 1/ })
        .focus()
      await user.keyboard('{ArrowDown}')

      expect(difficulty().getByRole('radio', { name: /Level 2/ })).toBeChecked()
    })
  })

  describe('session length', () => {
    it('offers 5, 10, 20, and continuous practice, one at a time', async () => {
      const { user } = renderRoute('/practice/setup')

      expect(length().getAllByRole('radio')).toHaveLength(4)
      for (const name of [/5 questions/, /20 questions/, /Keep going/]) {
        await user.click(length().getByRole('radio', { name }))
        expect(length().getByRole('radio', { name })).toBeChecked()
        expect(length().getAllByRole('radio', { checked: true })).toHaveLength(
          1,
        )
      }
    })
  })

  describe('Start Session', () => {
    it('is disabled with a message when no operation is selected', async () => {
      const { user } = renderRoute('/practice/setup')

      await user.click(operations().getByRole('checkbox', { name: /Mixed/ }))

      expect(startButton()).toBeDisabled()
      expect(screen.getByRole('status')).toHaveTextContent(
        'Pick at least one kind of problem to start.',
      )
      expect(startButton()).toHaveAccessibleDescription(
        'Pick at least one kind of problem to start.',
      )
    })

    it('re-enables and clears the message once an operation is picked', async () => {
      const { user } = renderRoute('/practice/setup')

      await user.click(operations().getByRole('checkbox', { name: /Mixed/ }))
      await user.click(operations().getByRole('checkbox', { name: /Addition/ }))

      expect(startButton()).toBeEnabled()
      expect(screen.getByRole('status')).toBeEmptyDOMElement()
    })

    it('does not start when Enter is pressed with nothing selected', async () => {
      const { user, router } = renderRoute('/practice/setup')
      const mixed = operations().getByRole('checkbox', { name: /Mixed/ })

      await user.click(mixed)
      mixed.focus()
      await user.keyboard('{Enter}')

      expect(router.state.location.pathname).toBe('/practice/setup')
    })

    it('passes the chosen configuration to the practice session', async () => {
      const { user, router } = renderRoute('/practice/setup')

      await user.click(operations().getByRole('checkbox', { name: /Mixed/ }))
      await user.click(
        operations().getByRole('checkbox', { name: /Multiplication/ }),
      )
      await user.click(operations().getByRole('checkbox', { name: /Addition/ }))
      await user.click(difficulty().getByRole('radio', { name: /Level 2/ }))
      await user.click(length().getByRole('radio', { name: /Keep going/ }))
      await user.click(startButton())

      expect(router.state.location.pathname).toBe('/practice/session')
      // Operations are kept in a fixed order, not click order.
      expect(router.state.location.state).toEqual({
        operations: ['addition', 'multiplication'],
        difficulty: 2,
        sessionLength: 'continuous',
      })
      // The session page shows a card from the chosen operations. Continuous
      // practice has no total, so it says "Question 1" without "of".
      expect(screen.getByText('Question 1')).toBeInTheDocument()
      expect(
        screen.getByRole('heading', {
          level: 2,
          name: /^What is .* (plus|times) /,
        }),
      ).toBeInTheDocument()
    })
  })
})

describe('Practice page without a configuration', () => {
  it('redirects to the setup page', () => {
    const { router } = renderRoute('/practice/session')

    expect(router.state.location.pathname).toBe('/practice/setup')
    expect(
      screen.getByRole('heading', { name: 'Set up your practice' }),
    ).toBeInTheDocument()
  })
})
