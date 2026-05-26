# Repository Guidelines

## Project Structure & Module Organization

This repository has two Node.js/TypeScript packages:

- `k6-agent/`: Express backend for running and managing k6 tests. Source lives in `src/`, grouped by `domains/` and shared utilities under `shared/`.
- `k6-front/`: Vite + React frontend. Source lives in `src/`, with pages in `src/pages/`, UI in `src/components/`, API clients in `src/apis/`, hooks in `src/hooks/`, and translations in `src/i18n/locales/`.
- `docs/`: README screenshots and visual documentation assets.

Backend tests are colocated in `__tests__/` folders or `*.test.ts` files under `k6-agent/src/`.

## Build, Test, and Development Commands

Run commands from the relevant package directory.

```sh
cd k6-agent && npm install
npm run dev       # start the agent with nodemon + ts-node
npm run build     # compile TypeScript and rewrite path aliases
npm test          # run Jest tests
npm run start     # run compiled dist/index.js
```

```sh
cd k6-front && npm install
npm run dev       # start the Vite dev server
npm run build     # type-check and build the frontend
npm run lint      # run ESLint
npm run preview   # preview the production build
```

Node.js 20+ is expected. The agent also requires `k6` when running real load tests locally.

## Coding Style & Naming Conventions

Use TypeScript with strict compiler settings. Follow the existing style: two-space indentation, semicolons, single quotes, and compact JSX tags such as `<Layout/>`. Keep backend imports on path aliases (`@domains/*`, `@shared/*`) when appropriate.

Use PascalCase for React components and page files, camelCase for functions and hooks, and kebab-case for backend domain files such as `folder-service.ts`.

## Testing Guidelines

Backend tests use Jest with `ts-jest` and Supertest for HTTP coverage. Name tests `*.test.ts` and place domain tests in `src/domains/<domain>/__tests__/`. Run `cd k6-agent && npm test` before changing backend behavior.

The frontend currently has lint/build checks but no test script. For frontend changes, run `npm run lint` and `npm run build`.

## Commit & Pull Request Guidelines

Recent commits use short imperative subjects, for example `Add waitForTest to TestService` and `Refactor K6LocalExecutor...`. Keep subjects focused and mention affected areas when useful.

Pull requests should include a concise description, test results (`npm test`, `npm run build`, `npm run lint` as applicable), linked issues, and screenshots or screen recordings for visible UI changes.

## Security & Configuration Tips

Do not commit `.env` files or local k6 data. Document new environment variables in `README.md`; current keys include `PORT`, `K6_BASE_PATH`, `MAX_RESULT_FILES`, and `VITE_API_URL`.
