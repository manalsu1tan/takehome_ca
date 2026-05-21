# Carbon Arc Tasks

This is a task management app. It includes a FastAPI backend, a TypeScript React frontend, authentication, task statistics, activity history, priorities, tags, target dates, richer task statuses, and a Docker Compose setup that runs both services.

## Stack

- Backend: Python, FastAPI, Pydantic, Uvicorn
- Frontend: React, TypeScript, Vite, React Router
- Runtime: Docker Compose
- Tests: Pytest, Vitest, React Testing Library, Playwright

## Quick Start

From the repo root:

```bash
docker-compose up --build
```

Then open:

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API docs: http://localhost:3001/docs

Demo credentials:

```text
Email: demo@carbonarc.local
Password: password123
```

The Compose setup mounts local `backend/` and `frontend/` directories into the containers, so code edits are visible without rebuilding the images. The backend runs Uvicorn with reload, and the frontend runs Vite dev server.

## Local Development Without Docker

Backend:

```bash
cd backend
uv run --extra dev uvicorn app.main:app --host 0.0.0.0 --port 3001 --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Tests

Backend tests:

```bash
cd backend
uv run --extra dev python -m pytest -q
```

Current backend coverage includes login success/failure, auth enforcement, task create/list/detail, missing task errors, completion, title editing, deletion, stats, activity logging, API contract checks against frontend TypeScript response models, and concurrent in-memory store updates.

Frontend component tests:

```bash
cd frontend
npm test
```

End-to-end tests:

```bash
cd frontend
npx playwright install chromium
npm run test:e2e
```

Current frontend coverage includes task list and detail page state tests plus a Playwright flow for login, create, edit, complete, detail activity, and delete.

Frontend build check:

```bash
cd frontend
npm run build
```

## API Usage

Login:

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@carbonarc.local","password":"password123"}'
```

Use the returned token on task requests:

```bash
TOKEN=demo-token
```

Create a task:

```bash
curl -X POST http://localhost:3001/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Write report","priority":"high","tags":["Data","Infra"],"target_date":"2026-06-01"}'
```

List tasks:

```bash
curl http://localhost:3001/tasks \
  -H "Authorization: Bearer $TOKEN"
```

Filter/search/sort tasks:

```bash
curl "http://localhost:3001/tasks?search=infra&tag=Data&status=in_progress&sort_by=target_date&sort_order=asc" \
  -H "Authorization: Bearer $TOKEN"
```

Get stats:

```bash
curl http://localhost:3001/tasks/stats \
  -H "Authorization: Bearer $TOKEN"
```

Mark a task complete:

```bash
curl -X PUT http://localhost:3001/tasks/<task_id>/complete \
  -H "Authorization: Bearer $TOKEN"
```

Get activity:

```bash
curl http://localhost:3001/tasks/<task_id>/activity \
  -H "Authorization: Bearer $TOKEN"
```

Delete a task:

```bash
curl -X DELETE http://localhost:3001/tasks/<task_id> \
  -H "Authorization: Bearer $TOKEN"
```

## Implemented Features

Backend:

- `POST /auth/login`
- `GET /tasks`
- `POST /tasks`
- `GET /tasks/{id}`
- `PATCH /tasks/{id}` for title editing
- `PUT /tasks/{id}/complete`
- `PUT /tasks/{id}/toggle`
- `DELETE /tasks/{id}`
- `GET /tasks/stats`
- `GET /tasks/{id}/activity`
- Bearer-token validation on task endpoints
- Structured validation and error responses
- In-memory task and activity store
- Task priority: `low`, `medium`, `high`
- Task status: `pending`, `in_progress`, `completed`
- Task tags and target dates
- Search by title or tag, filter by tag/status, sort by due date/status/priority

Frontend:

- Login page with token persistence
- Protected routes
- Paginated task list
- Task creation
- Inline title editing
- Complete/pending toggle
- Status, priority, tags, and target date editing
- Search, tag filter, status filter, and sort controls
- Delete actions
- Stats panel
- Task detail page
- Activity timeline
- Loading, empty, and error states

## Assumptions And Simplifications

- Tasks are stored in memory and reset when the backend restarts.
- Authentication uses one demo account and a static bearer token.
- Tasks are global, not scoped per user.
- `PATCH /tasks/{id}` was added because the frontend requirement includes title editing, even though the required backend endpoint table did not list an edit endpoint.
- `PUT /tasks/{id}/toggle` was added to support a smoother UI, while the required `PUT /tasks/{id}/complete` endpoint is still implemented.

## How API Errors Are Handled

The backend uses FastAPI and Pydantic validation for request shape errors, returning `422` for invalid payloads. Missing or invalid auth returns `401`, and missing task IDs return `404` with a clear JSON error message.

The frontend centralizes fetch behavior in a typed API client. It parses backend error responses into an `ApiError`, displays user-facing messages, and clears auth state on `401` responses.

## Tests I Would Add With More Time

- More Playwright coverage for pagination, filters, auth redirects, and failed API requests.
- Visual regression checks for the core task list/detail layouts.
- More contract tests for request payloads, not just response schemas.
- Race-condition tests around simultaneous edits and deletes if the store became multi-user.
- Tests for token expiration if auth became more realistic.

## What I Would Improve With One Extra Hour

- Add persistent storage behind the existing store boundary, probably SQLite for local simplicity.
- Add structured request logging and request IDs on the backend.
- Add optimistic UI updates with rollback on mutation failures.
- Add CI that runs backend, component, contract, and Playwright tests on every pull request.
