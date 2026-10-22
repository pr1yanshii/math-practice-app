# Math Practice

A browser-based math practice app for children ages 7–12: addition, subtraction, multiplication and division on multiple-choice flashcards, with four difficulty levels, self-reported scoring ("I Got It Right" / "I Got It Wrong"), mistake tracking with similar-question review and mastery, statistics, and settings. No account or server: progress is stored only in the browser's localStorage.

Built with React 19, TypeScript, Vite and React Router, following `specification.md`, `todo.md` and `REQUIREMENTS.md`. Work and verification are recorded in `DEVELOPMENT_LOG.md`.

## Run locally

Requires Node.js 22.22+ (developed on Node 24).

```bash
npm install
npm run dev        # http://localhost:5173/
```

## Checks

```bash
npm test           # Vitest + React Testing Library
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run build      # production build in dist/
npm run preview    # serve the production build
```

## Deployment

`netlify.toml` builds with `npm run build`, publishes `dist/`, and redirects every route to `index.html` so direct links and refreshes work.

## Privacy

No personal information is collected and nothing is sent to a server. All progress lives in this browser's localStorage, and clearing the browser's site data erases it.
