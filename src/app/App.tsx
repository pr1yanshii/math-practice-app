import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { AppProvider } from './AppProvider'
import { createRoutes } from './AppRoutes'

const router = createBrowserRouter(createRoutes())

function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  )
}

export default App
