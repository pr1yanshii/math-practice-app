# Development Log

This log records what was actually done, the decisions made, and how each step was checked. Planned decisions that don't belong to a single phase are in `REQUIREMENTS.md` Part B.

---

## 2026-10-21 — Phase 1: Project Setup (Tasks 1–3)

### Environment found

| Item | Value |
|---|---|
| Folder contents before setup | `specification.md`, `todo.md`, `REQUIREMENTS.md` only |
| Node | v24.22.0 |
| npm | 11.19.1 |
| Git | 2.39.5, no repository yet |
| Filesystem | APFS, case-insensitive (`TODO.md` and `todo.md` are the same file) |

### Decisions

| # | Decision | Reason |
|---|---|---|
| 1 | Scaffolded with `create-vite@9.3.1 --template react-ts` in a scratch folder, then copied the files into the repository root with no-clobber (`cp -n`). | The user asked for the app at the root. `create-vite` targets an empty folder, and copying with no-clobber can't overwrite the existing documents. |
| 2 | **Replaced oxlint with ESLint.** The current template ships oxlint (`.oxlintrc.json`, `"lint": "oxlint"`). | Task 2 and specification §4.4 name ESLint. The oxlint config file was not copied and the package was uninstalled. |
| 3 | ESLint flat config: `@eslint/js` recommended + `typescript-eslint` recommended + `react-hooks` recommended + `react-refresh` (Vite preset) + `eslint-config-prettier` last. | Matches what earlier Vite React templates used. The Prettier config turns off formatting rules so ESLint and Prettier don't conflict. |
| 4 | Prettier settings: no semicolons, single quotes, trailing commas. | Matches the style of the template's own source files. |
| 5 | `.prettierignore` excludes all `*.md`. | `npm run format` must never reformat the instructor documents. |
| 6 | Vitest is configured inside `vite.config.ts` (`defineConfig` from `vitest/config`), with the `jsdom` environment and `src/test/setup.ts`. | One config file. The setup file loads the jest-dom matchers and runs Testing Library `cleanup` after each test, because Vitest globals are off. |
| 7 | `App.tsx` moved to `src/app/App.tsx`. | Follows the specification §19 folder tree. |
| 8 | Created the empty folders from specification §19 (`components/{layout,practice,statistics,common}`, `pages`, `services`, `hooks`, `utils`), each with a `.gitkeep`. | Task 1 asks for the initial folder structure; Git doesn't track empty folders. |
| 9 | Type files follow specification §8.1 and §10 field-for-field. Added two small aliases, `QuestionSource` and `SessionLength`, for unions the spec repeats inline. `PracticeAttempt` is in `session.ts`. | The spec repeats `"regular" \| "mistake-review"` and `number \| "continuous"`; naming them keeps the copies identical. |
| 10 | `AppSettings` field names are our own. | Specification §6.7 lists the settings but defines no interface. A feedback-effects toggle (Task 73) and the app state interface (§12) were **not** added yet; they belong to later phases. |
| 11 | `git init -b main`. **No commit was made.** | Git initialization was requested; committing was not. |
| 12 | `.gitignore`: template defaults (`node_modules`, `dist`, logs, editor files) + `coverage`. | Vitest coverage output shouldn't be committed. |
| 13 | Kept `public/favicon.svg` (Vite logo); removed `public/icons.svg`, `src/assets/*`, `App.css`, `index.css`, and the template `README.md`. | Those were demo content. The favicon is left as a placeholder until a real icon is designed. No global CSS exists yet; styling starts in Phase 2. |
| 14 | Page `<title>` changed to "Math Practice". | Replaces the template's package-name title. |

### Installed versions (`npm ls --depth=0`)

Runtime: `react` 19.3.1, `react-dom` 19.3.1.

Dev: `vite` 8.3.5, `@vitejs/plugin-react` 6.1.2, `typescript` 6.0.3, `eslint` 10.13.0, `@eslint/js` 10.0.1, `typescript-eslint` 8.72.0, `eslint-plugin-react-hooks` 7.1.1, `eslint-plugin-react-refresh` 0.5.7, `eslint-config-prettier` 10.1.8, `globals` 17.13.0, `prettier` 3.9.10, `vitest` 5.0.5, `jsdom` 30.1.3, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/jest-dom` 7.0.1, `@types/react` 19.3.0, `@types/react-dom` 19.3.0, `@types/node` 24.19.2.

Compatibility checked before installing: `typescript-eslint` peer range is TypeScript `>=4.8.4 <6.1.0` (we have 6.0.3); `vitest` 5 accepts Vite `^8.0.0`; every package's Node engine range includes 24.22.

### Files

| File | Status |
|---|---|
| `package.json`, `package-lock.json` | New. Scripts: `dev`, `build`, `preview`, `lint`, `format`, `format:check`, `test`, `test:watch`, `typecheck` |
| `index.html`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | From template (title edited) |
| `vite.config.ts` | Template + Vitest settings |
| `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.gitignore` | New / edited as above |
| `src/main.tsx` | Template, minus the demo CSS import; imports `./app/App.tsx` |
| `src/app/App.tsx`, `src/app/App.test.tsx` | Placeholder `<h1>Math Practice</h1>` and its test |
| `src/test/setup.ts` | Test setup |
| `src/types/{question,session,mistake,statistics,settings}.ts` | Shared types (Task 3) |
| `todo.md` | Only the 21 Phase 1 checkboxes changed from `[ ]` to `[x]` |
| `specification.md`, `REQUIREMENTS.md` | Unchanged |

### Verification

| Check | Command | Result |
|---|---|---|
| TypeScript | `npm run typecheck` | Pass, no errors |
| Lint | `npm run lint` | Pass. Linted 11 files (all `src` files plus both config files). |
| Lint actually enforces rules | Temporary file with a conditional hook, an unused variable and `any` | 3 errors reported (`rules-of-hooks`, `no-unused-vars`, `no-explicit-any`); file deleted afterwards |
| Formatting | `npm run format:check` | First run flagged `src/types/question.ts`; fixed with Prettier; re-run passed |
| Tests | `npm test` | 1 file, 1 test passed |
| Production build | `npm run build` | Pass (`dist/` 0.38 kB HTML, 219.58 kB JS / 68.60 kB gzip) |
| Dev server | `npm run dev` | Vite 8.3.5 ready at `http://localhost:5173/`; page, `/src/main.tsx` and `/src/app/App.tsx` returned HTTP 200 (checked with `curl`, then the server was stopped) |
| Documents preserved | Size check and `diff` | `specification.md` 26,219 bytes (unchanged); `todo.md` diff shows only the 21 Phase 1 checkbox lines |

### Notes and known issues

- npm 11 blocked the install script of `fsevents@2.3.3`, an optional macOS file-watcher dependency, with "install scripts present". The dev server, build and tests all worked without it. If hot reload ever misses file changes, run `npm install-scripts ls` to review it.
- The dev-server page was checked with HTTP requests and the component test, not yet by eye in a browser. That is in the manual checklist.
- When stopping the dev server, the command used (`pkill -f "node.*vite"`) would also have stopped any other Vite process running on the machine at that moment.

---

## 2026-10-21 — Phase 2: Basic Interface (Tasks 4–6) and Phase 3: Practice Configuration (Tasks 7–10)

The user asked for Phase 3. Phase 2 wasn't built yet and Phase 3 depends on it, so after asking, the user chose to build **Phase 2 first, then Phase 3**.

### Decisions

| # | Decision | Reason |
|---|---|---|
| 1 | Installed `react-router` **8.5.0** (dev: `@testing-library/user-event` 14.6.8). Imports come from `react-router`; `RouterProvider` comes from `react-router/dom`, as the v8 data-mode docs show. | v8 removed the `react-router-dom` package. Its peer range (React ≥ 19.2.7) and Node minimum (22.22) are met. |
| 2 | **Data router** (`createBrowserRouter`) with the route list exported from `src/app/AppRoutes.tsx`. | Needed for `useBlocker` later (REQUIREMENTS D-16). Tests reuse the same route list with `createMemoryRouter`. |
| 3 | `<ScrollRestoration />` in the root layout. | Found in browser testing: after **Start Session** the next page kept the setup page's scroll position, hiding its heading. Now `scrollY` is 0 after navigating. |
| 4 | Statistics, Settings and Session Summary routes show a shared `ComingSoon` page; `/practice/session` shows a **placeholder** that displays the configuration it received. | Task 6 needs every route to exist and the home buttons to go somewhere. The session placeholder makes the Task 10 hand-off visible. Phase 7 replaces it. |
| 5 | **Config hand-off:** `navigate('/practice/session', { state: config })`, and the receiver checks it with `isValidPracticeConfig(unknown)`. | Task 10. Phase 7 can read and validate the same value; invalid or missing state shows a "set up practice" message. The **redirect** in Task 27 is not built yet. |
| 6 | New `PracticeConfig` type (`operations`, `difficulty`, `sessionLength`) in `types/session.ts`. Review mode is **not** included. | Review mode belongs to Task 58 (Phase 14). |
| 7 | Defaults: all four operations, Level 1, 10 questions, in `DEFAULT_PRACTICE_CONFIG`. | REQUIREMENTS D-22. Hard-coded until the Settings page provides defaults (Task 49). |
| 8 | **Mixed** is a checkbox that is ticked when all four are selected. Ticking it selects all four; unticking it clears all four. | REQUIREMENTS D-1 (spec §6.2's "Mixed operations" = T7's "select all" shortcut). |
| 9 | Start Session uses one rule, `isValidPracticeConfig`: at least one known operation, no duplicates, level 1–4, and a supported session length. When nothing is selected, the button is disabled and a message appears in a `role="status"` region linked with `aria-describedby`. The submit handler also checks the rule, so Enter can't bypass it. | Spec §6.2 requires an operation **and** a level (stricter than T10; REQUIREMENTS D-2). With radios and a default, a level is always selected, but the check is still there. |
| 10 | Selections are **native checkboxes and radios** drawn as large tiles (`ChoiceOption`). The real input covers the whole tile with `opacity: 0`. | Keyboard (Tab, Space, arrow keys) and screen-reader behaviour come from the browser. The whole tile is clickable. |
| 11 | Selection is shown by **shape and colour**: a ✓ in a box (checkboxes) or circle (radios), a thicker border, and a tinted background. The current nav link is underlined. | Spec §14: no information by colour alone. |
| 12 | Session length "continuous" is labelled **"Keep going"** with "No limit. Stop when you are ready." | Child-friendly wording. The stored value is still `'continuous'`. |
| 13 | Level descriptions summarise spec §7, for example "Numbers up to 10. Times tables up to 5." | Task 8 asks for a short description per level. |
| 14 | Home/nav buttons are **links styled as buttons** (`ButtonLink`); actions are real `<button>`s (`Button`). | Navigation stays semantically a link. Both share one style (Task 4). |
| 15 | Styling is one global `src/index.css` with CSS custom properties; system rounded font (no web fonts). | Simple for this size, and no external requests (spec §22). |
| 16 | Selector components live in `src/components/setup/`, which is not in the spec §19 tree. `ChoiceOption` is in `components/common/`. | Keeps setup controls apart from the practice-card components in `practice/`. |
| 17 | Removed the `.gitkeep` files from folders that now have files. | They're no longer needed there. |
| 18 | Test setup stubs `window.scrollTo`. | jsdom doesn't implement it and `ScrollRestoration` calls it, which filled test output with "Not implemented" errors. |

### Colour contrast (WCAG, computed)

| Pair | Ratio |
|---|---|
| Text `#1f2a44` on background `#fff8ec` / white / selected `#e8f0ff` | 13.50 / 14.26 / 12.45 |
| Muted text `#4a5568` on white / background / selected | 7.53 / 7.13 / 6.57 |
| White on primary `#2557d6` / hover `#1b3fa0` | 6.15 / 9.27 |
| Disabled text `#5b6475` on `#e2e6ee` | 4.76 |
| Warning text `#92400e` on `#fff4d6` | 6.47 |
| Focus ring `#c2410c` vs background / white | 4.90 / 5.18 |
| Unselected tile border `#8a94a6` vs white | 3.06 |
| Operation symbols (primary) on white | 6.15 |

### Files

| File | Change |
|---|---|
| `src/app/App.tsx`, `src/app/AppRoutes.tsx` | Router and route list |
| `src/components/layout/{AppLayout,Header,Navigation,PageContainer}.tsx` | Shared layout (Task 4) |
| `src/components/common/{Button,ChoiceOption}.tsx` | Button/ButtonLink; selectable tile |
| `src/components/setup/{OperationSelector,DifficultySelector,SessionLengthSelector}.tsx` | Tasks 7–9 |
| `src/pages/{HomePage,PracticeSetupPage,PracticePage,ComingSoon,NotFoundPage}.tsx` | Pages (PracticePage is a placeholder) |
| `src/utils/practiceConfig.ts` | Option lists, defaults, `isValidPracticeConfig` |
| `src/types/session.ts` | Added `PracticeConfig` |
| `src/index.css`, `src/main.tsx` | Styles; stylesheet import |
| `src/test/renderRoute.tsx`, `src/test/setup.ts` | Test helper; `scrollTo` stub |
| `src/app/App.test.tsx`, `src/pages/PracticeSetupPage.test.tsx`, `src/utils/practiceConfig.test.ts` | Tests |
| `todo.md` | Ticked Tasks 4–10 (43 boxes); nothing else changed |

### Verification

| Check | Result |
|---|---|
| `npm run typecheck` / `npm run lint` / `npm run format:check` | Pass / pass / pass |
| `npm test` | **41 tests passed** in 3 files. They cover: home actions and navigation; keyboard Tab + Enter to Start Practice; `aria-current` on nav; 404 page; default selections; multi-select; Mixed select-all/clear and auto-tick; Space toggles a checkbox; only one level and one length at a time; arrow keys change level; Start disabled with message and accessible description; re-enabled after picking; Enter can't submit an empty selection; config passed to `/practice/session` in fixed operation order; placeholder without config; validator accepts/rejects cases. |
| Tests can fail | Temporarily made Start always enabled and broke Mixed's untick: 5 tests failed. Restored: 41 pass. |
| `npm run build` | Pass |
| Headless Chrome on the production build (`vite preview`), driven by `playwright-core` installed in a scratch folder (not a project dependency) | At **375 px, 768 px, 1280 px** on `/` and `/practice/setup`: no horizontal overflow, no tap targets under 44 px, no console errors. Clearing operations disables Start and shows the message. Picking Multiplication + Level 3 + 20 questions and starting shows exactly those on the session page, scrolled to the top. Loading `/statistics` directly renders its page. |
| Visual review of screenshots | Found two problems at 768 px and fixed them: (1) the 3-column tile grid pushed the Subtraction check mark past the tile edge, so the minimum tile width is now 16rem (2 columns on tablet, 3 on desktop, 1 on phone); (2) tile text couldn't shrink, so `min-width: 0` was added. Also found and fixed the scroll-position bug (decision 3). An apparent "blue unselected tile" was a screenshot taken mid-transition; after the transition, the tile is white and the disabled button grey (checked with computed styles). |

### Not done / known gaps

- The nav wraps onto two lines on phones. A simplified mobile menu is Task 71 (Phase 17).
- Focus is not moved to the new page's heading after navigation. That's screen-reader work for Phase 16.
- Settings-driven defaults (Task 49), review mode (Task 58), and redirecting from the session page (Task 27) are left for their phases.
- Not yet tested in Safari, Firefox, or with a real screen reader (Tasks 82 and 87).

---

## 2026-10-21 — Phase 4: Basic Math Question Generation (Tasks 11–16)

### How generation works

1. `generateQuestionForOperations(operations, level)` picks one of the selected operations at random and calls `generateQuestion(operation, level)`.
2. `generateQuestion` rejects unknown operations and levels straight away (for example, bad data from storage later). It then:
   - looks up that level's limits in `DIFFICULTY_RULES`;
   - asks the operation's generator for two operands;
   - calculates the answer and builds the display text;
   - runs `validateQuestion`.
3. If validation fails or the generator throws, it tries again, up to **20 attempts**. After that it throws a `QuestionGenerationError` naming the operation, the level and the last problems found.
4. Every random choice goes through one optional `random` parameter (default `Math.random`). Tests pass fixed values to force the lowest and highest possible numbers.

| Operation | Method |
|---|---|
| Addition | Draw the first operand; draw the second up to `min(operand max, maxResult − first)` so the sum stays within the level's result limit. |
| Subtraction | Draw two numbers and put the **larger first**, so the answer is never negative. Equal numbers give 0. |
| Multiplication | Pick one of the level's factor-pair shapes, draw both factors, then randomly choose which comes first. |
| Division | Spec §9: draw a **nonzero divisor** and a **whole quotient**, then `dividend = divisor × quotient`. The answer is always whole and the divisor is never 0. |

### Number limits

Values marked **spec** come from specification §7; the rest are **implementation decisions** (REQUIREMENTS.md D-3, D-4, D-5).

| Level | Addition | Subtraction (first ≥ second) | Multiplication | Division |
|---|---|---|---|---|
| 1 | operands 0–10, sum ≤ 20 (spec) | 0–10 (spec) | 0–5 × 0–5 (spec) | divisor 1–5 (spec); **quotient 0–5** (decision) |
| 2 | 0–50, sum ≤ 100 (spec) | 0–50 (spec) | 0–10 × 0–10 (spec) | divisor 1–10 (spec); **quotient 0–10** |
| 3 | 0–100 (spec; carrying allowed) | 0–100 (spec; borrowing allowed) | **0–9 × 0–9 or 0–9 × 10–99** (spec says 1-digit × 1- or 2-digit) | divisor 1–12, dividend ≤ 144 (spec); **quotient 0–12** |
| 4 | **operands 100–1,000** (spec: "up to 1,000", multi-digit) | **100–1,000** | **10–99 × 2–9 or 10–99 × 10–99** (spec: 2-digit × 1- or 2-digit) | **divisor 2–20, quotient 10–50**, so dividend 20–1,000 (spec: "larger dividends, 1- or 2-digit divisors") |

### Decisions

| # | Decision | Reason |
|---|---|---|
| 1 | Quotient ranges match the level's multiplication factors (L1 0–5, L2 0–10, L3 0–12). | REQUIREMENTS D-3: keeps division within the same fact families as multiplication. L3's quotient ≤ 12 with divisor ≤ 12 gives the spec's dividend ≤ 144 exactly. |
| 2 | L4 operands start at 100 for addition and subtraction. | REQUIREMENTS D-4: makes Level 4 genuinely multi-digit and different from Level 3 (0–100). |
| 3 | L4 one-digit factor is 2–9, not 0–9. | REQUIREMENTS D-4: ×0 and ×1 aren't "advanced". |
| 4 | **No negative subtraction answers at any level**, including Level 4's "optional negative answers". | Task 13 says to prevent negatives in the initial version; REQUIREMENTS D-5. |
| 5 | Zero is allowed wherever the spec range includes it (0 + 0, 0 − 0, 0 × 0, 0 ÷ 1). | The spec ranges start at 0. Only the divisor is never 0. |
| 6 | Multiplication factor order is random (`7 × 45` or `45 × 7`). Division is always `dividend ÷ divisor`. | Children see both orders. The validator accepts either order. |
| 7 | **`choices` is `[correctAnswer]` for now.** The validator checks that choices include the answer and are unique; the "exactly four" check comes with the distractors in Phase 5 (Tasks 17–19). | The spec's `Question` has four choices, but distractors are Phase 5. Phase 4's "return a valid `Question` object" items were ticked on this basis. |
| 8 | `displayText` is the bare expression, such as `7 × 8`, with the Unicode symbols `+ − × ÷` and thousands separators (`1,000 + 25`). | The card front can add "= ?" and the back can add "= 56" (Phase 6). Same symbols as the setup tiles. |
| 9 | Unknown operations and levels are checked with `Object.hasOwn`. | A plain lookup would accept inherited names such as `"toString"`. There's a test for that. |
| 10 | `createId` uses `crypto.randomUUID` with a timestamp + counter + random fallback. | `randomUUID` only exists in secure contexts; opening the dev server from a tablet over `http://<LAN IP>` isn't one. |
| 11 | Files: `utils/math.ts` (`randomInt`, `pickRandom`, `calculateAnswer`), `utils/shuffle.ts` (Fisher–Yates), `utils/ids.ts`, `utils/validation.ts`, `services/difficultyRules.ts`, `services/questionGenerator.ts`. | Follows the spec §19 tree; the rules table is separate so the validator can use it too. |
| 12 | "Handle unexpected generation failures" = retry + typed error. A friendly on-screen message and a fallback question are Tasks 77–78 (Phase 19). | Keeps Phase 4 to generation. |

### Tests (`npm test`: 8 files, 144 tests)

| File | What it checks |
|---|---|
| `services/questionGenerator.test.ts` | **All 16 operation × level combinations**, 500 questions each: passes validation, correct shape (`source: 'regular'`, choices = answer, fresh id). Separate per-operation checks against limits **written out from the spec in the test itself**, not imported from `difficultyRules.ts`. **Lowest and highest boundaries** for every operation and level using fixed random values (for example L1 `0 + 0` … `10 + 10 = 20`; L3 `0 ÷ 1` … `144 ÷ 12`; L4 `1,000 ÷ 20 = 50`; L4 `99 × 99 = 9801`). Zero cases (`0 × 0`, `0 − 0`, `0 ÷ 1`). Subtraction puts the larger number first even when drawn second, and handles equal operands. Division: divisor ≠ 0, whole answers, dividend = divisor × quotient, divisor > 0 even at the lowest random value. L3 carrying and borrowing both occur; L3/L4 multiplication produces both shapes; factor order varies. Sum cap with a tighter limit. Mixed: only selected operations are used, all of them over 400 questions, single operation works, empty list rejected. Failures: unknown operation (`exponent`, `toString`), levels 0 and 5, recovery on retry, and a clear error after 20 attempts for each operation. |
| `utils/validation.test.ts` | Accepts a valid question; rejects unsupported operation or level, wrong answer, ÷ 0, fractional answer, negative answer, operands above the level, mismatched display text, choices missing the answer, duplicate choices, and two 2-digit factors at L3. Accepts factors in either order. |
| `utils/math.test.ts` | `randomInt` lowest/highest, inclusive ends and integers over 2,000 draws, min = max, zero/negative bounds, invalid ranges; `pickRandom`; `calculateAnswer` including zeros. |
| `utils/shuffle.test.ts` | Same items, input not changed, empty/single lists, fixed results for fixed random values, and each item in each position about equally often over 8,000 shuffles (±15%). |
| `utils/ids.test.ts` | 1,000 unique ids, also when `crypto.randomUUID` is missing. |

**Checking that the tests can fail:** four bugs were injected one at a time and then reverted.

| Injected bug | Result |
|---|---|
| Subtraction keeps the drawn order | Caught (1 test). The validator also rejected the negative questions and the generator retried. The safety net worked, so only the direct ordering test failed. |
| Level 1 divisor range allows 0 | Caught (2 tests) |
| Generator ignores validation | Caught (2 tests) |
| Addition sum cap removed | **Not caught at first**: with the spec's numbers, the operand limits already keep sums within 20 and 100, so the cap never takes effect. Added a test that uses a tighter limit directly; the injected bug is now caught. |

Other checks: `npm run typecheck`, `npm run lint`, `npm run format:check` and `npm run build` all pass.

### Not done / notes

- Generators aren't connected to the UI yet; the practice page is still the Phase 3 placeholder (Phase 7).
- No wrong-answer choices or shuffling of choices yet (Phase 5). `shuffle` exists and is tested, but nothing calls it yet.
- No check against repeating the previous question (Task 29).

---

## 2026-10-21 — Phase 5: Multiple-Choice Answers (Tasks 17–19)

### How choices are built

`buildQuestion` now calls `generateDistractors(...)` in `src/services/distractorGenerator.ts`, then sets `choices = shuffle([correctAnswer, ...distractors])`.

`generateDistractors` collects exactly **three** wrong answers in three stages. Each candidate is kept only if it is a whole number, **≥ 0**, not the correct answer, not already chosen, and **plausible** (within 10 of the answer, or within half the answer for big answers).

1. **Operation-specific mistakes**, in random order:

   | Operation | Mistakes offered |
   |---|---|
   | Addition | subtracted instead (`|a − b|`); forgot to carry (`answer − 10` when the ones column carries, otherwise `+ 10`); counting slips `± 1` |
   | Subtraction | added instead (`a + b`); borrowing mistake (each column smaller-from-larger: `52 − 17 → 45`); `± 1`; `± 10` |
   | Multiplication | neighbouring times-table facts `(a ± 1) × b`, `a × (b ± 1)` (for `8 × 7`: 48, 63, 49, 64); added instead (`a + b`) |
   | Division | the divisor from the same fact family (`56 ÷ 7` → 7); neighbouring facts `q ± 1`, `q ± 2` |

2. **Nearby numbers:** random offsets of up to ±10% of the answer (at least ±3), **at most 30 tries**.
3. **Guaranteed finish:** count upward from `answer + 1`. These values are never negative and always new and plausible, so this ends within a few steps. It can't loop forever, even when the answer is 0.

The validator now enforces spec §18 on the choices: **exactly 4**, all **whole and ≥ 0**, **unique**, and including the correct answer. Unique + included means the answer appears exactly once.

### Decisions

| # | Decision | Reason |
|---|---|---|
| 1 | No negative choices at any level. | No level allows negative answers (REQUIREMENTS D-5), so a negative choice would be an obvious give-away. |
| 2 | Plausibility window: `|wrong − answer| ≤ max(10, answer / 2)`. | Spec §8.2 asks for "close enough to be believable". It drops far-off mistakes such as `8 + 7 = 15` as a choice for `8 × 7 = 56`, while keeping close ones such as `5 + 3 = 8` for `5 − 3 = 2`. |
| 3 | Fixed stages instead of an open-ended retry loop. The random stage is capped at 30 tries, and the final stage always finishes. | Task 17 asks for a retry limit; this makes infinite loops impossible by construction. |
| 4 | For an answer of **0**, the wrong choices must all be above 0, so 0 is always the smallest choice. | Unavoidable without negative numbers. The **position** of 0 is still shuffled. |
| 5 | The same `random` source is used for operands, distractors and shuffling. | Tests can force fixed values through the whole pipeline. |

### Tests (`npm test`: 9 files, **190 tests**)

- **`distractorGenerator.test.ts` (new):**
  - `8 × 7` gives only neighbouring facts (48/63/49/64).
  - Close mistakes are offered: added-instead for `5 − 3`, the borrowing mistake 45 for `52 − 17`, forgot-to-carry 73 for `38 + 45`, and the divisor 7 plus 9 for `56 ÷ 7`.
  - The implausible 15 is never offered for `8 × 7`.
  - **12 answers at or near zero** (`0+0`, `0−0`, `7−7`, `0×0`, `0×5`, `0÷1`, `0÷5`, `1+0`, `1−0`, `1×1`, `1÷1`, `2÷1`), each run with normal, always-lowest and always-highest random values. All give 3 valid distractors, and there are never negatives for 0.
  - All operations finish with constant random sources (0, 0.5 and ~1), which forces the fallback.
  - The largest answers (`99 × 99`, `1,000 + 1,000`, `1,000 ÷ 20`) work.
  - Every operation × level is valid with fixed random sources.
  - **The correct answer's position is spread evenly:** 4,000 questions per operation, each position between 800 and 1,200 (1,000 expected).
  - It is not usually the smallest or largest choice (under 60% of the time each).
- **`questionGenerator.test.ts`:** all 16 operation × level samples (500 each) now also check 4 unique, whole, non-negative choices with the answer exactly once.
- **`validation.test.ts`:** the helper now builds 4 choices. New rejections: 3 choices, 5 choices, a negative choice, a fractional choice, duplicates, and choices missing the answer.

**Mutation check.** Five bugs were injected one at a time, then reverted; all were caught.

| Injected bug | Failed tests |
|---|---|
| Choices not shuffled | 4 |
| Negative distractors allowed | 40 |
| Guaranteed fallback removed | 35 |
| Correct answer allowed as a distractor | 38 |
| Plausibility filter removed | 4 |

The first attempt at this check used `timeout`, which macOS doesn't have, so every result was empty. It was rerun with `perl -e 'alarm 120; exec @ARGV'` and gave the results above. After restoring the code, 190/190 pass, and typecheck, lint, format and build all pass.

### Notes

- Questions still aren't shown on screen; the card is Phase 6 and the session is Phase 7.

---

## 2026-10-21 — Phase 6: Question Card (Tasks 20–25)

### What was built

| File | Role |
|---|---|
| `components/practice/QuestionCard.tsx` | Holds `selectedAnswer`, `isCardFlipped` and `resultGiven` state. Renders both faces; the face not showing gets `inert`. Calls `onResult({ selectedAnswer, selfReportedCorrect })` once, only from the result buttons. |
| `components/practice/CardFront.tsx` | "Question X of Y" ("Question X" for continuous practice), the question `7 × 8 = ?`, four answer buttons, and **Flip Card**, which is disabled with "Pick an answer first." until an answer is picked. |
| `components/practice/AnswerChoice.tsx` | One answer as a `<button aria-pressed>`; a ✓ and a filled colour show the selection. Disabled after flipping. |
| `components/practice/CardBack.tsx` | `7 × 8 = 56`, "Your answer: 54", "Did you get it right?", and **I Got It Right** / **I Got It Wrong**. Both are disabled after one is pressed. |
| `utils/questionText.ts` | Number formatting and spoken text for screen readers ("What is 7 times 8?", "7 times 8 equals 56"). |
| `pages/PracticePage.tsx` | Still a placeholder (Phase 7 builds the session). It now shows a **card preview** labelled "results are not saved yet". After a result it says which button was pressed and offers **Try Another Card**. |
| `index.css` | Card, answer and flip styles; `.visually-hidden`; preview styles. Removed the now-unused `.summary-list` styles from Phase 3. |

### Decisions

| # | Decision | Reason |
|---|---|---|
| 1 | **Selecting and flipping only change what is shown.** The only path to `onResult` is the result buttons, and it passes the button pressed, never `selectedAnswer === correctAnswer`. The card stores nothing; recording is Phase 7. | User requirement and spec §6.3 (REQUIREMENTS SR-1 to SR-3). |
| 2 | The parent passes `key={question.id}`, so each new question starts with no selection, unflipped, and with the result buttons enabled. | Task 22/24 "reset for each new question" without effects that reset state. |
| 3 | Both faces are always rendered in **one grid cell**, so they have the same size and position. | Task 25 "keep the front and back aligned". Measured in Chrome: identical rectangles (576×420 tablet, 343×402 phone). |
| 4 | **Hidden face:** `inert` (no focus, no clicks, skipped by screen readers) plus `visibility: hidden`. The face being hidden waits half the flip (0.3s) before disappearing; the face being shown appears immediately but can't be seen from behind until it turns past edge-on (`backface-visibility: hidden`). The back is pre-rotated 180°, so text is never mirrored. | User requirement: hidden content can't receive focus. Task 25: no mirrored or unreadable content. |
| 5 | **Animation:** a 0.6s `rotateY` flip. **Animations off** (`animationsEnabled={false}` → `.card--static`) and **reduced motion** both mean no transition and no delay; the faces simply swap. | Spec §13.3 and §14. |
| 6 | **Changed the global reduced-motion rule** from `transition-duration: 0.01ms !important` to `transition: none !important`. | **Bug found in Chrome:** with the tiny duration, every element's *inherited* `visibility` change became a transition. In the frame the back appeared, its heading was still hidden and couldn't take focus. Turning transitions off fixes this. |
| 7 | After flipping, **focus moves to the back's heading** on the next animation frame. | The Flip button disappears with the front, which otherwise leaves focus on the page body. **Bug found in Chrome:** calling `focus()` during the same click that removes `inert` is ignored, so it waits one frame. A screen reader reads the revealed answer when the heading takes focus (spec §14 "screen-reader-friendly", "announce the revealed answer"). |
| 8 | The question heading has a visible part (`7 × 8 = ?`, hidden from screen readers) and a spoken part ("What is 7 times 8?"). | The symbols − × ÷ aren't reliably read aloud. |
| 9 | Answer buttons use `aria-pressed`, with the selection shown by ✓ + fill + border. | Toggle-button meaning for assistive tech; not colour alone (spec §14). |
| 10 | The back shows the student's answer neutrally and asks "Did you get it right?". It doesn't say whether the answer matches. | REQUIREMENTS D-11: the child decides. |
| 11 | No progress bar yet, and no explanation text on the back. | Progress bar is Task 30 (Phase 7); explanations need the *Show explanations* setting (Task 48 / REQUIREMENTS D-18). Neither is in Phase 6's task list. |
| 12 | Removed a `useRef` "report once" guard. | Mutation testing showed it couldn't be reached: React disables both buttons right after the first press, before a second click arrives. `resultGiven` state remains the single guard (spec §18; CLAUDE.md "no handling for impossible scenarios"). |

### Tests (`npm test`: 10 files, **211 tests**)

`components/practice/QuestionCard.test.tsx` (21 tests) covers:

- **Front:** progress text; `7 × 8 = ?`; four answers in order; spoken question; "Question 12" without "of" for continuous practice; thousands separators.
- **Selection:** Flip disabled with an accessible hint until an answer is picked; one answer pressed at a time; selection can change; ✓ shown on the selected answer only; **no `onResult` on select**.
- **Flip:** back inert before flipping; back shows the question with the answer and "Your answer: 54"; front inert after; focus moves to the revealed answer; **no `onResult` on flip**; answers and Flip disabled after flipping, and a forced click on the hidden front changes nothing; `card--static` when animations are off, with the same face switching; animated by default.
- **Result:** wrong choice + *I Got It Right* reports `selfReportedCorrect: true`; correct choice + *I Got It Wrong* reports `false`; a double click and then the other button report only once, and both buttons end up disabled; result buttons do nothing before flipping.
- **Next question:** a new `key` resets selection, flip state and the result buttons.
- **Keyboard:** Tab to an answer, Space to select, Tab to Flip, Enter, focus on the answer, Tab to *I Got It Right*, Enter.

`PracticeSetupPage.test.tsx` now checks that the session page shows a card from the chosen operations ("Question 1" for continuous practice).

**Mutation check** (one at a time, then reverted):

| Injected bug | Result |
|---|---|
| Result calculated by comparing answers instead of the button pressed | caught (2) |
| Selecting an answer reports a result | caught (5) |
| Back face never inert | caught (2) |
| Flip allowed without a selection | caught (2) |
| `useRef` once-only guard removed | **not caught**. The guard couldn't be reached, so it was removed (decision 12). |

**In Chrome** (production build via `vite preview`, headless Chrome driven by `playwright-core` in the scratch folder), at tablet 768 px, phone 375 px, and tablet with reduced motion:

- **Before flipping**, Tab never reaches the result buttons.
- **After flipping**, Tab never reaches the answers or Flip Card, but does reach the result buttons.
- The hidden face is `inert` and `visibility: hidden`.
- Focus lands on the revealed answer in all three modes. It **failed** at first (decisions 6 and 7) and was fixed.
- Faces line up exactly; no horizontal overflow; no console errors.
- About 250 ms after flipping, the card is mid-turn with normal motion and already flipped with reduced motion.
- **Animations off:** there's no setting UI yet, so a static card element was added to the page and its computed CSS read: transition 0s, no hide delay, hidden face hidden. (A first attempt added the class to the live card, but React reset it on the next render, so that check was invalid and was replaced.)
- **Screenshots reviewed:** front, mid-flip (real 3D turn, readable), and back (not mirrored). The back's content was moved to the vertical centre and the result buttons now fill their columns.

typecheck, lint, format check and build all pass.

### Not done

- **Task 25 "Add a setting for disabling animations" is not ticked.** The card supports it (`animationsEnabled`), but there's no setting a student can change until the Settings page (Task 48).
- Number keys 1–4 for answers are Task 66 (Phase 16).
- Recording results, moving to the next question, the progress bar and session totals are Phase 7. The preview page saves nothing.
- Not yet tested in Safari or Firefox (Task 87), or with a real screen reader (Task 82).

---

## 2026-10-21 — Phase 7: Practice Session (Tasks 26–31)

### How a session works

1. **Setup → session:** the setup page passes the configuration in navigation state (Phase 3). `PracticePage` checks it with `isValidPracticeConfig`. If it's missing or invalid (typed URL, bookmark, bad state), the page **redirects to `/practice/setup`**.
2. **State:** `usePracticeSession(config)` holds the session with `useReducer`. The state includes:
   - `session`: id, start time, operations, level, length, `attempted`, `correct`, `incorrect`, and `completedAt` when finished;
   - `currentQuestion` and `currentQuestionIndex`;
   - `attempts`: every recorded `PracticeAttempt`;
   - `isActive`.
3. **Recording:** the only way in is the card's `onResult`, which fires only from **I Got It Right / I Got It Wrong** (Phase 6). The hook builds a `PracticeAttempt` from **the card that sent the result**, with `selfReportedCorrect` taken straight from the button, and generates the next question. The reducer then:
   - **ignores** the result if the session has ended, if the result isn't for the question on screen, or if that question was already recorded;
   - otherwise adds the attempt, increments `attempted` and either `correct` or `incorrect` according to the **self-reported** result, and moves to the next question.
4. **Next card:** the page renders `<QuestionCard key={question.id}>`, so selection and flip state start fresh. The new card fades in briefly (0.25s, skipped with animations off or reduced motion). Focus moves to the new question.
5. **No immediate repeats:** `generateNextQuestion` regenerates (up to 20 tries) if the new question has the same operation and numbers as the previous one.
6. **Progress:** fixed sessions show a labelled `<progress>` ("3 of 5 answered") above the card, and the card shows "Question 4 of 5". Continuous sessions show "Question 4" and no progress bar.
7. **Ending:**
   - **Fixed sessions** end when `attempted` reaches the length; `completedAt` is set.
   - **Continuous sessions** have an **End Session** button. With no answers it ends straight away. Otherwise a modal **confirmation** asks "End this practice session?", with **Keep Practicing** focused first; Escape also cancels.
   - Either way a **basic "Practice finished!" view** shows the totals with **Practice Again** (new session, same settings), **Change Settings** and **Return Home**.

### Decisions

| # | Decision | Reason |
|---|---|---|
| 1 | The reducer is **pure**: attempt id, timestamps and the next question arrive with the action. | Predictable and testable. React StrictMode runs reducers twice in development, which is only safe when they're pure. |
| 2 | **Two duplicate guards:** the card disables both buttons after one press (Phase 6), and the reducer only accepts a result for the question **on screen** that **hasn't been recorded**. | User requirement: rapid clicks and repeated events must not count twice. The reducer check also covers late events from an earlier card. |
| 3 | `recordResult(question, result)` takes the card's own question rather than reading "current question". | A late event from an old card would otherwise be recorded against the new question. A hook test covers this. |
| 4 | Session state lives in the page's hook, not in a global `AppProvider` yet. | Nothing else needs it until the summary (Phase 8) and storage (Phase 9). The reducer is pure, so moving it into a context provider later is mechanical. |
| 5 | Attempts are kept **in memory**. | Saving to localStorage is Phase 9 (Task 39). Task 28's "store the completed attempt" was ticked on this basis. |
| 6 | **Fixed sessions end after N answers inside Phase 7**, with `completedAt` set, and show a **basic in-page summary**. **Phase 8 boxes are not ticked.** | A fixed session can't run forever. Task 31 asks for a summary after a session ends. The full summary page, accuracy, the `/practice/summary` route, and Task 32's "navigate to the summary page" are Phase 8. |
| 7 | End Session asks for confirmation only after at least one answer. | Task 31: "confirm before ending **when appropriate**". Nothing is lost before the first answer. |
| 8 | New `ConfirmDialog` (`components/common`, as in spec §19) uses a native `<dialog>` with `showModal()`. The test setup adds a tiny stand-in for `showModal` because jsdom lacks it; the real behaviour was checked in Chrome. | The browser provides focus containment, Escape and an inert background. Reusable for Reset Statistics (Task 47). |
| 9 | New `useFocusWhen` hook, used by the card back (Phase 6), the new card front, and the finished view. | One place for the "wait a frame, then focus" fix from Phase 6. |
| 10 | Progress uses a native `<progress>` with a visible `<label>`. | Screen readers announce it as a progress bar with its label (Task 30). |
| 11 | No in-session running score is shown; totals appear when the session finishes. | Spec §13.1: "free from unnecessary distractions". The spec doesn't require a live score. |
| 12 | Refreshing the page starts a **new** session with the same settings, because the settings survive in browser history. | Restoring the active session after refresh is Task 74 (Phase 18). |
| 13 | Removed the Phase 6 preview banner, its result message and their styles. | The real session replaces them. |

### Tests (`npm test`: 13 files, **255 tests**)

| File | Covers |
|---|---|
| `hooks/practiceSession.test.ts` (new, 17 tests) | Initial state (id, start time, configuration, zero totals, valid first question, active, operations copied). Right / wrong counting. **Self-report wins over the maths** in both directions. The attempt is stored. **Duplicates:** the same action twice; a late result for a question no longer showing; a question already recorded. Fixed session ends at 5 with `completedAt`, and later results are ignored. Continuous runs 50 questions without ending. End Session keeps totals and is ignored once ended. |
| `hooks/usePracticeSession.test.ts` (new) | The attempt is built from the card's question and the button pressed. A late event from the previous card is ignored instead of being recorded against the new question. |
| `pages/PracticePage.test.tsx` (new, 18 tests) | Redirect with no or invalid configuration (5 kinds). First card uses the chosen operations. Setup → session end to end. **Select + flip count nothing.** One result = one attempt and a fresh card. Focus moves to the new question. **Double click = one attempt.** A full 5-question session with two self-reports that disagree with the maths gives 3 right / 2 wrong, and no card after the last. Practice Again starts fresh. Progress bar accessible name and value update. Continuous: no total or bar, goes past 20 (to Question 22). End Session with 0 answers skips the dialog. With answers the dialog appears, Keep Practicing continues, End Session ends with totals, and Escape cancels. Fixed sessions have no End Session button. |
| `services/questionGenerator.test.ts` | `generateNextQuestion`: 2,000 consecutive Level 1 questions per operation with no immediate repeat; reversed numbers count as different; gives up when a repeat is unavoidable; uses only the selected operations. |

**Mutation check** (one at a time, then reverted):

| Injected bug | Failed tests |
|---|---|
| Reducer duplicate guard removed | 3 |
| Totals from maths instead of self-report | 5 |
| No repeat avoidance | 4 |
| Fixed session never ends | 4 |
| Missing-configuration redirect removed | 7 |
| Hook records against the current question instead of the card's | **0 at first**: in normal clicking the two are always the same. The hook test in `usePracticeSession.test.ts` was added; it now fails 1 test. |

**In Chrome, on the dev server** (StrictMode on), driven by `playwright-core` from the scratch folder:

- **5-question session:**
  - starts at "Question 1 of 5" / "0 of 5 answered";
  - **a double click counted once**, and **three clicks fired in the same instant counted once**;
  - focus moved to each new question;
  - five different consecutive questions;
  - finished with "You answered 5 questions", 3 right / 2 wrong, and focus on the "Practice finished!" heading.
- **Continuous:**
  - "Question 1" with no progress bar;
  - after 3 answers, End Session opened a **real modal** with **Keep Practicing** focused;
  - Tab stayed inside the dialog; one stop went to the browser's own controls, which is Chrome's normal modal behaviour, and no page element behind the dialog was reachable;
  - **Escape** closed it and the session continued at Question 4;
  - ending gave 3 answered, 2 right / 1 wrong.
- No console errors.
- Screenshots of progress, the dialog and the finished view were reviewed.

typecheck, lint, format check and build pass.

### Not done / later phases

- The full summary page (accuracy, operations, level, review count, `/practice/summary`, all summary actions) is Phase 8.
- Nothing is saved yet: refreshing loses the session and attempts aren't stored (Phases 9 and 18).
- Leaving a fixed session mid-way with the header links isn't guarded yet (Task 75, Phase 18).
- Mistake patterns from wrong answers are Phase 12.

---

## 2026-10-21 — Phase 8: Session Summary (Tasks 32–34) and Phase 9: Local Data Storage (Tasks 35–39)

### Phase 8: how a session finishes

A fixed session ends the moment the **Nth result is recorded**, and that last attempt is included (the reducer adds the attempt and sets `completedAt` in the same step, so the totals cover all N). Continuous sessions end through **End Session**. Either way the session page navigates to **`/practice/summary`** with the finished session in navigation state, using `replace` so Back doesn't return to a finished session (checked in Chrome: Back goes to the setup page).

`SessionSummaryPage` shows every item from spec §6.5: questions answered, I got it right, I got it wrong, **accuracy**, operations practiced, level, and **mistake review questions**. The actions are **Practice Again** (new session, same settings), **Practice Mistakes**, **Change Settings** (setup page pre-filled with the same choices), **View Statistics** and **Return Home**.

### Phase 9: how data is stored

`services/storageService.ts` is the only code that touches `localStorage`. It uses **only** these keys (spec §11): `mathPractice.version`, `.settings`, `.sessions`, `.attempts`. **`localStorage.clear()` is never called**, so nothing belonging to other sites or apps is removed.

| Behaviour | How |
|---|---|
| **Reading** | `getItem` → `JSON.parse` → per-record checks. A damaged list yields `[]`; damaged settings fall back to defaults. **Reading never writes**, so saved data can't be replaced by empty defaults. |
| **Writing** | Appends to what is **currently stored** (re-read first), never to an in-memory copy. Each attempt and each question id is stored once. |
| **Validation** | `storageSchemas.ts` checks every field of each session and attempt, including that `correct + incorrect === attempted` and that a stored attempt's `correctAnswer` really matches its operands. Bad records are skipped and the good ones kept. |
| **Versioning** | `{"version": 1}` is written with the first save, never by loading. `prepareStorage()` runs once at start-up: same version → nothing; **newer** → refuses to write and warns; **older** → runs `MIGRATIONS[n]` step by step, updating the version after each. There are no migrations yet (version 1 is the first format), and the structure plus its tests are in place. |
| **Unavailable storage** | Reading `window.localStorage` can itself throw (blocked cookies, some private modes); that's caught and reported as `unavailable`. |
| **Full storage** | A `QuotaExceededError` is reported as `full`. Nothing already saved is changed. |
| **Session limit** | The newest `MAX_STORED_SESSIONS` (200) are kept (Task 38). |

`AppProvider` loads settings once at start-up, exposes `saveSettings`/`saveSession`/`saveAttempt`, and holds any problem to show. `StorageWarning` shows a friendly `role="alert"` message with an **OK** button, and **practice continues either way** (spec §11 "Storage Failure"). `usePracticeSession` saves in an effect **after the reducer has accepted a result**, so only counted attempts are stored, each once.

### Decisions

| # | Decision | Reason |
|---|---|---|
| 1 | The finished session is passed to the summary in **navigation state**, not read back from storage. | The summary must be right even when saving failed (verified with storage blocked). |
| 2 | The summary page validates what it receives and otherwise shows "No practice to show" with a way to start practicing. | Reloading `/practice/summary` or a damaged state shouldn't crash (spec §17 "Missing session data"). |
| 3 | **Practice Mistakes is present but disabled**, with a visible note that is also its accessible description: *"Practice Mistakes isn't available yet. Mistake practice hasn't been added to the app so far."* | Task 34 asks for the button; mistake tracking is Phases 12–14. Right now "not implemented" is the **only** possible reason, so the note says exactly that. When Phase 14 lands, this becomes two cases: no eligible mistakes vs mastered-only. |
| 4 | Accuracy = `round(correct / attempted × 100)`, 0 when nothing was attempted. | Spec §6.6 formula; REQUIREMENTS D-20 (whole percent). `statisticsService.ts` starts here and grows in Phase 10. |
| 5 | **Sessions with no answers are not saved**; a session is saved after each answer and again when it finishes. | REQUIREMENTS D-15. Saving as it goes means leaving mid-session keeps the answers already given. |
| 6 | Settings are validated **field by field**: valid fields are kept and only invalid ones fall back to defaults. | Spec §17: "reset only the affected section". One bad field shouldn't wipe the student's other preferences. |
| 7 | Data from a **newer** version is read but never written over, and the student is told. | Avoids destroying data this version doesn't understand. |
| 8 | Attempts are capped only by browser quota for now; sessions are capped at 200. | Trimming and summarising old attempts is Task 84 (Phase 21), with its own 5,000 cap (REQUIREMENTS D-12). |
| 9 | `AppProvider` + `appContext` (spec §19) now wrap the app, holding settings and saving. | Phase 10 statistics and Phase 11 settings need the same provider. Kept small: session state still lives in the session hook. |
| 10 | The setup page accepts a configuration in navigation state, so **Change Settings** returns with the same choices selected. | Otherwise the student would have to re-pick everything. |
| 11 | `Practice Again` navigates to `/practice/session` again, and the page keys the session on `location.key`. | A new navigation means a new session, so no special "run" counter is needed. |
| 12 | The test setup clears `localStorage` after each test and adds `makeSession`/`makeAttempt` fixtures. | Tests start from a clean, realistic state. |

### Tests (`npm test`: 16 files, **317 tests**)

| File | Covers |
|---|---|
| `services/storageService.test.ts` (new, 29 tests) | Nothing saved → defaults, empty lists, **no writes**. Settings saved and loaded; valid fields kept while invalid ones fall back; broken JSON, arrays, numbers and `null` → defaults, **stored value left alone**. Sessions: saved with completion details, updated rather than duplicated, newest first, capped at 200, damaged records skipped. Attempts: every field stored, **appended** not replaced, each attempt and question once, damaged records skipped, unreadable list recovers on the next save. Version: `{"version":1}` written on first save, **not** by loading, newer version refused but still read, damaged version entry rewritten. Migrations: each step runs in order and the version advances; a missing step stops without writing; current version does nothing. **Unrelated browser data untouched** by loading, saving, preparing and recovery. Unavailable storage: defaults, no throw, problems reported. Full storage: `full` reported, saved data unchanged, other write errors reported as `write-failed`. |
| `pages/SessionSummaryPage.test.tsx` (new, 15 tests) | Accuracy maths including 0 attempts and rounding. All seven summary items. Focus on the heading. Zero-answer and single-answer wording. Safe message for no state, a damaged session, totals that don't add up, and an impossible review count. Actions: Practice Again starts a session with the same settings; **Practice Mistakes disabled with its explanation as the accessible description**; Change Settings pre-fills setup; View Statistics and Return Home navigate. |
| `pages/PracticePage.test.tsx` (+12 tests) | Finishing goes to `/practice/summary`. **All five attempts and the finished session are saved**, with selected answers, self-reported results, operation, difficulty, session id and timestamps, and an attempt whose pick differs from the correct answer. Saving happens after each answer (so leaving mid-session keeps progress). A double-click stores one attempt. **Selecting or flipping saves nothing.** A continuous session ended with no answers saves nothing; ending one saves `completedAt`. New practice **adds to** earlier saved data and leaves another app's key alone. **Opening the app does not overwrite saved data.** Storage full → warning, session continues, OK dismisses. Storage unavailable → warning at start-up and practice still reaches the summary. Newer-version data → warning and the stored data is untouched. |
| `app/AppProvider.test.tsx` (new) | Saved settings are loaded at start-up; defaults are used without saving them; changed settings are saved and visible to the app. |

**Mutation check** (11 bugs, one at a time, each reverted; all caught):

| Injected bug | Failed tests |
|---|---|
| Loading writes default settings | 5 |
| Attempts replaced instead of appended | 4 |
| Newer-version data overwritten | 2 |
| Quota errors not recognised | 2 |
| Unavailable storage not caught | 2 |
| `storage.clear()` before writing | 7 |
| One bad record drops the whole list | 2 |
| Fixed session ends one question late | 6 |
| Accuracy rounds down | 1 |
| Attempts never saved | 4 |
| Sessions with no answers saved | 3 |

**In Chrome** (dev server, StrictMode on), using a **persistent browser profile**:

- A 5-question session with mixed self-reports finished at `/practice/summary` showing 5 / 3 / 2 / **60%** / all four operations / Level 1 / 0 review questions. Back went to the setup page, not the finished session.
- **The whole browser was closed and reopened.** The saved data was still there: `mathPractice.version` `{"version":1}`, 5 attempts with all 12 fields, 1 session with `attempted 5, correct 3, incorrect 2` and a completion time, every attempt sharing the session id, self-reports `true,false,true,true,false`, and at least one attempt whose pick differed from the correct answer. **Another site's key survived too.** (Task 39 verified.)
- A second session **added** to the stored data (6 attempts, 2 sessions).
- **Storage filled to the real quota** (21 filler entries): answering showed "This browser's storage is full…", the **stored attempts were unchanged**, the progress bar still advanced, OK dismissed the warning, the next answer showed it again, and once space was freed saving resumed.
- **Corrupting our attempts list** then practising: the app recovered, the stored sessions and the other site's key were kept.
- **Storage blocked entirely** (`localStorage` throws): the start-up warning appeared and a full 5-question session still ran to the summary.
- No console or page errors in any case.

An earlier full-storage run was inconclusive: the filler left room, so the save succeeded and no warning was expected. It was rerun with the quota filled exactly (halving chunk sizes), giving the result above.

typecheck, lint, format check and build all pass.

### Not done

- **Statistics and Settings pages are still "coming soon"** (Phases 10 and 11). Settings are saved and loaded, but nothing in the UI changes them yet, so `animationsEnabled` doesn't reach the card and `masteryThreshold` is unused.
- Mistake patterns aren't stored, so `mathPractice.mistakePatterns` and `mathPractice.statistics` don't exist yet (Phases 10 and 12). The review count on the summary is always 0 until Phase 14.
- Refreshing mid-session still starts a new session (Task 74, Phase 18).
- Trimming large attempt histories is Task 84 (Phase 21).

---

## 2026-10-21 — Phases 10–12: Statistics, Settings, Mistake Tracking (Tasks 40–53)

No assignment file exists in the folder; `specification.md` and `REQUIREMENTS.md` were followed.

### What was built

- **Statistics (`/statistics`):** overall, per-operation (4 cards) and per-level (4 cards) attempted / correct / incorrect / accuracy, plus the 10 most recent sessions newest first, with empty states. **Reset Statistics** opens a modal titled exactly *"Are you sure you want to erase all practice history and statistics?"*. Confirming erases sessions, attempts and mistake patterns, keeps settings, and refreshes the page to the empty state.
- **Settings (`/settings`):** card animation, show explanations, sound effects, default operations / level / number of questions, and the mastery threshold (1–10). Each change **saves automatically**. The setup page starts from these defaults, and they can still be changed for one session. **Clear All Application Data** shows a strong warning, removes every `mathPractice.*` key (nothing else), restores defaults and returns home.
- **Mistake tracking:** "I Got It Wrong" creates or updates a pattern in `mathPractice.mistakePatterns` (spec §10.3 fields). Patterns are loaded at start-up into `AppProvider`, validated, and damaged records and duplicates are skipped.

### Decisions

| # | Decision | Reason |
|---|---|---|
| 1 | Statistics are **calculated from saved attempts** (`calculateStatistics`), not stored separately in `mathPractice.statistics`. | One source of truth, so totals can't drift, and "clear aggregate statistics" (Task 47) happens when attempts are cleared. Stored aggregates will be needed when old attempts are trimmed (Task 84). |
| 2 | Correct/incorrect always come from **`selfReportedCorrect`**, for statistics and for mistakes. | The user requirement and spec §6.3. Tests cover picks that disagree with the self-report. |
| 3 | Pattern id = `operation:a:b`, with numbers ordered for + and ×. | REQUIREMENTS D-8: 8 × 7 and 7 × 8 are one record, so duplicates are impossible by construction. |
| 4 | A pattern is updated **inside `saveAttempt`, only when the attempt is newly stored**. | The existing attempt de-duplication guards mistakes too, so double clicks, StrictMode re-runs and repeated saves can't count twice. If the attempt can't be saved, the pattern isn't touched. |
| 5 | A repeat miss: `incorrectCount + 1`, new `lastIncorrectAt`, latest level, `similarCorrectCount` back to 0, `mastered = false`. | REQUIREMENTS D-9 (Task 52 "reset mastery progress"). |
| 6 | **Reset Statistics keeps settings** but also clears mistakes. | Task 47 "decide…"; REQUIREMENTS D-13. The dialog says "all practice history". |
| 7 | The **card animation** setting now drives the card (`card--static`), and **show explanations** shows a one-line check with the opposite operation on the card back ("Check: 56 ÷ 8 = 7"; "Any number times 0 is 0."). | Spec §6.3 asks for a brief explanation, and the setting needed something to control. This also completes Task 25's unticked "Add a setting for disabling animations". |
| 8 | **Sound effects** is a saved setting with an honest description: *"The app has no sounds yet. This choice is saved for when they are added."* | Spec §6.7 lists it and Task 48 asks for the setting; sounds themselves aren't in any task so far. |
| 9 | The mastery threshold is saved but not used yet. | Mastery is applied with mistake review (Phase 14, Task 62). |
| 10 | The setup selectors gained an optional `legend` so the Settings page reuses them. The `ComingSoon` placeholder page was deleted, since no route uses it any more. | Reuse instead of duplicating; the placeholder was mine from Phase 2. |

### Verification

- `npm test`: **21 files, 372 tests pass.** New tests: `mistakeTracker` (ids, create/update, self-report, mastery reset, input not mutated); storage for patterns (only on wrong, once per attempt, one per fact across sessions, not updated when the attempt can't be saved, damaged records and duplicates skipped, recovery) and for both clear functions (other apps' keys untouched); `calculateStatistics` (zero, mixed, 5,000 attempts); the Statistics page (empty state, totals, per-operation and per-level cards, recent order and limit, reset cancel and confirm); the Settings page (shows saved values, auto-saves every field, keeps at least one operation, honest sound text, setup uses defaults, a one-session change doesn't alter defaults, Clear All cancel/confirm/home/defaults); the session (animation and explanation settings, mistakes from a real session using the self-report, double-click counted once, unique patterns across 3 sessions with 15 misses).
- **Mutation check:** 10 bugs injected one at a time and all caught: mistakes by picked answer, unordered keys, repeat attempts updating patterns, reset deleting settings, clear-all wiping the browser, statistics by picked answer, setup ignoring defaults, animation setting ignored, page not refreshed after reset, mastery not reset on a new miss.
- **Chrome (dev server):** settings changes reached setup and the card (static card, explanation shown); wrong answers produced patterns; Statistics and Settings had **no horizontal overflow at 768 px or 375 px** (phone cards stack); the reset dialog was a real modal with the exact title, and afterwards only `mathPractice.settings` and `mathPractice.version` remained; no console errors.
- typecheck, lint, format check and **build** pass. The build failed at first: a Perl edit dropped `@media` from one CSS rule (the same `@media`-as-array mistake as in Phase 6). It was fixed, and the Chrome layout check was rerun on the corrected CSS.

### Not done (later phases)

- Similar-question generation (Phase 13), review mode and mastery (Phase 14), mistake statistics on the Statistics page (Phase 15).

---

## 2026-10-21 — Phases 13–14: Similar Questions and Mistake Review (Tasks 54–62)

### What was built

- **`similarQuestionGenerator.ts`:** builds related questions three ways (spec §6.4): **reversed** (+ and × only; − and ÷ are never treated as reversible), **nearby** (±1 on one number; division moves the quotient or divisor so answers stay whole), and the **fact family** (8 × 7 → 56 ÷ 7, 56 ÷ 8; 12 + 30 → 42 − 12…). Each candidate must pass the existing level validator, use a chosen operation, and differ from the original and the previous question. One strategy that has valid questions is picked, then one question. If nothing fits, it falls back to the original fact, then to any valid question of that kind and level. Every result is labelled `mistake-review` with `mistakePatternId`.
- **`mistakeTracker.ts`:**
  - `applyAttempt`: a correct review answer adds 1 to `similarCorrectCount` on the **original** pattern, mastered at the threshold. A wrong one resets that pattern (`incorrectCount + 1`, progress 0, unmastered; REQUIREMENTS D-9) without creating a new one.
  - `eligiblePatterns`: unmastered, chosen operations, chosen level (D-6).
  - `reviewPriority`: more misses, more recent, fewer successes rank higher.
  - `pickPattern`: random choice weighted by priority, avoiding the previous pattern.
  - `reviewAvailability`: count plus reason (`no-mistakes`, `all-mastered`, `no-match`).
- **Mastery threshold:** `DEFAULT_MASTERY_THRESHOLD = 3` in code. The Settings value is used for new progress, and lowering it counts existing progress straight away (D-10).
- **Setup:** a "What kind of practice?" choice with a live "N mistakes to practice" count, or a disabled option with the reason. Start Session is disabled with that reason if the choices leave nothing to review.
- **Session:** review questions come from priority order. The session keeps its own copy of the patterns, updated per answer (each question once), so a mistake mastered by this answer isn't asked again. When none are left it **ends early**, and the summary says so.
- **Summary:** Practice Mistakes uses the **latest saved** patterns, so new mistakes are available immediately; otherwise it shows the reason. Practice Again repeats the same kind of practice.
- Attempts gained an optional `mistakePatternId` (not in spec §10.1; needed to link results). Storage now also applies correct *review* answers to patterns.

### Testing and findings

- **Chrome, regular session (dev server, before review was wired in):** triple-click counted once; summary, stored session and statistics 5/2/3/40% from self-reports; 3 patterns for 3 wrong answers; unchanged after a refresh; no console errors.
- **Chrome, full flow after wiring:** regular session (triple-click once, 5/3/2/60%, 2 patterns) → **Practice Mistakes enabled immediately** → review answers stored with the right `mistakePatternId` (triple-click once) → **refresh mid-review**: progress kept (the session itself restarts; keeping it is Task 74) → continuous review **ended itself** once both patterns reached 3 and were mastered → summary showed 4 review questions and the early-finish note → statistics 11 / 9 / 2 / 82%, unchanged after a refresh → setup showed "mastered all" and disabled review. No console errors.
- **Script problem, not an app bug:** the first full-flow run timed out because my loop checked for the card before React had rendered it after Start Session. It was reproduced with logging (the session ended correctly after 6 answers), and the script was fixed to wait for the card.
- **Bug found and fixed:** after a review session that mastered everything, **Practice Again** reopened mistake review with nothing to review (a dead-end message page). Reproduced with a failing test; Practice Again now starts regular practice when nothing is left (regression test added).
- **Mutation check:** 10 injected bugs. 9 were caught straight away. "Original question not excluded" survived because no test used equal numbers (7 × 7 reversed is 7 × 7); a test was added and it is now caught.
- `npm test`: **419 passed**. typecheck, lint, format check and build pass.

---

## 2026-10-21 — Phases 15–17: Mistake Statistics, Accessibility, Responsive Design and Feedback (Tasks 63–73)

### What changed

- **Mistake statistics** (`calculateMistakeStatistics`, `MistakeStatistics.tsx`, new "Mistakes" section on `/statistics`):
  - counts of mistakes to practice and mastered, review questions practiced and answered right;
  - the most-missed operation (from "I Got It Wrong" answers; ties listed together);
  - the top 5 facts by misses (ties go to the most recent);
  - active details with misses, "Practice progress: n of threshold right" and the last-missed date;
  - mastered mistakes listed separately in a disclosure;
  - an empty state.
- **Keyboard:** number keys **1–4** pick answers before flipping. They're ignored in form fields, with Ctrl/⌘/Alt, and while a dialog is open. Each answer shows its key as a small hint (hidden from screen readers) plus `aria-keyshortcuts`.
- **Screen readers:** one polite `role="status"` line per answer combines the feedback with "3 of 10 answered." (screen-reader-only text). Focus already moved to the new question and to the revealed answer (Phases 6–7).
- **Feedback:** short random messages that never repeat back-to-back. "Great job!", "Nice work!", "You are improving!" and "Way to go!" follow a right answer; "Keep practicing!" and other supportive lines follow a wrong one. A Settings toggle, **Encouraging messages** (`feedbackEnabled`, default on), turns them off.
- **Responsive fixes:**
  - phone nav is more compact (one row from 360 px; two rows at 320 px);
  - grid columns use `minmax(0, 1fr)` / `min(…, 100%)` so cards, tiles, answers and result buttons shrink with large text;
  - on phones, a tile's words drop below its symbol instead of being squeezed.

### Checks (Chrome, production build, `playwright-core` + `axe-core` 4.14 in the scratch folder)

- **axe-core:** no violations on Home, Setup (regular and review selected), Statistics (with the mastered list open), Settings, Summary and 404, nor on the card back, after an answer, or with the End Session dialog. The card **front** reported colour contrast only while it was fading in (opacity 0.49); rerun after the 0.25s fade-in, it had no violations. That was a timing artifact, not a colour problem.
- **Keyboard:** counting one Tab stop per radio group (as browsers do), every control on Home (8), Setup (14), Statistics (6) and Settings (18) was reached, each with a visible ≥ 2 px outline. A keyboard-only session worked: key 3 selected an answer, Space flipped the card and moved focus to the answer, Enter recorded "I Got It Right", the status read "Nice work! 1 of 10 answered.", and focus moved to the next question. (A first count reported only 10 of 20 because my script told elements apart by their first 80 characters of HTML and counted every radio; after fixing the measurement, all were reached.)
- **Layouts:** no horizontal overflow, no clipped text, no tap target under 44 px at 320 / 360 / 375 / 414 px, tablet portrait 768 × 1024 and landscape 1024 × 768, and 200% zoom (simulated as a 640 px-wide viewport). The card was centred and answers stacked to one column at 320 px.
- **Larger system fonts:** these were found to overflow, then fixed. Set with Chrome's real default font size (`Page.setFontSizes`, so `rem` media queries respond like a real browser setting), a **32 px (200%)** default on a 375 px phone pushed setup and settings 16 px, the practice card 113 px and the card back 77 px past the screen. Causes: content-sized grid columns, a fixed 12rem minimum on the result buttons, and squeezed tiles. After the fixes, all pages (including the card back) show **0 overflow at 24 px and 32 px** on phone and tablet. An earlier attempt that set the font with an inline style was discarded, because it doesn't trigger `rem` media queries.
- `npm test`: **442 passed** (new: mistake statistics, number keys and their exclusions, feedback never shaming and never repeating, feedback setting, progress announcement, Statistics "Mistakes" section). typecheck, lint, format check and build pass.

### Not verified

- No real screen reader (VoiceOver/NVDA) has been used; announcements were checked through DOM roles and focus. That's Task 82.
- Browser zoom was emulated through viewport width rather than Chrome's zoom control.

---

## 2026-10-21 — Phases 18–19: Session Recovery, Navigation Safety, Error Handling (Tasks 74–78)

### What changed

- **Recovery:** the session in progress is saved to `mathPractice.activeSession` after every change: session, current question, the session's attempts, review patterns and threshold, selected answer, and flip state. It is tied to React Router's `location.key`, which survives a browser refresh but is new for every navigation. A refresh continues the same session (same question, picked answer, flipped card); Practice Again or any new navigation starts fresh. The snapshot is cleared when the session ends and by both reset actions.
- **No duplicates after recovery:** restored attempts go through the existing de-duplicating save. A snapshot is rejected if its counts disagree with its attempts, an attempt belongs to another session, or its current question is already stored as answered. Rejected or damaged snapshots are removed, and a fresh session starts.
- **Leaving:** React Router `useBlocker` shows "Leave this practice?" for header links and Back after at least one answer (nothing to lose before that, matching End Session). **Keep Practicing** stays on the same card. **Leave** saves the session with `completedAt`, clears the snapshot and continues. There's no warning once a session has finished.
- **Generation failures:** after 20 invalid attempts, `generateQuestion` now returns a fallback built from the level's smallest numbers (always valid) and logs the reason in development. Unsupported operations or levels still throw.
- **Errors:** a route `errorElement` (`ErrorPage`) shows "Something went wrong", "Your saved progress is safe" and Return Home, never technical details (developers get them in the console). Opening `/practice/session` without a session now redirects to setup **with an explanation**.
- Invalid settings, attempts, sessions and patterns were already handled per category (Phases 9–12); a test now loads every page with every key damaged at once.

### Decisions

- **No `beforeunload` prompt.** A refresh no longer loses anything, so prompting would only get in the way. Closing the tab keeps all saved answers; only continuing that unfinished session is lost.
- `PracticeAttempt` storage was already idempotent, so restored sessions simply re-save and storage ignores repeats.

### Checks

- `npm test`: **474 passed.** New tests cover refresh before picking, after picking, after flipping (nothing recorded) and after answers (totals continue, each answer stored once, through to the summary); the snapshot cleared at the end; a new navigation starting fresh; changed settings starting fresh; a mistake-review session continuing to mastery; damaged or stale snapshots; storage unavailable; leaving (no prompt before the first answer; Keep Practicing; Leave; the Back button; no warning after finishing); the missing-session notice; every page with every key damaged; the fallback for all 16 operation × level combinations; the error page; and 10 snapshot-rejection cases.
- **Mutation check:** 10 bugs. 9 were caught straight away; "snapshot count check dropped" survived until the snapshot-validation tests were added, and is now caught.
- **Chrome (dev server):** real reloads before picking, after picking, after flipping (back still showing, focus on the answer, 0 stored) and after 2 answers ("2 of 5", Question 3, 2 stored). The Back button showed the in-app dialog, and Keep Practicing stayed. Leave went to Statistics with 2 attempts and an ended session, snapshot cleared, statistics 2/1/1/50%. Refresh on the summary: no duplicates (7 attempts, 2 sessions). Back from the summary had no dialog. A direct `/practice/session` showed the notice. With a damaged snapshot and settings, practice still started and another site's key was kept. No native dialogs, no console errors.
- typecheck, lint, format check and build pass.
