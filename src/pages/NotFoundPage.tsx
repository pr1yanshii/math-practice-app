import { ButtonLink } from '../components/common/Button'

export function NotFoundPage() {
  return (
    <section>
      <h1>Page not found</h1>
      <p className="lead">We couldn’t find that page.</p>
      <ButtonLink to="/">Return Home</ButtonLink>
    </section>
  )
}
