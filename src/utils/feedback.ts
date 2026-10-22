import { pickRandom, type RandomSource } from './math'

// Spec §13.4: encouraging, never shaming.
export const POSITIVE_FEEDBACK = [
  'Great job!',
  'Nice work!',
  'You are improving!',
  'Way to go!',
]

export const SUPPORTIVE_FEEDBACK = [
  'Keep practicing!',
  'Good try! You’ll get it next time.',
  'Mistakes help you learn.',
  'Keep going, you’re learning!',
]

// A random message that is never the same as the last one, so it stays
// fresh without being noisy.
export function pickFeedback(
  selfReportedCorrect: boolean,
  previous: string | null,
  random: RandomSource = Math.random,
): string {
  const messages = selfReportedCorrect ? POSITIVE_FEEDBACK : SUPPORTIVE_FEEDBACK
  return pickRandom(
    messages.filter((message) => message !== previous),
    random,
  )
}
