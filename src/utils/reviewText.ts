import type { ReviewUnavailableReason } from '../services/mistakeTracker'

// Why "Practice my mistakes" can't start, in words for the student.
export const REVIEW_UNAVAILABLE_TEXT: Record<ReviewUnavailableReason, string> =
  {
    'no-mistakes':
      'You don’t have any mistakes to practice yet. Questions you mark “I Got It Wrong” will show up here.',
    'all-mastered': 'You’ve mastered all your saved mistakes. Great work!',
    'no-match':
      'None of your saved mistakes match the operations and level you picked. Try different choices.',
  }

export function mistakeCountText(count: number): string {
  return `${count} ${count === 1 ? 'mistake' : 'mistakes'} to practice`
}
