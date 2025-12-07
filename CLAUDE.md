# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

k6-web is a web extension for k6 that allows users to run k6 load tests directly from their web browsers. The project consists of two main components:

- **k6-agent** (backend): Node.js/Express API server that manages k6 test execution
- **k6-front** (frontend): React/TypeScript web application for creating and monitoring tests

## Development Commands

### Backend (k6-agent)

```bash
cd k6-agent
npm install
npm start  # Starts the Express server on port 3000
```

### Frontend (k6-front)

```bash
cd k6-front
npm install
npm run dev      # Start development server with hot reload
npm run build    # Build for production (runs TypeScript check + Vite build)
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Prerequisites

The backend requires the k6 binary to be installed and available in the system PATH. The k6Runner spawns k6 processes using `spawn('k6', [...])` at k6-agent/src/test/k6Runner.js:17.

## Architecture

### Backend Architecture (k6-agent)

The backend is a Node.js Express application structured as follows:

- **Entry Point**: `src/index.js` - Sets up Express app with CORS, routes, and graceful shutdown
- **Routes**:
  - `/health` - Health check endpoint (src/health/router.js)
  - `/v1/tests` - Test management API (src/test/router.js)
- **Core Components**:
  - `k6Runner.js` - Manages k6 process execution, maintains in-memory map of running tests, handles stdout/stderr streaming
  - `resultManager.js` - Persists test results to disk as JSON files, manages result lifecycle
  - `shutdownHandler.js` - Ensures graceful shutdown by stopping all running tests
- **Configuration**: `src/commons/configs.js` loads environment variables from `.env`:
  - `PORT` - Server port (default: 3000)
  - `K6_BASE_PATH` - Base directory for k6 files (default: /tmp/k6)
  - `RESULTS_DIR` - Test results storage (default: K6_BASE_PATH/k6-results)
  - `SCRIPTS_DIR` - Temporary k6 scripts storage (default: K6_BASE_PATH/k6-scripts)
  - `MAX_RESULT_FILES` - Maximum result files to retain (default: 500)

### Frontend Architecture (k6-front)

React application built with Vite and TypeScript:

- **Routing**: React Router with three main pages (src/App.tsx):
  - `/` - TestList (homepage showing all tests)
  - `/tests/:testId` - TestDetail (test results and live logs)
  - `/new-test` - NewTest (create and run new test)
- **API Layer**: `src/apis/testApi.ts` - Centralized API client using Axios
- **Types**: TypeScript definitions in `src/types/`:
  - `test.ts` - Test and response types
  - `k6.ts` - K6 configuration types
  - `log.ts` - Log entry types
- **Environment**: `.env` contains `VITE_API_URL` (backend URL, default: http://localhost:3000)

### Test Execution Flow

1. User submits k6 script via frontend (NewTest page)
2. Frontend POSTs to `/v1/tests` with script and optional metadata (name, config)
3. Backend writes script to temporary file in SCRIPTS_DIR
4. k6Runner spawns k6 process with `--summary-export` flag
5. Process stdout/stderr is captured and streamed via Server-Sent Events (SSE) at `/v1/tests/:testId/stream`
6. Frontend connects to SSE endpoint to display live logs
7. On completion, summary JSON is parsed and result is saved to RESULTS_DIR
8. Temporary script and summary files are cleaned up

### API Endpoints

- `POST /v1/tests` - Run new test (accepts script as plain text or JSON with metadata)
- `GET /v1/tests` - List all tests (supports pagination with cursor/limit)
- `GET /v1/tests/:testId` - Get test details
- `GET /v1/tests/:testId/stream` - SSE stream for live test logs
- `PUT /v1/tests/:testId/stop` - Stop running test
- `DELETE /v1/tests/:testId` - Delete test result (only for completed tests)

### State Management

- **Running Tests**: Stored in-memory in k6Runner's `runningTests` Map
- **Completed Tests**: Persisted as JSON files in RESULTS_DIR
- **Test List**: Combines in-memory running tests with persisted results, sorted by startTime descending

## Key Technical Details

- The router (k6-agent/src/test/router.js) has duplicate route handlers for `GET /:testId` at lines 141 and 163 - the second one is unreachable
- Test IDs are generated using timestamp + random string: `test-${Date.now()}-${Math.random().toString(36).substring(7)}`
- SSE streaming sends historical logs immediately upon connection, then streams new logs in real-time
- Frontend uses `VITE_` prefix for environment variables (Vite requirement)
- Results are limited by MAX_RESULT_FILES - older results are automatically cleaned up