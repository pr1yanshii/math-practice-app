# Math Practice App — Requirements Traceability

This file maps the instructor's requirements to the implementation plan and to a check that shows each one is met. It is split into three parts, and they must stay separate:

- **Part A: Instructor requirements.** Taken from the provided documents. Nothing here is invented.
- **Part B: Implementation decisions.** Our own choices where the documents are ambiguous or silent. These are not instructor requirements.
- **Part C: Open questions.** Items to confirm with the instructor.

## Sources

| Ref | Document | Notes |
|---|---|---|
| **S** | `specification.md`: "Math Practice App — Software Specification", §1–§27 | `S§6.3` means specification section 6.3 |
| **T** | `todo.md`: "Math Practice App — Implementation Todo List", Phases 1–22, Tasks 1–89 | `T12` means Task 12; `P4` means Phase 4 |
| — | Assignment brief | **Not found in the project folder.** Submission deliverables are unknown (see Part C). |

Legend for the **Check** column: **U** = unit test, **C** = component test, **I** = integration test, **M** = manual check.

---

## Part A — Instructor Requirements

### A1. Critical rule: scoring is self-reported

These rows come straight from the specification and carry the most weight. An attempt is recorded **only** when the student presses **I Got It Right** or **I Got It Wrong**.

| ID | Requirement | Source | Plan | Check |
|---|---|---|---|---|
| SR-1 | Selecting an answer must **not** count it as correct or incorrect. | S§6.3 "Selecting an Answer" | T22, T28 | **C**: select a choice; attempts, stats, and storage are unchanged. |
| SR-2 | Flipping the card must **not** record an attempt. | S§6.3, S§18 | T24, T28 | **C**: select + flip; attempts, stats, and storage are unchanged. |
| SR-3 | The result recorded is the button the student presses, not whether `selectedAnswer === correctAnswer`. | S§6.3 "Self-Reported Result", S§10.1 `selfReportedCorrect`, S§27 | T28, T39 | **U/C**: pick the wrong choice then press *I Got It Right*; recorded as correct. Pick the right choice then press *I Got It Wrong*; recorded as incorrect and a mistake pattern is created. |
| SR-4 | Pressing either button: (1) records the result, (2) updates session stats, (3) saves to localStorage, (4) advances, (5) is never counted twice. | S§6.3 steps 1–5 | T28, T29, T39 | **C**: after one press, attempted +1, the matching total +1, and the storage key is updated. A double-click or Enter+click still adds only +1. |
| SR-5 | Preconditions before recording: an answer is selected, the card is flipped, a right/wrong choice is made, and the attempt is not already recorded. | S§18 | T23, T28 | **U**: the record function rejects calls when any precondition fails. |
| SR-6 | Only one of the two result buttons can apply to an attempt. | S§6.3 | T23 | **C**: after one press, both buttons are disabled until the next card. |
| SR-7 | Each attempt is counted exactly once. | S§26 #9 | T28 | **I**: a 5-question session gives exactly 5 attempts in storage and in stats. |

### A2. Acceptance criteria (S§26)

The release is complete when all 18 rows pass.

| ID | Criterion | Plan | Check |
|---|---|---|---|
| AC-1 | User can select one or more operations. | T7, T10 | C |
| AC-2 | User can select a difficulty level. | T8, T10 | C |
| AC-3 | User can start a fixed-length or continuous session. | T9, T10, T31 | C/I |
| AC-4 | Each question appears on a multiple-choice card. | T20, T21 | C |
| AC-5 | Each question has four unique answer choices. | T17–T19 | U: generate many questions per operation × level |
| AC-6 | User can select an answer and flip the card. | T22, T24 | C |
| AC-7 | The back of the card shows the correct answer. | T23 | C |
| AC-8 | User can mark the attempt correct or incorrect. | T23, T28 | C (see SR-3) |
| AC-9 | Each attempt is counted exactly once. | T28 | I (see SR-7) |
| AC-10 | Incorrect questions create or update mistake patterns. | T51, T52 | U/I |
| AC-11 | Similar questions can be generated from mistake patterns. | T54–T57, T60 | U/I |
| AC-12 | Statistics persist after the browser is closed and reopened. | T35–T39 | I (reload), M (close browser) |
| AC-13 | Statistics page shows attempted, correct, and incorrect totals. | T43 | C |
| AC-14 | Statistics viewable by operation and by difficulty. | T44, T45 | C |
| AC-15 | User can reset statistics after confirming. | T47 | C: Cancel keeps data; Confirm clears it |
| AC-16 | Works without an account or backend server. | P9, T86 | M: no network requests except static assets |
| AC-17 | Main features work with keyboard navigation. | T66, T82 | M: full session by keyboard only |
| AC-18 | Works on desktop, tablet, and mobile screens. | P17, T87 | M: test at 375 px, 768 px, and 1280 px widths |

### A3. Platform and technology

| ID | Requirement | Source | Plan | Check |
|---|---|---|---|---|
| TS-1 | React; JavaScript or TypeScript (TypeScript recommended). Vite + `react-ts` template. | S§4.1, T1 | T1 | M: `npm run dev` runs |
| TS-2 | State through React Context and hooks (`useState`/`useReducer`/`useContext`); no third-party state library needed. | S§4.2 | T26 | M: code review |
| TS-3 | localStorage stores settings, history, mistake patterns, statistics, and current difficulty. No backend. | S§4.3 | P9 | U |
| TS-4 | ESLint, Prettier, Vitest, and React Testing Library configured; lint and format scripts exist. | S§4.4, T2 | T2 | M: `npm run lint`, `npm test` |
| TS-5 | Shared TypeScript types for MathOperation, DifficultyLevel, Question, PracticeAttempt, PracticeSession, MistakePattern, statistics, and settings. | S§8.1, S§10, T3 | T3 | M: `tsc --noEmit` passes |
| TS-6 | React Router routes `/`, `/practice/setup`, `/practice/session`, `/practice/summary`, `/statistics`, `/settings`, plus a fallback for unknown routes. | S§16, T6 | T6 | C |

### A4. Pages and navigation

| ID | Requirement | Source | Plan | Check |
|---|---|---|---|---|
| PG-1 | Home: title, child-friendly welcome, and Start Practice / View Statistics / Settings buttons that navigate correctly. | S§6.1 | T5, T6 | C |
| PG-2 | Setup: multi-select operations (with "mixed/all"), difficulty levels 1–4 (Beginner, Easy, Intermediate, Advanced) with descriptions, session length 5/10/20/continuous, review mode regular or mistakes. | S§6.2, T7–T10, T58 | P3, T58 | C |
| PG-3 | **Start Session** stays disabled until at least one operation **and** one difficulty are selected; a validation message is shown. | S§6.2, T10 | T10 | C |
| PG-4 | Mistake-review option is disabled when there are no active mistakes, the reason is explained, and the active-pattern count is shown. | T58 | T58 | C |
| PG-5 | Leaving an active session asks for confirmation; there is no warning after the session completes. | S§16, T75 | T75 | C/M |
| PG-6 | Unexpected visit to the practice page with no valid session redirects to setup. | S§17, T27 | T27 | C |

### A5. Question card and session flow

| ID | Requirement | Source | Plan | Check |
|---|---|---|---|---|
| QC-1 | Front: question, four choices, "Question X of Y", optional progress bar. | S§6.3 | T21, T30 | C |
| QC-2 | Selected choice is highlighted, can be changed before flipping, and the Flip button is enabled only after a selection. | S§6.3, T22 | T22 | C |
| QC-3 | After flipping, the answer can't be changed. | T20, T24 | T24 | C |
| QC-4 | Back: original question, correct answer, selected answer, explanation when appropriate, Right/Wrong buttons. | S§6.3 | T23 | C |
| QC-5 | Flip animates, keeps front and back aligned, never shows mirrored text, and works with animation off. | S§13.3, T25 | T24, T25 | M + C (animation off) |
| QC-6 | After a result is recorded, the next card shows automatically; selection and flip state reset; the same question doesn't repeat immediately. | S§6.3, T29 | T29 | C/U |
| QC-7 | Continuous mode: no fixed endpoint, **End Session** button, then a summary. | S§6.5, T31 | T31 | I |
| QC-8 | Fixed-length session ends at N attempts, saves `completedAt`, and goes to the summary. | T32 | T32 | I |
| QC-9 | Summary: attempted, correct, incorrect, accuracy, operations, difficulty, mistake-review count. Actions: Practice Again, Practice Mistakes, Change Settings, View Statistics, Return Home. | S§6.5 | T33, T34 | C |
| QC-10 | Active session survives a page refresh. | S§21.4, T74 | T74 | I |

### A6. Question generation and difficulty rules

| ID | Requirement | Source | Plan | Check |
|---|---|---|---|---|
| QG-1 | **L1:** add 0–10 with result ≤ 20; subtract 0–10 with no negatives; multiply factors 0–5; divide by divisors 1–5 with whole answers. | S§7.1 | T12–T15 | U: boundary tests |
| QG-2 | **L2:** add 0–50 with result ≤ 100; subtract 0–50 with no negatives; multiply factors 0–10; divide by divisors 1–10 with whole answers. | S§7.2 | T12–T15 | U |
| QG-3 | **L3:** add 0–100 (carrying allowed); subtract 0–100 (borrowing allowed, no negatives); multiply 1-digit × 1-digit and 1-digit × 2-digit; divide by divisors 1–12, dividend ≤ 144, whole answers. | S§7.3 | T12–T15 | U |
| QG-4 | **L4:** add up to 1,000 multi-digit; subtract up to 1,000 multi-digit; multiply 2-digit × 1-digit and 2-digit × 2-digit; divide with larger dividends, 1- or 2-digit divisors, whole answers. | S§7.4 | T12–T15 | U (see D-4 for exact ranges) |
| QG-5 | Division is built as divisor × quotient = dividend; never divides by zero. | S§9 | T15 | U |
| QG-6 | Subtraction never gives a negative answer in the initial version (first operand ≥ second). | S§7, S§27, T13 | T13 | U |
| QG-7 | Choices: exactly four, unique, one correct, three plausible distractors; no negatives where not allowed; integers only; distractor generation has a retry limit. | S§8.2, T17 | T17, T18 | U |
| QG-8 | Choices are shuffled and the correct answer doesn't sit in a predictable position. | S§8.2, T19 | T19 | U: position spread over many runs |
| QG-9 | Before display, validate: supported operation, valid answer, no ÷0, whole quotient, 4 unique choices that include the correct one, matches the level. Retry with a limit, then use a fallback question. | S§18, T16, T77 | T16, T77 | U |
| QG-10 | A random operation is chosen per question when several are enabled. | T16 | T16 | U |

### A7. Mistake tracking, similar questions, mastery

| ID | Requirement | Source | Plan | Check |
|---|---|---|---|---|
| MK-1 | An incorrect self-report creates a pattern storing operation, operands, correct answer, level, timestamp, incorrect count, and similar-correct count. | S§6.4, S§10.3, T51 | T51 | U |
| MK-2 | Repeating the same mistake updates the existing pattern (count +1, timestamp) and never creates a duplicate. | T52 | T52 | U |
| MK-3 | Similar-question strategies: nearby numbers, reversed operands (addition and multiplication only), inverse operations / fact families, same level and range. | S§6.4, T54–T56 | T54–T56 | U per operation |
| MK-4 | Similar questions are labelled `source: "mistake-review"` with `mistakePatternId` and don't repeat the exact question too often. | S§8.1, T57 | T57 | U |
| MK-5 | Review priority goes up for frequent, recent, and not-yet-reviewed mistakes, and down after successful reviews; ties are randomized. | S§6.4, T59 | T59 | U |
| MK-6 | Review sessions mix several patterns and record which pattern produced each question. | T60 | T60 | I |
| MK-7 | A correct review answer increments `similarCorrectCount`; an incorrect one updates the pattern. | T61 | T61 | U |
| MK-8 | Mastered at **3** correct similar answers; threshold set by a **code constant**; mastered patterns leave normal review and come back after a new mistake. | S§6.4, T62 | T62 | U |
| MK-9 | Patterns are saved, loaded, validated, and invalid records are recovered from. | T53 | T53 | U |

### A8. Statistics

| ID | Requirement | Source | Plan | Check |
|---|---|---|---|---|
| ST-1 | Overall attempted, correct, incorrect, and accuracy = correct ÷ attempted × 100; with zero attempts show 0% or an empty state. | S§6.6, T40, T43 | T40, T43 | U + C |
| ST-2 | Per-operation and per-level attempted, correct, incorrect, accuracy. | S§6.6, T41, T42, T44, T45 | T41–T45 | U + C |
| ST-3 | Mistake stats: active, mastered, most-missed operation, most-missed facts, similar questions practiced, review correct count. | S§6.6, T63, T64 | T63, T64 | U + C |
| ST-4 | Mistake details: active list, incorrect counts, mastery progress, last incorrect date; mastered patterns shown separately. | T65 | T65 | C |
| ST-5 | Recent sessions, newest first, with date, operations, level, totals, accuracy; empty state. | S§6.6, T46 | T46 | C |
| ST-6 | **Reset Statistics** with the exact confirmation text *"Are you sure you want to erase all practice history and statistics?"*; nothing is deleted without confirmation. | S§6.6, T47 | T47 | C |

### A9. Settings

| ID | Requirement | Source | Plan | Check |
|---|---|---|---|---|
| SE-1 | Sound effects, card animation, show explanations, default session length, default level, default operations (plus mastery threshold, listed in S§6.7). Saved to localStorage. | S§6.7, T48 | T48 | C + U |
| SE-2 | Defaults pre-fill setup and can be overridden per session. | T49 | T49 | C |
| SE-3 | **Clear All Application Data** with a strong warning; clears settings, sessions, attempts, and patterns; restores defaults; returns home. | S§6.7, T50 | T50 | C |
| SE-4 | Option to turn off feedback effects. | T73 | T73 | C |

### A10. Storage and error handling

| ID | Requirement | Source | Plan | Check |
|---|---|---|---|---|
| DS-1 | Keys `mathPractice.settings/.sessions/.attempts/.mistakePatterns/.statistics/.version`. | S§11 | T35 | U |
| DS-2 | Schema version is stored; missing or old versions are detected; there is a migration structure; unrelated data is not deleted. | S§11, T36 | T36 | U |
| DS-3 | Storage unavailable or full: the session continues, a friendly warning appears, and the app does not crash. | S§11, T35 | T35, T78 | U (mock `setItem` throwing) |
| DS-4 | Invalid or corrupted data resets **only the affected category**. | S§17, T76 | T76 | U |
| DS-5 | Friendly error messages, a safe route home, and no stack traces shown. | T78 | T78 | C |
| DS-6 | Handles several thousand attempts; records stay compact; old records may be summarized while aggregates are kept. | S§23, T84 | T84 | U/M |

### A11. UI, accessibility, responsive design

| ID | Requirement | Source | Plan | Check |
|---|---|---|---|---|
| UX-1 | Bright, readable, child-appropriate, no distractions; large buttons with text labels and hover/focus/pressed states; card centred with large math text. | S§13 | P2, P6, P17 | M |
| UX-2 | Encouraging feedback that never shames. | S§13.4, T73 | T73 | M |
| A11Y-1 | Keyboard: Tab reaches everything; Enter/Space activate; keys **1–4** select choices without interfering with inputs; focus is visible. | S§14, T66 | T66 | C + M |
| A11Y-2 | Semantic HTML, labelled controls, screen-reader-friendly question text, question changes and the revealed answer announced (`aria-expanded` or a live region), progress announced. | S§14, T67 | T67 | C + M (screen reader) |
| A11Y-3 | `prefers-reduced-motion` and the in-app animation setting are respected, and content still changes clearly. | S§14, T68 | T68 | C + M |
| A11Y-4 | Contrast is sufficient; colour is never the only signal; works at 200% zoom and with large fonts. | S§14, T69 | T69 | M + automated checker (T82) |
| RD-1 | Desktop, laptop, tablet (primary), mobile; choices in one column, simple nav, and stacked stat cards on small screens; no horizontal scroll. | S§15, T70–T72 | P17 | M |

### A12. Privacy, performance, release

| ID | Requirement | Source | Plan | Check |
|---|---|---|---|---|
| PR-1 | No personal info; no external data sending; no tracking analytics; no ads or external links in the child-facing UI; a note says clearing browser data erases progress. | S§22, T86 | T86 | M |
| PF-1 | Fast load, smooth animation, minimal re-renders, statistics memoized, generation outside render, statistics and settings pages lazy-loaded. | S§23, T83, T85 | P21 | M |
| RL-1 | All tests pass; no lint or TypeScript errors; production build tested locally; SPA routing configured. | T88 | T88 | M: `npm test && npm run lint && npm run build && npm run preview` |
| RL-2 | Deployed; every route, persistence, and responsiveness verified; clean console. | T89 | T89 | M |
| RL-3 | Tested in Chrome, Safari, Firefox, and Edge, plus tablet and mobile. | T87 | T87 | M |

### A13. Required tests (S§21 and T79–T82)

| Area | Required by | Covered in |
|---|---|---|
| Unit: each generator, level boundaries, distractors, uniqueness, shuffle, similar questions, stats, accuracy, mastery, storage serialization | S§21.1, T79 | Tests next to `services/` and `utils/` |
| Component: operation/level selection, answer selection, flip, right/wrong buttons, front/back, progress, completion, stats display, confirm dialogs | S§21.2, T80 | Tests next to `components/` and `pages/` |
| Integration: start → select → flip → mark wrong → stats update → pattern stored → review mode → similar question; plus mixed, continuous, mastery, refresh, reset | S§21.3, T81 | `src/test/integration/` |
| Edge cases: no data, corrupted data, zero attempts, all correct, all wrong, continuous, refresh mid-session, duplicate distractors, ÷0, very small widths | S§21.4 | Spread across the above |

---

## Part B — Implementation Decisions (ours, not the instructor's)

Each row is a choice we made where the documents are ambiguous or say nothing. Any of them can be changed if the instructor says otherwise.

| ID | Ambiguity | Where | Decision |
|---|---|---|---|
| D-1 | S§6.2 lists "Mixed operations" as a fifth option alongside multi-select; T7 calls it "a shortcut for selecting all operations." | S§6.2, T7 | "Mixed" is an **All operations** toggle that selects all four. It is not a separate mode. |
| D-2 | S§6.2 disables Start until an operation **and** a level are chosen; T10 mentions only operations. | S§6.2, T10 | Follow the stricter specification and check both. The level is pre-filled from settings, so in practice it's always set. |
| D-3 | Ranges the specification doesn't give: quotient ranges at L1–L3; whether L4 operands exclude small numbers. | S§7 | Division quotients mirror that level's factor range (L1 0–5, L2 0–10, L3 0–12), which keeps fact families consistent with multiplication. L1/L2 "result ≤ N" limits are kept as explicit checks even though the operand ranges already guarantee them. |
| D-4 | L3/L4 multiplication and L4 add/subtract/divide give digit counts but not exact ranges. | S§7.3–7.4 | L3 multiply: 1-digit = 0–9, 2-digit = 10–99, each sub-type picked 50/50. L4 add/subtract: operands 100–1,000. L4 multiply: 10–99 × 2–9 or 10–99 × 10–99. L4 divide: divisor 2–20, quotient 10–50, so the dividend is at most 1,000. |
| D-5 | Negative subtraction answers are "optional" at L4, but T13 says to prevent them in the initial version, and no setting exists for them. | S§7.4, T13, S§27 | **No negative answers at any level.** No setting is added. |
| D-6 | Which difficulty applies to mistake-review questions; T56 says they must "match the selected difficulty". | S§6.4, T56 | Review mode uses patterns matching the **selected operations and selected level**, and questions use that level. The disabled message and active count on setup reflect those filters. Fact-family questions that fall outside the level's ranges (for example 8+7 → 15−7 at L1, where subtraction allows 0–10) are rejected and another strategy is tried. |
| D-7 | Whether regular sessions mix in review questions. | S§6.2, S§6.4 | **No.** Regular sessions contain regular questions only; review questions appear only in mistake-review mode. Summary counts are still tracked for both. (Also an open question, C-3.) |
| D-8 | What counts as the "same" mistake pattern. | T52 | Key = operation + operands, with operands sorted for addition and multiplication (8×7 and 7×8 are the same pattern). Difficulty is not part of the key; it is updated to the latest level where the mistake happened. |
| D-9 | "Reset or reduce mastery progress when appropriate"; "handle incorrect review answers". | T52, T61 | An incorrect answer (regular or review) on a pattern sets `incorrectCount += 1`, updates `lastIncorrectAt`, resets `similarCorrectCount` to 0, and sets `mastered = false`. A wrong review answer updates its **source** pattern and does not create a new one. |
| D-10 | Mastery threshold: S§6.4 and T62 say configurable in code; S§6.7 lists it as a suggested setting; T48 leaves it out. | S§6.4, S§6.7, T48, T62 | `DEFAULT_MASTERY_THRESHOLD = 3` constant in code, plus a settings control (range 1–10) that overrides it. Lowering the threshold re-checks mastery. |
| D-11 | Self-reported result vs the selected answer. | S§6.3, S§27 | Statistics, patterns, and mastery use **only** `selfReportedCorrect`. `selectedAnswer` is stored for reference but never overrides it. The back of the card shows both values neutrally and does not suggest which button to press. Encouraging feedback appears only after the button press and is based on the self-report. |
| D-12 | Source of truth for statistics. | S§10.4, S§11, T84 | `mathPractice.statistics` aggregates are updated in the same step that saves the attempt. If they're corrupted, they're rebuilt from `mathPractice.attempts`. Attempts are capped at the most recent 5,000; aggregates are never reduced when trimming. Recent-sessions view shows the last 10; up to 200 sessions are stored. |
| D-13 | Scope of **Reset Statistics** (T47 says "decide whether settings should remain"). The dialog says "all practice history and statistics". | S§6.6, T47 | Clears attempts, sessions, aggregates, **and mistake patterns**. **Keeps settings.** Clear All Data also removes settings. (Open question C-4.) |
| D-14 | Active-session recovery needs storage that isn't among the suggested keys. | S§11, T74 | Add `mathPractice.activeSession` (session, current question, selection, flip state). It is cleared when the session ends. A refresh after flipping restores the back of the card **without** recording anything. |
| D-15 | Sessions that are left early. | S§16, T75 | Attempts already recorded stay recorded. If the user confirms leaving, the session is saved with `completedAt` and appears in Recent Activity if `attempted > 0`. Sessions with 0 attempts are discarded. |
| D-16 | Navigation blocking mechanism. | S§16 | Use React Router's data router (`createBrowserRouter`) with `useBlocker` for in-app navigation, plus `beforeunload` for tab close or refresh. |
| D-17 | Whether the card can flip back. | S§6.3 | One-way flip per question. |
| D-18 | Meaning of "explanation when appropriate". | S§6.3 | Short templated text, for example "56 ÷ 7 = 8 because 7 × 8 = 56", or "8 + 7: 8 + 2 = 10, then 10 + 5 = 15" for addition with carrying. Hidden when the *Show explanations* setting is off. |
| D-19 | Sound effects: no assets or behaviour specified. | S§6.7 | Short tones generated with the Web Audio API (no audio files) after a result is recorded. **Off by default** for classroom use. |
| D-20 | Display and rounding details. | S§6.6 | Accuracy rounded to a whole percent. "Most missed facts" = top 5 by `incorrectCount`, ties broken by most recent. "Most missed operation" ties are shown as all tied operations. Continuous mode shows "Question X" with no total and no progress bar. |
| D-21 | Avoiding immediate repeats. | T29, T54 | Regenerate (retry limit 20) if the new question has the same operation and operands as the previous one. Review mode also avoids the exact original mistake twice in a row. |
| D-22 | Default settings. | T9, T48 | 10 questions; Level 1; all four operations; animation on; explanations on; sound off; feedback on. Settings save automatically on change. |
| D-23 | Project location. The suggested `npm create vite@latest math-practice-app` creates a subfolder. | T1 | Scaffold **in this folder's root** so the instructor documents sit next to `package.json`; the original `.md` files are kept unchanged. (Open question C-2.) |
| D-24 | File layout: T3 adds `types/mistake.ts`, which the S§19 tree lacks. | S§19, T3 | Use the S§19 tree plus `types/mistake.ts`. |
| D-25 | Hosting. | T89 | Not decided yet; depends on submission requirements (C-1). If GitHub Pages, add a `404.html` SPA fallback; Netlify/Vercel use a rewrite rule. |

---

## Part C — Open Questions

| ID | Question | Why it matters |
|---|---|---|
| C-1 | **Where is the assignment brief?** We still need the submission format (repo link, zip, deployed URL), README/report, demo video, due date, and rubric. | Submission deliverables can't be listed without it. Only the spec's acceptance criteria (S§26) and T88–T89 (tested, built, deployed) are known. |
| C-2 | Should the app live in the folder root or in a `math-practice-app/` subfolder as T1's command suggests? | Affects how the submission is packaged (D-23). |
| C-3 | Should regular sessions also mix in some mistake-review questions? | S§6.4 says "generate similar questions in future sessions", which could mean regular sessions too (D-7). |
| C-4 | Should **Reset Statistics** also clear mistake patterns? | The dialog wording suggests yes (D-13). |
