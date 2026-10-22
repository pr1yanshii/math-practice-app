import { NavLink } from 'react-router'

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/practice/setup', label: 'Practice', end: false },
  { to: '/statistics', label: 'Statistics', end: false },
  { to: '/settings', label: 'Settings', end: false },
]

export function Navigation() {
  return (
    <nav aria-label="Main">
      <ul className="nav-list">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink to={item.to} end={item.end} className="nav-link">
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
