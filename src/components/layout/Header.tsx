import { Link } from 'react-router'
import { Navigation } from './Navigation'

export function Header() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand">
          <span className="brand__mark" aria-hidden="true">
            +−×÷
          </span>
          Math Practice
        </Link>
        <Navigation />
      </div>
    </header>
  )
}
