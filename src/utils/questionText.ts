import type { MathOperation, Question } from '../types/question'

// Words a screen reader should say instead of the symbols + − × ÷.
const OPERATION_WORDS: Record<MathOperation, string> = {
  addition: 'plus',
  subtraction: 'minus',
  multiplication: 'times',
  division: 'divided by',
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

export function spokenQuestion(question: Question): string {
  const { operation, firstOperand, secondOperand } = question
  return `What is ${formatNumber(firstOperand)} ${OPERATION_WORDS[operation]} ${formatNumber(secondOperand)}?`
}

export function spokenEquation(question: Question): string {
  const { operation, firstOperand, secondOperand, correctAnswer } = question
  return `${formatNumber(firstOperand)} ${OPERATION_WORDS[operation]} ${formatNumber(secondOperand)} equals ${formatNumber(correctAnswer)}`
}

// A short way to check the answer with the opposite operation (spec §6.3
// "a brief explanation when appropriate"; REQUIREMENTS.md D-18).
export function explainAnswer(question: Question): string {
  const n = formatNumber
  const { operation, firstOperand: a, secondOperand: b } = question
  const c = question.correctAnswer
  switch (operation) {
    case 'addition':
      return `Check: ${n(c)} − ${n(b)} = ${n(a)}`
    case 'subtraction':
      return `Check: ${n(c)} + ${n(b)} = ${n(a)}`
    case 'multiplication':
      return b === 0
        ? 'Any number times 0 is 0.'
        : `Check: ${n(c)} ÷ ${n(b)} = ${n(a)}`
    case 'division':
      return `Check: ${n(c)} × ${n(b)} = ${n(a)}`
  }
}
