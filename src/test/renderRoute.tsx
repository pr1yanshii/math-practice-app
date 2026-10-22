import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { AppProvider } from '../app/AppProvider'
import { createRoutes } from '../app/AppRoutes'

// Renders the real app (provider and route tree) starting at `path`,
// optionally with navigation state (as the setup page passes to the session
// page). Rendering again with the same `key` acts like a browser refresh;
// a different key is a new navigation.
export function renderRoute(path: string, state?: unknown, key = 'default') {
  const router = createMemoryRouter(createRoutes(), {
    initialEntries: [{ pathname: path, state, key }],
  })
  const user = userEvent.setup()
  return {
    user,
    router,
    ...render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>,
    ),
  }
}

// For pages that load on demand (Statistics, Settings): waits until the
// page's code has loaded and it has rendered.
export async function renderRouteReady(
  path: string,
  state?: unknown,
  key?: string,
) {
  const view = renderRoute(path, state, key)
  await screen.findByRole('heading', { level: 1 })
  return view
}
