import type { OperationStatistics } from '../../types/statistics'
import { StatTotals } from './StatTotals'

export interface BreakdownItem {
  key: string
  label: string
  totals: OperationStatistics
}

// One card per operation or per level.
export function StatisticsBreakdown({ items }: { items: BreakdownItem[] }) {
  return (
    <ul className="stat-cards">
      {items.map((item) => (
        <li key={item.key} className="stat-card">
          <h3>{item.label}</h3>
          <StatTotals totals={item.totals} />
        </li>
      ))}
    </ul>
  )
}
