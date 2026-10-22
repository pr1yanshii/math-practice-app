import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Question } from '../../types/question'
import { QuestionCard, type CardResult } from './QuestionCard'

const SEVEN_TIMES_EIGHT: Question = {
  id: 'q-1',
  operation: 'multiplication',
  firstOperand: 7,
  secondOperand: 8,
  displayText: '7 × 8',
  correctAnswer: 56,
  choices: [48, 54, 56, 64],
  difficulty: 2,
  source: 'regular',
}

const TEN_PLUS_FIVE: Question = {
  id: 'q-2',
  operation: 'addition',
  firstOperand: 10,
  secondOperand: 5,
  displayText: '10 + 5',
  correctAnswer: 15,
  choices: [14, 15, 16, 25],
  difficulty: 1,
  source: 'regular',
}

function renderCard(props: Partial<Parameters<typeof QuestionCard>[0]> = {}) {
  const onResult = vi.fn<(result: CardResult) => void>()
  const user = userEvent.setup()
  const question = props.question ?? SEVEN_TIMES_EIGHT
  const view = render(
    <QuestionCard
      key={question.id}
      question={question}
      questionNumber={3}
      totalQuestions={10}
      onResult={onResult}
      {...props}
    />,
  )
  return { user, onResult, ...view }
}

const front = () => document.querySelector<HTMLElement>('.card__face--front')!
const back = () => document.querySelector<HTMLElement>('.card__face--back')!
const choice = (value: string) =>
  within(front()).getByRole('button', { name: value })
const flipButton = () => screen.getByRole('button', { name: 'Flip Card' })
const rightButton = () => screen.getByRole('button', { name: 'I Got It Right' })
const wrongButton = () => screen.getByRole('button', { name: 'I Got It Wrong' })

async function selectAndFlip(
  user: ReturnType<typeof userEvent.setup>,
  value: string,
) {
  await user.click(choice(value))
  await user.click(flipButton())
}

describe('card front', () => {
  it('shows progress, the question, and four answer buttons', () => {
    renderCard()

    expect(within(front()).getByText('Question 3 of 10')).toBeInTheDocument()
    expect(within(front()).getByText('7 × 8 = ?')).toBeInTheDocument()
    const choices = within(
      within(front()).getByRole('group', { name: 'Answer choices' }),
    ).getAllByRole('button')
    expect(
      choices.map((c) => c.querySelector('.answer-choice__value')!.textContent),
    ).toEqual(['48', '54', '56', '64'])
    // The key hints are not part of each answer's accessible name.
    expect(choices.map((c) => c.getAttribute('aria-keyshortcuts'))).toEqual([
      '1',
      '2',
      '3',
      '4',
    ])
  })

  it('gives screen readers the question in words', () => {
    renderCard()
    expect(
      within(front()).getByRole('heading', {
        name: 'What is 7 times 8?',
      }),
    ).toBeInTheDocument()
  })

  it('shows just the question number for continuous practice', () => {
    renderCard({ totalQuestions: null, questionNumber: 12 })
    expect(within(front()).getByText('Question 12')).toBeInTheDocument()
    expect(within(front()).queryByText(/of/)).not.toBeInTheDocument()
  })

  it('formats large numbers with thousands separators', () => {
    renderCard({
      question: {
        ...TEN_PLUS_FIVE,
        id: 'big',
        firstOperand: 1000,
        secondOperand: 250,
        displayText: '1,000 + 250',
        correctAnswer: 1250,
        choices: [1240, 1250, 1260, 1350],
      },
    })
    expect(within(front()).getByText('1,000 + 250 = ?')).toBeInTheDocument()
    expect(choice('1,250')).toBeInTheDocument()
  })
})

describe('answer selection', () => {
  it('keeps Flip Card disabled until an answer is selected', async () => {
    const { user } = renderCard()

    expect(flipButton()).toBeDisabled()
    expect(flipButton()).toHaveAccessibleDescription('Pick an answer first.')

    await user.click(choice('54'))
    expect(flipButton()).toBeEnabled()
    expect(screen.queryByText('Pick an answer first.')).not.toBeInTheDocument()
  })

  it('highlights only the selected answer and allows changing it', async () => {
    const { user } = renderCard()

    await user.click(choice('54'))
    expect(choice('54')).toHaveAttribute('aria-pressed', 'true')
    expect(choice('56')).toHaveAttribute('aria-pressed', 'false')

    await user.click(choice('56'))
    expect(choice('56')).toHaveAttribute('aria-pressed', 'true')
    expect(choice('54')).toHaveAttribute('aria-pressed', 'false')
    expect(
      within(front()).getAllByRole('button', { pressed: true }),
    ).toHaveLength(1)
  })

  it('shows the selection with a check mark, not only colour', async () => {
    const { user } = renderCard()
    await user.click(choice('64'))
    expect(
      choice('64').querySelector('.answer-choice__check'),
    ).toHaveTextContent('✓')
    expect(
      choice('48').querySelector('.answer-choice__check'),
    ).toBeEmptyDOMElement()
  })

  it('does not record anything when an answer is selected', async () => {
    const { user, onResult } = renderCard()
    await user.click(choice('48'))
    await user.click(choice('56'))
    expect(onResult).not.toHaveBeenCalled()
  })
})

describe('flipping', () => {
  it('shows the front first, with the back inert', () => {
    renderCard()
    expect(front()).not.toHaveAttribute('inert')
    expect(back()).toHaveAttribute('inert')
  })

  it('reveals the question, correct answer and selected answer', async () => {
    const { user } = renderCard()
    await selectAndFlip(user, '54')

    expect(within(back()).getByText('7 × 8 = 56')).toBeInTheDocument()
    expect(
      within(back()).getByRole('heading', { name: '7 times 8 equals 56' }),
    ).toBeInTheDocument()
    expect(within(back()).getByText(/Your answer:/)).toHaveTextContent(
      'Your answer: 54',
    )
    expect(front()).toHaveAttribute('inert')
    expect(back()).not.toHaveAttribute('inert')
  })

  it('moves focus to the revealed answer', async () => {
    const { user } = renderCard()
    await selectAndFlip(user, '56')
    await waitFor(() =>
      expect(within(back()).getByRole('heading')).toHaveFocus(),
    )
  })

  it('does not record anything when the card is flipped', async () => {
    const { user, onResult } = renderCard()
    await selectAndFlip(user, '56')
    expect(onResult).not.toHaveBeenCalled()
  })

  it('prevents answer changes after flipping', async () => {
    const { user } = renderCard()
    await selectAndFlip(user, '54')

    for (const value of ['48', '54', '56', '64']) {
      expect(choice(value)).toBeDisabled()
    }
    expect(flipButton()).toBeDisabled()
    // Even a forced click on the hidden front changes nothing.
    choice('56').click()
    expect(within(back()).getByText(/Your answer:/)).toHaveTextContent(
      'Your answer: 54',
    )
  })

  it('marks the card flipped for the animation, or static when animations are off', async () => {
    const { user, container } = renderCard({ animationsEnabled: false })
    const card = container.querySelector('.card')!
    expect(card).toHaveClass('card--static')
    expect(card).not.toHaveClass('card--flipped')

    await selectAndFlip(user, '56')
    expect(card).toHaveClass('card--flipped')
    // Without animation the content still switches the same way.
    expect(back()).not.toHaveAttribute('inert')
    expect(front()).toHaveAttribute('inert')
  })

  it('is animated by default', () => {
    const { container } = renderCard()
    expect(container.querySelector('.card')).not.toHaveClass('card--static')
  })
})

describe('self-reported result', () => {
  it('reports "right" when the student says so, even if their choice was wrong', async () => {
    const { user, onResult } = renderCard()
    await selectAndFlip(user, '54')
    await user.click(rightButton())

    expect(onResult).toHaveBeenCalledTimes(1)
    expect(onResult).toHaveBeenCalledWith({
      selectedAnswer: 54,
      selfReportedCorrect: true,
    })
  })

  it('reports "wrong" when the student says so, even if their choice was correct', async () => {
    const { user, onResult } = renderCard()
    await selectAndFlip(user, '56')
    await user.click(wrongButton())

    expect(onResult).toHaveBeenCalledTimes(1)
    expect(onResult).toHaveBeenCalledWith({
      selectedAnswer: 56,
      selfReportedCorrect: false,
    })
  })

  it('reports only once, and disables both buttons afterwards', async () => {
    const { user, onResult } = renderCard()
    await selectAndFlip(user, '56')

    await user.dblClick(rightButton())
    await user.click(wrongButton())

    expect(onResult).toHaveBeenCalledTimes(1)
    expect(rightButton()).toBeDisabled()
    expect(wrongButton()).toBeDisabled()
  })

  it('ignores the result buttons before the card is flipped', async () => {
    const { onResult } = renderCard()
    // The back is inert before flipping; force a click anyway.
    rightButton().click()
    expect(onResult).not.toHaveBeenCalled()
  })
})

describe('next question', () => {
  it('starts unselected and unflipped when the question changes', async () => {
    const { user, rerender, onResult } = renderCard()
    await selectAndFlip(user, '56')
    await user.click(rightButton())

    rerender(
      <QuestionCard
        key={TEN_PLUS_FIVE.id}
        question={TEN_PLUS_FIVE}
        questionNumber={4}
        totalQuestions={10}
        onResult={onResult}
      />,
    )

    expect(within(front()).getByText('Question 4 of 10')).toBeInTheDocument()
    expect(within(front()).getByText('10 + 5 = ?')).toBeInTheDocument()
    expect(
      within(front()).queryAllByRole('button', { pressed: true }),
    ).toHaveLength(0)
    expect(flipButton()).toBeDisabled()
    expect(front()).not.toHaveAttribute('inert')
    expect(back()).toHaveAttribute('inert')
    expect(rightButton()).toBeEnabled()
  })
})

describe('keyboard', () => {
  it('can be answered, flipped, and marked using only the keyboard', async () => {
    const { user, onResult } = renderCard()

    await user.tab() // 48
    await user.tab() // 54
    await user.tab() // 56
    expect(choice('56')).toHaveFocus()
    await user.keyboard(' ')
    expect(choice('56')).toHaveAttribute('aria-pressed', 'true')

    await user.tab() // 64
    await user.tab() // Flip Card
    expect(flipButton()).toHaveFocus()
    await user.keyboard('{Enter}')

    await waitFor(() =>
      expect(within(back()).getByRole('heading')).toHaveFocus(),
    )
    await user.tab()
    expect(rightButton()).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(onResult).toHaveBeenCalledWith({
      selectedAnswer: 56,
      selfReportedCorrect: true,
    })
  })
})

describe('number keys', () => {
  it('1–4 select the matching answer and can change it', async () => {
    const { user } = renderCard()
    await user.keyboard('3')
    expect(choice('56')).toHaveAttribute('aria-pressed', 'true')
    await user.keyboard('1')
    expect(choice('48')).toHaveAttribute('aria-pressed', 'true')
    expect(choice('56')).toHaveAttribute('aria-pressed', 'false')
    expect(flipButton()).toBeEnabled()
  })

  it('other keys do nothing', async () => {
    const { user } = renderCard()
    await user.keyboard('5')
    await user.keyboard('0')
    expect(
      within(front()).queryAllByRole('button', { pressed: true }),
    ).toHaveLength(0)
  })

  it('do not record anything', async () => {
    const { user, onResult } = renderCard()
    await user.keyboard('2')
    expect(onResult).not.toHaveBeenCalled()
  })

  it('do nothing after the card is flipped', async () => {
    const { user } = renderCard()
    await selectAndFlip(user, '54')
    await user.keyboard('3')
    expect(within(back()).getByText(/Your answer:/)).toHaveTextContent(
      'Your answer: 54',
    )
  })

  it('do not interfere with typing in a form field or shortcuts with modifiers', async () => {
    const { user } = renderCard()
    const input = document.createElement('input')
    document.body.append(input)
    input.focus()
    await user.keyboard('2')
    expect(input).toHaveValue('2')
    input.remove()

    await user.keyboard('{Control>}3{/Control}')
    expect(
      within(front()).queryAllByRole('button', { pressed: true }),
    ).toHaveLength(0)
  })

  it('do nothing while a dialog is open', async () => {
    const { user } = renderCard()
    const dialog = document.createElement('dialog')
    dialog.setAttribute('open', '')
    document.body.append(dialog)
    await user.keyboard('1')
    expect(
      within(front()).queryAllByRole('button', { pressed: true }),
    ).toHaveLength(0)
    dialog.remove()
  })
})
