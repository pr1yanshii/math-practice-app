import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute, renderRouteReady } from '../test/renderRoute'
import App from './App'

// Scope to <main>, because the header navigation repeats some link names.
const main = () => within(screen.getByRole('main'))

describe('App', () => {
  it('renders the home page with the application title', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Math Practice' }),
    ).toBeInTheDocument()
  })
})

describe('Home page', () => {
  it('shows a welcome message and the three main actions', () => {
    renderRoute('/')

    expect(main().getByText(/Hi there!/)).toBeInTheDocument()
    for (const name of ['Start Practice', 'View Statistics', 'Settings']) {
      expect(main().getByRole('link', { name })).toBeInTheDocument()
    }
  })

  it.each([
    ['Start Practice', '/practice/setup', 'Set up your practice'],
    ['View Statistics', '/statistics', 'Statistics'],
    ['Settings', '/settings', 'Settings'],
  ])('%s opens %s', async (name, path, heading) => {
    const { user, router } = renderRoute('/')

    await user.click(main().getByRole('link', { name }))

    // Statistics and Settings load on demand, so wait for the page.
    expect(
      await screen.findByRole('heading', { level: 1, name: heading }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(path)
  })

  it('can be used with the keyboard alone', async () => {
    const { user, router } = renderRoute('/')

    // Header: brand link and four navigation links come first.
    for (let i = 0; i < 6; i++) await user.tab()
    expect(main().getByRole('link', { name: 'Start Practice' })).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(router.state.location.pathname).toBe('/practice/setup')
  })
})

describe('Navigation', () => {
  it('marks the current page', async () => {
    await renderRouteReady('/statistics')
    const nav = within(screen.getByRole('navigation', { name: 'Main' }))

    expect(nav.getByRole('link', { name: 'Statistics' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(nav.getByRole('link', { name: 'Home' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('shows a friendly page for unknown routes with a way home', async () => {
    const { user, router } = renderRoute('/no-such-page')

    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument()

    await user.click(main().getByRole('link', { name: 'Return Home' }))
    expect(router.state.location.pathname).toBe('/')
  })
})

describe('lazy pages', () => {
  it('open in every new router (route objects are not shared)', async () => {
    for (let i = 0; i < 2; i++) {
      const { unmount } = await renderRouteReady('/statistics')
      expect(
        screen.getByRole('heading', { level: 1, name: 'Statistics' }),
      ).toBeInTheDocument()
      unmount()
    }
  })
})
