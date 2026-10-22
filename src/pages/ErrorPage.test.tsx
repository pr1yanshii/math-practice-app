import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../app/AppProvider'
import { AppLayout } from '../components/layout/AppLayout'
import { ErrorPage } from './ErrorPage'
import { HomePage } from './HomePage'

function Broken(): never {
  throw new Error('internal detail: cannot read property x of undefined')
}

describe('error page', () => {
  it('shows a friendly message and a way home, without technical details', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    // The same layout and error page as the app, plus a page that throws.
    const router = createMemoryRouter(
      [
        {
          element: <AppLayout />,
          errorElement: <ErrorPage />,
          children: [
            { path: '/', element: <HomePage /> },
            { path: '/broken', element: <Broken /> },
          ],
        },
      ],
      { initialEntries: ['/broken'] },
    )
    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>,
    )

    expect(
      screen.getByRole('heading', { name: 'Something went wrong' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Your saved progress is safe/)).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/internal detail|undefined|at /)

    await userEvent.click(screen.getByRole('link', { name: 'Return Home' }))
    expect(router.state.location.pathname).toBe('/')
    log.mockRestore()
  })
})
