import { describe, expect, it, vi } from 'vitest'
import type {
  DifficultyLevel,
  MathOperation,
  Question,
} from '../types/question'
import { validateQuestion } from '../utils/validation'
import {
  MAX_GENERATION_ATTEMPTS,
  QuestionGenerationError,
  generateQuestion,
  generateAdditionOperands,
  generateNextQuestion,
  generateQuestionForOperations,
  isSameQuestion,
} from './questionGenerator'
import { DIFFICULTY_RULES } from './difficultyRules'

const LEVELS: DifficultyLevel[] = [1, 2, 3, 4]
const SAMPLES = 500
const LOWEST = () => 0
const HIGHEST = () => 0.999999

function sample(operation: MathOperation, level: DifficultyLevel) {
  return Array.from({ length: SAMPLES }, () =>
    generateQuestion(operation, level),
  )
}

const between = (value: number, min: number, max: number) =>
  value >= min && value <= max

// Returns numbers in order, repeating the last one when it runs out.
function sequence(...values: number[]) {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

// Limits written out from specification §7 (and REQUIREMENTS D-3/D-4 where
// the specification leaves a limit open), independent of difficultyRules.ts.
const ADDITION = {
  1: { min: 0, max: 10, maxSum: 20 },
  2: { min: 0, max: 50, maxSum: 100 },
  3: { min: 0, max: 100, maxSum: 200 },
  4: { min: 100, max: 1000, maxSum: 2000 },
} as const

const SUBTRACTION = {
  1: { min: 0, max: 10 },
  2: { min: 0, max: 50 },
  3: { min: 0, max: 100 },
  4: { min: 100, max: 1000 },
} as const

const DIVISION = {
  1: { divisor: [1, 5], quotient: [0, 5], maxDividend: 25 },
  2: { divisor: [1, 10], quotient: [0, 10], maxDividend: 100 },
  3: { divisor: [1, 12], quotient: [0, 12], maxDividend: 144 },
  4: { divisor: [2, 20], quotient: [10, 50], maxDividend: 1000 },
} as const

describe('every generated question', () => {
  it.each(
    LEVELS.flatMap((level) =>
      (['addition', 'subtraction', 'multiplication', 'division'] as const).map(
        (operation) => [operation, level] as const,
      ),
    ),
  )('%s at level %s is valid and well-formed', (operation, level) => {
    for (const question of sample(operation, level)) {
      expect(validateQuestion(question)).toEqual([])
      expect(question).toMatchObject<Partial<Question>>({
        operation,
        difficulty: level,
        source: 'regular',
      })
      // Exactly four unique, non-negative whole-number choices, with the
      // correct answer exactly once.
      expect(question.choices).toHaveLength(4)
      expect(new Set(question.choices).size).toBe(4)
      expect(
        question.choices.filter((c) => c === question.correctAnswer),
      ).toHaveLength(1)
      for (const choice of question.choices) {
        expect(Number.isInteger(choice)).toBe(true)
        expect(choice).toBeGreaterThanOrEqual(0)
      }
      expect(question.id).not.toBe('')
      expect(question.mistakePatternId).toBeUndefined()
    }
  })

  it('gets a fresh id each time', () => {
    const ids = sample('addition', 1).map((question) => question.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('addition', () => {
  it.each(LEVELS)(
    'level %s stays within its operand and sum limits',
    (level) => {
      const { min, max, maxSum } = ADDITION[level]
      for (const q of sample('addition', level)) {
        expect(between(q.firstOperand, min, max)).toBe(true)
        expect(between(q.secondOperand, min, max)).toBe(true)
        expect(q.correctAnswer).toBe(q.firstOperand + q.secondOperand)
        expect(q.correctAnswer).toBeLessThanOrEqual(maxSum)
      }
    },
  )

  it.each([
    [1, '0 + 0', '10 + 10', 20],
    [2, '0 + 0', '50 + 50', 100],
    [3, '0 + 0', '100 + 100', 200],
    [4, '100 + 100', '1,000 + 1,000', 2000],
  ] as const)(
    'level %s: lowest is %s, highest is %s = %s',
    (level, lowestText, highestText, highestSum) => {
      const lowest = generateQuestion('addition', level, LOWEST)
      const highest = generateQuestion('addition', level, HIGHEST)
      expect(lowest.displayText).toBe(lowestText)
      expect(highest.displayText).toBe(highestText)
      expect(highest.correctAnswer).toBe(highestSum)
    },
  )

  it('reaches exactly 20 at level 1 and 100 at level 2 at the highest', () => {
    expect(generateQuestion('addition', 1, HIGHEST).correctAnswer).toBe(20)
    expect(generateQuestion('addition', 2, HIGHEST).correctAnswer).toBe(100)
  })

  it('caps the second operand when a sum limit is tighter than the operands', () => {
    // With the specification's numbers the operand limits already keep sums
    // within maxResult, so test the cap with a tighter limit directly.
    const rules = {
      ...DIFFICULTY_RULES[1],
      addition: { operand: { min: 0, max: 10 }, maxResult: 12 },
    }
    for (let i = 0; i < 500; i++) {
      const [a, b] = generateAdditionOperands(rules, Math.random)
      expect(a + b).toBeLessThanOrEqual(12)
    }
    expect(generateAdditionOperands(rules, HIGHEST)).toEqual([10, 2])
  })

  it('can include carrying at level 3', () => {
    const carries = sample('addition', 3).some(
      (q) => (q.firstOperand % 10) + (q.secondOperand % 10) >= 10,
    )
    expect(carries).toBe(true)
  })
})

describe('subtraction', () => {
  it.each(LEVELS)('level %s never gives a negative answer', (level) => {
    const { min, max } = SUBTRACTION[level]
    for (const q of sample('subtraction', level)) {
      expect(q.firstOperand).toBeGreaterThanOrEqual(q.secondOperand)
      expect(q.correctAnswer).toBeGreaterThanOrEqual(0)
      expect(between(q.firstOperand, min, max)).toBe(true)
      expect(between(q.secondOperand, min, max)).toBe(true)
      expect(q.correctAnswer).toBe(q.firstOperand - q.secondOperand)
    }
  })

  it('puts the larger number first even when it is drawn second', () => {
    const q = generateQuestion('subtraction', 1, sequence(0, 0.999999))
    expect(q.displayText).toBe('10 − 0')
    expect(q.correctAnswer).toBe(10)
  })

  it.each([
    [1, '0 − 0', '10 − 10'],
    [4, '100 − 100', '1,000 − 1,000'],
  ] as const)('level %s handles equal operands (answer 0)', (level, lo, hi) => {
    expect(generateQuestion('subtraction', level, LOWEST).displayText).toBe(lo)
    expect(generateQuestion('subtraction', level, HIGHEST).displayText).toBe(hi)
  })

  it('can include borrowing at level 3', () => {
    const borrows = sample('subtraction', 3).some(
      (q) => q.firstOperand % 10 < q.secondOperand % 10,
    )
    expect(borrows).toBe(true)
  })
})

describe('multiplication', () => {
  it.each([
    [1, 5],
    [2, 10],
  ] as const)('level %s uses factors from 0 to %s', (level, maxFactor) => {
    for (const q of sample('multiplication', level)) {
      expect(between(q.firstOperand, 0, maxFactor)).toBe(true)
      expect(between(q.secondOperand, 0, maxFactor)).toBe(true)
      expect(q.correctAnswer).toBe(q.firstOperand * q.secondOperand)
    }
  })

  it('level 3 is one-digit × one-digit or one-digit × two-digit', () => {
    const questions = sample('multiplication', 3)
    for (const q of questions) {
      const [small, large] = [q.firstOperand, q.secondOperand].sort(
        (a, b) => a - b,
      )
      expect(between(small, 0, 9)).toBe(true)
      expect(between(large, 0, 99)).toBe(true)
    }
    const hasTwoDigit = (q: Question) =>
      q.firstOperand >= 10 || q.secondOperand >= 10
    expect(questions.some(hasTwoDigit)).toBe(true)
    expect(questions.some((q) => !hasTwoDigit(q))).toBe(true)
  })

  it('level 4 is two-digit × one-digit (2–9) or two-digit × two-digit', () => {
    const questions = sample('multiplication', 4)
    for (const q of questions) {
      const [small, large] = [q.firstOperand, q.secondOperand].sort(
        (a, b) => a - b,
      )
      expect(between(large, 10, 99)).toBe(true)
      expect(between(small, 2, 99)).toBe(true)
    }
    expect(
      questions.some((q) => Math.min(q.firstOperand, q.secondOperand) < 10),
    ).toBe(true)
    expect(
      questions.some((q) => Math.min(q.firstOperand, q.secondOperand) >= 10),
    ).toBe(true)
  })

  it('puts the larger factor first or second', () => {
    const firstIsLarger = sample('multiplication', 4).map(
      (q) => q.firstOperand > q.secondOperand,
    )
    expect(firstIsLarger).toContain(true)
    expect(firstIsLarger).toContain(false)
  })

  it.each([
    [1, 0, 25],
    [2, 0, 100],
    [3, 0, 891],
    [4, 20, 9801],
  ] as const)('level %s: lowest product %s, highest %s', (level, lo, hi) => {
    expect(
      generateQuestion('multiplication', level, LOWEST).correctAnswer,
    ).toBe(lo)
    expect(
      generateQuestion('multiplication', level, HIGHEST).correctAnswer,
    ).toBe(hi)
  })

  it('includes zero as a factor at level 1', () => {
    const q = generateQuestion('multiplication', 1, LOWEST)
    expect(q.displayText).toBe('0 × 0')
    expect(q.correctAnswer).toBe(0)
  })
})

describe('division', () => {
  it.each(LEVELS)(
    'level %s: nonzero divisor, whole quotient, dividend = divisor × quotient',
    (level) => {
      const { divisor, quotient, maxDividend } = DIVISION[level]
      for (const q of sample('division', level)) {
        expect(q.secondOperand).not.toBe(0)
        expect(Number.isInteger(q.correctAnswer)).toBe(true)
        expect(q.firstOperand).toBe(q.secondOperand * q.correctAnswer)
        expect(q.firstOperand % q.secondOperand).toBe(0)
        expect(between(q.secondOperand, divisor[0], divisor[1])).toBe(true)
        expect(between(q.correctAnswer, quotient[0], quotient[1])).toBe(true)
        expect(q.firstOperand).toBeLessThanOrEqual(maxDividend)
      }
    },
  )

  it.each([
    [1, '0 ÷ 1', 0, '25 ÷ 5', 5],
    [2, '0 ÷ 1', 0, '100 ÷ 10', 10],
    [3, '0 ÷ 1', 0, '144 ÷ 12', 12],
    [4, '20 ÷ 2', 10, '1,000 ÷ 20', 50],
  ] as const)(
    'level %s: lowest %s = %s, highest %s = %s',
    (level, loText, loAnswer, hiText, hiAnswer) => {
      const lowest = generateQuestion('division', level, LOWEST)
      const highest = generateQuestion('division', level, HIGHEST)
      expect([lowest.displayText, lowest.correctAnswer]).toEqual([
        loText,
        loAnswer,
      ])
      expect([highest.displayText, highest.correctAnswer]).toEqual([
        hiText,
        hiAnswer,
      ])
    },
  )

  it('never divides by zero, even when the random source is at its lowest', () => {
    for (const level of LEVELS) {
      expect(
        generateQuestion('division', level, LOWEST).secondOperand,
      ).toBeGreaterThan(0)
    }
  })
})

describe('generateQuestionForOperations', () => {
  it('only uses the selected operations', () => {
    for (let i = 0; i < 300; i++) {
      const q = generateQuestionForOperations(['subtraction', 'division'], 2)
      expect(['subtraction', 'division']).toContain(q.operation)
    }
  })

  it('uses every selected operation over many questions', () => {
    const seen = new Set(
      Array.from(
        { length: 400 },
        () =>
          generateQuestionForOperations(
            ['addition', 'subtraction', 'multiplication', 'division'],
            3,
          ).operation,
      ),
    )
    expect(seen.size).toBe(4)
  })

  it('works with a single operation', () => {
    expect(generateQuestionForOperations(['division'], 1).operation).toBe(
      'division',
    )
  })

  it('rejects an empty selection', () => {
    expect(() => generateQuestionForOperations([], 1)).toThrow(
      QuestionGenerationError,
    )
  })
})

describe('failure handling', () => {
  it.each([
    ['exponent', 1],
    ['toString', 1],
    ['addition', 5],
    ['addition', 0],
  ])('rejects unsupported input %s at level %s', (operation, level) => {
    expect(() =>
      generateQuestion(operation as MathOperation, level as DifficultyLevel),
    ).toThrow(QuestionGenerationError)
  })

  it('retries when a generated question is invalid', () => {
    // A source returning 1 breaks its contract and pushes values past the
    // range, so the first attempt fails validation; the retry uses 0.
    let calls = 0
    const brokenOnce = () => (calls++ < 2 ? 1 : 0)
    const q = generateQuestion('addition', 1, brokenOnce)
    expect(validateQuestion(q)).toEqual([])
    expect(q.displayText).toBe('0 + 0')
  })

  it(`uses a valid fallback question after ${MAX_GENERATION_ATTEMPTS} invalid attempts, and logs why`, () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    for (const level of LEVELS) {
      for (const operation of [
        'addition',
        'subtraction',
        'multiplication',
        'division',
      ] as const) {
        const question = generateQuestion(operation, level, () => 1)
        expect(validateQuestion(question)).toEqual([])
        expect(question).toMatchObject({ operation, difficulty: level })
      }
    }
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(
        /No valid addition question at level 1 after 20 attempts: .*Using a fallback/,
      ),
    )
    log.mockRestore()
  })
})

describe('generateNextQuestion', () => {
  it.each([
    ['addition', 1],
    ['subtraction', 1],
    ['multiplication', 1],
    ['division', 1],
  ] as const)(
    'never repeats the previous %s question at level %s',
    (operation, level) => {
      // Level 1 has the fewest possible questions, so repeats are most
      // likely there.
      let previous = generateNextQuestion([operation], level, null)
      for (let i = 0; i < 2000; i++) {
        const next = generateNextQuestion([operation], level, previous)
        expect(isSameQuestion(next, previous)).toBe(false)
        previous = next
      }
    },
  )

  it('treats the same numbers in a different order as a different question', () => {
    const base = generateQuestion('multiplication', 1, LOWEST)
    expect(
      isSameQuestion(base, {
        ...base,
        firstOperand: base.secondOperand,
        secondOperand: base.firstOperand + 1,
      }),
    ).toBe(false)
    const sameNumbersNewId: Question = { ...base, id: 'other' }
    expect(isSameQuestion(base, sameNumbersNewId)).toBe(true)
  })

  it('stops trying when a repeat cannot be avoided', () => {
    // A constant random source always builds the same question.
    const previous = generateQuestion('addition', 1, LOWEST)
    const next = generateNextQuestion(['addition'], 1, previous, LOWEST)
    expect(isSameQuestion(next, previous)).toBe(true)
  })

  it('only uses the selected operations', () => {
    let previous: Question | null = null
    for (let i = 0; i < 200; i++) {
      previous = generateNextQuestion(['division'], 3, previous)
      expect(previous.operation).toBe('division')
    }
  })
})
