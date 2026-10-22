import type { RouteObject } from 'react-router'
import { AppLayout } from '../components/layout/AppLayout'
import { ErrorPage } from '../pages/ErrorPage'
import { HomePage } from '../pages/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { PracticePage } from '../pages/PracticePage'
import { PracticeSetupPage } from '../pages/PracticeSetupPage'
import { SessionSummaryPage } from '../pages/SessionSummaryPage'

// Routes from specification §16. A function, so every router gets its own
// route objects: React Router keeps state on lazy routes, and a second
// router built from the same objects failed to match them (found in tests).
export const createRoutes = (): RouteObject[] => [
  {
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    // Shown for a moment if the app opens directly on a lazy page.
    hydrateFallbackElement: <p className="page-loading">Loading…</p>,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/practice/setup', element: <PracticeSetupPage /> },
      { path: '/practice/session', element: <PracticePage /> },
      { path: '/practice/summary', element: <SessionSummaryPage /> },
      // Loaded only when opened, so the first page loads faster (Task 85).
      {
        path: '/statistics',
        lazy: {
          Component: async () =>
            (await import('../pages/StatisticsPage')).StatisticsPage,
        },
      },
      {
        path: '/settings',
        lazy: {
          Component: async () =>
            (await import('../pages/SettingsPage')).SettingsPage,
        },
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
