import { useRef } from 'react'
import { useFocusWhen } from '../../hooks/useFocusWhen'
import type { Question } from '../../types/question'
import { spokenQuestion } from '../../utils/questionText'
import { Button } from '../common/Button'
import { AnswerChoice } from './AnswerChoice'

interface CardFrontProps {
  question: Question
  questionNumber: number
  // null for continuous practice, which has no fixed total.
  totalQuestions: number | null
  selectedAnswer: number | null
  locked: boolean
  // Focus the question when the card appears, so keyboard and screen-reader
  // users start at the new question instead of the top of the page.
  focusOnMount: boolean
  onSelect: (value: number) => void
  onFlip: () => void
}

export function CardFront({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  locked,
  focusOnMount,
  onSelect,
  onFlip,
}: CardFrontProps) {
  const hasSelection = selectedAnswer !== null
  const headingRef = useRef<HTMLHeadingElement>(null)
  useFocusWhen(headingRef, focusOnMount)

  return (
    <>
      <p className="card__progress">
        Question {questionNumber}
        {totalQuestions !== null && ` of ${totalQuestions}`}
      </p>
      <h2 ref={headingRef} className="card__question" tabIndex={-1}>
        <span aria-hidden="true">{question.displayText} = ?</span>
        <span className="visually-hidden">{spokenQuestion(question)}</span>
      </h2>
      <div className="answer-grid" role="group" aria-label="Answer choices">
        {question.choices.map((choice, index) => (
          <AnswerChoice
            key={choice}
            value={choice}
            shortcut={index + 1}
            selected={choice === selectedAnswer}
            disabled={locked}
            onSelect={onSelect}
          />
        ))}
      </div>
      <div className="card__actions">
        <Button
          className="button--large"
          disabled={!hasSelection || locked}
          aria-describedby={hasSelection ? undefined : 'flip-hint'}
          onClick={onFlip}
        >
          Flip Card
        </Button>
        {!hasSelection && (
          <p id="flip-hint" className="card__hint">
            Pick an answer first.
          </p>
        )}
      </div>
    </>
  )
}
