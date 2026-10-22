import { useEffect } from 'react'
import { useRouteError } from 'react-router'
import { ButtonLink } from '../components/common/Button'
import { Header } from '../components/layout/Header'
import { PageContainer } from '../components/layout/PageContainer'

// Shown if a page fails unexpectedly (Task 78). Never shows technical
// details to the student; developers get them in the console.
export function ErrorPage() {
  const error = useRouteError()

  useEffect(() => {
    if (import.meta.env.DEV) console.error('Page error:', error)
  }, [error])

  return (
    <>
      <Header />
      <PageContainer>
        <h1>Something went wrong</h1>
        <p className="lead">
          Sorry, this page stopped working. Your saved progress is safe.
        </p>
        <ButtonLink to="/">Return Home</ButtonLink>
      </PageContainer>
    </>
  )
}
