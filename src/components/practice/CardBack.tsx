import { useRef } from 'react'
import { useFocusWhen } from '../../hooks/useFocusWhen'
import type { Question } from '../../types/question'
import {
  explainAnswer,
  formatNumber,
  spokenEquation,
} from '../../utils/questionText'
import { Button } from '../common/Button'

interface CardBackProps {
  question: Question
  selectedAnswer: number | null
  showing: boolean
  resultGiven: boolean
  showExplanation: boolean
  onResult: (selfReportedCorrect: boolean) => void
}

export function CardBack({
  question,
  selectedAnswer,
  showing,
  resultGiven,
  showExplanation,
  onResult,
}: CardBackProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  // The Flip Card button disappears with the front, so move focus here.
  // Screen readers then read the revealed answer.
  useFocusWhen(headingRef, showing)

  return (
    <>
      <h2 ref={headingRef} className="card__question" tabIndex={-1}>
        <span aria-hidden="true">
          {question.displayText} = {formatNumber(question.correctAnswer)}
        </span>
        <span className="visually-hidden">{spokenEquation(question)}</span>
      </h2>
      <p className="card__your-answer">
        Your answer:{' '}
        <strong>
          {selectedAnswer === null ? '—' : formatNumber(selectedAnswer)}
        </strong>
      </p>
      {showExplanation && (
        <p className="card__explanation">{explainAnswer(question)}</p>
      )}
      <p className="card__hint">Did you get it right?</p>
      <div className="card__actions card__actions--result">
        <Button disabled={resultGiven} onClick={() => onResult(true)}>
          I Got It Right
        </Button>
        <Button
          variant="secondary"
          disabled={resultGiven}
          onClick={() => onResult(false)}
        >
          I Got It Wrong
        </Button>
      </div>
    </>
  )
}
