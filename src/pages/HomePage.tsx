import { ButtonLink } from '../components/common/Button'

export function HomePage() {
  return (
    <section className="home">
      <h1>Math Practice</h1>
      <p className="lead">
        Hi there! Pick what you want to practice, answer some math cards, and
        watch yourself get better every day.
      </p>
      <div className="home__actions">
        <ButtonLink to="/practice/setup" className="button--large">
          Start Practice
        </ButtonLink>
        <ButtonLink to="/statistics" variant="secondary">
          View Statistics
        </ButtonLink>
        <ButtonLink to="/settings" variant="secondary">
          Settings
        </ButtonLink>
      </div>
    </section>
  )
}
