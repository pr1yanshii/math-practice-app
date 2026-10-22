import { useEffect, useState } from 'react'
import type { Question } from '../../types/question'
import { CardBack } from './CardBack'
import { CardFront } from './CardFront'

export interface CardResult {
  selectedAnswer: number
  // What the student pressed. Not derived from comparing the answers.
  selfReportedCorrect: boolean
}

interface QuestionCardProps {
  question: Question
  questionNumber: number
  totalQuestions: number | null
  animationsEnabled?: boolean
  showExplanation?: boolean
  // True for every card after the first in a session.
  focusOnMount?: boolean
  // Where the card was before a page refresh (Task 74).
  initialSelectedAnswer?: number | null
  initialFlipped?: boolean
  // Reports selection and flip changes so the session can be saved.
  onCardStateChange?: (selectedAnswer: number | null, flipped: boolean) => void
  onResult: (result: CardResult) => void
}

// Give each question its own `key` so a new question starts with no
// selection and the front showing.
export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  animationsEnabled = true,
  showExplanation = false,
  focusOnMount = false,
  initialSelectedAnswer = null,
  initialFlipped = false,
  onCardStateChange,
  onResult,
}: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(
    initialSelectedAnswer,
  )
  const [isCardFlipped, setIsCardFlipped] = useState(initialFlipped)

  useEffect(() => {
    onCardStateChange?.(selectedAnswer, isCardFlipped)
  }, [selectedAnswer, isCardFlipped, onCardStateChange])
  const [resultGiven, setResultGiven] = useState(false)

  // Selecting and flipping only change what is shown. Nothing is recorded
  // until the student presses I Got It Right or I Got It Wrong.
  function handleSelect(value: number) {
    if (!isCardFlipped) setSelectedAnswer(value)
  }

  // Number keys 1–4 pick an answer (spec §14), only before flipping and
  // never while typing in a form field or using a shortcut with modifiers.
  useEffect(() => {
    if (isCardFlipped) return
    function onKeyDown(event: KeyboardEvent) {
      const index = ['1', '2', '3', '4'].indexOf(event.key)
      if (index === -1 || index >= question.choices.length) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (
        target?.closest('input, textarea, select, [contenteditable="true"]') ||
        document.querySelector('dialog[open]')
      ) {
        return
      }
      event.preventDefault()
      setSelectedAnswer(question.choices[index])
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isCardFlipped, question.choices])

  function handleFlip() {
    if (selectedAnswer !== null) setIsCardFlipped(true)
  }

  function handleResult(selfReportedCorrect: boolean) {
    // resultGiven also disables both buttons, so a result is reported once.
    if (!isCardFlipped || selectedAnswer === null || resultGiven) return
    setResultGiven(true)
    onResult({ selectedAnswer, selfReportedCorrect })
  }

  const className = [
    'card',
    isCardFlipped && 'card--flipped',
    !animationsEnabled && 'card--static',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={className} aria-label="Question card">
      <div className="card__inner">
        {/* The side that isn't showing is inert: it can't be focused or
            clicked, and screen readers skip it. */}
        <div className="card__face card__face--front" inert={isCardFlipped}>
          <CardFront
            question={question}
            questionNumber={questionNumber}
            totalQuestions={totalQuestions}
            selectedAnswer={selectedAnswer}
            locked={isCardFlipped}
            focusOnMount={focusOnMount}
            onSelect={handleSelect}
            onFlip={handleFlip}
          />
        </div>
        <div className="card__face card__face--back" inert={!isCardFlipped}>
          <CardBack
            question={question}
            selectedAnswer={selectedAnswer}
            showing={isCardFlipped}
            resultGiven={resultGiven}
            showExplanation={showExplanation}
            onResult={handleResult}
          />
        </div>
      </div>
    </section>
  )
}
