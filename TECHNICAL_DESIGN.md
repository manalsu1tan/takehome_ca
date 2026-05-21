# Carbon Arc Assessment: Technical Design Document

## 1. Overview

This project is a lightweight task management application with a FastAPI backend, TypeScript React frontend, and Docker Compose runtime.

The original prompt asked for basic task creation, completion, deletion, statistics, login, and activity logs. The implementation keeps those required behaviors and adds a richer operational task-management layer: task priority, multi-state status, tags, target dates, tag filtering, sorting, activity history, and a table-oriented UI.

The design goal is a small take-home that still looks production-shaped: typed API contracts, request validation, centralized auth handling, an isolated in-memory repository, Dockerized local development, and meaningful tests across backend, frontend, contract, concurrency, and browser workflows.

## 2. Goals

- Build a RESTful backend that supports task creation, listing, detail, update, completion, deletion, statistics, activity history, and login.
- Support enriched task metadata:
  - `status`: `pending`, `in_progress`, `completed`
  - `priority`: `low`, `medium`, `high`
  - `tags`: list of strings
  - `target_date`: optional due date
- Keep `completed` as a derived response field for compatibility with the original prompt.
- Build a React TypeScript frontend with login, protected routes, paginated task table, task creation, inline editing, filters, sorting, statistics, and task detail views.
- Require authenticated API requests after login.
- Package backend and frontend with Docker and run both with `docker-compose up --build`.
- Include a README with setup instructions, assumptions, tradeoffs, and test commands.
- Include tests that demonstrate backend behavior, frontend behavior, API contract alignment, concurrency behavior, and one end-to-end browser workflow.

## 3. Non-Goals

- Persistent database storage.
- Multi-user task ownership.
- Password hashing or production identity management.
- Token expiration or refresh-token flows.
- Full observability stack.
- Production deployment configuration.
- CI pipeline implementation.

These are intentionally excluded to keep the assessment scoped while preserving clear replacement points for future production work.

## 4. Technology Choices

### Backend

- Python 3.12
- FastAPI
- Pydantic
- Uvicorn
- Pytest

FastAPI provides typed request/response validation, automatic OpenAPI documentation, concise route definitions, and straightforward testability.

### Frontend

- React
- TypeScript
- Vite
- React Router
- Native `fetch` wrapped in a typed API client
- Plain CSS
- Vitest and React Testing Library
- Playwright

The frontend stack stays lightweight while supporting type safety, component tests, browser-level tests, and fast local iteration.

### Runtime

- Docker
- Docker Compose

The backend is exposed on port `3001`. The frontend is exposed on port `3000`.

## 5. Repository Structure

```text
backend/
  app/
    __init__.py
    main.py
    auth.py
    models.py
    schemas.py
    store.py
    routes/
      __init__.py
      auth.py
      tasks.py
  tests/
    conftest.py
    test_auth.py
    test_tasks.py
    test_contract.py
    test_store_concurrency.py
  Dockerfile
  pyproject.toml
  uv.lock

frontend/
  e2e/
    task-flow.spec.ts
  src/
    api/
      client.ts
      auth.ts
      tasks.ts
      types.ts
    auth/
      AuthContext.tsx
    components/
      AppShell.tsx
      ErrorState.tsx
      LoadingState.tsx
      StatsPanel.tsx
      TaskForm.tsx
      TaskForm.test.tsx
      TaskRow.tsx
    pages/
      LoginPage.tsx
      TaskListPage.tsx
      TaskListPage.test.tsx
      TaskDetailPage.tsx
      TaskDetailPage.test.tsx
    test/
      factories.ts
      setup.ts
    utils/
      date.ts
    App.tsx
    main.tsx
    styles.css
  Dockerfile
  index.html
  package.json
  package-lock.json
  playwright.config.ts
  tsconfig.json
  vite.config.ts

docker-compose.yml
README.md
TECHNICAL_DESIGN.md
```

## 6. Backend Design

### Domain Model

Tasks are represented internally by immutable dataclasses in `backend/app/models.py`.

```json
{
  "id": "string",
  "title": "string",
  "status": "pending",
  "priority": "medium",
  "tags": ["Data", "Infra"],
  "target_date": "2026-06-01",
  "completed": false,
  "created_at": "2026-05-21T10:30:00Z",
  "updated_at": "2026-05-21T10:30:00Z"
}
```

`completed` is a derived compatibility field:

- `status == "completed"` means `completed == true`
- any other status means `completed == false`

This preserves the original prompt contract while allowing a richer workflow.

### Activity Model

Each task has an activity log.

```json
{
  "id": "activity-1",
  "task_id": "task-1",
  "event_type": "status_changed",
  "timestamp": "2026-05-21T10:31:00Z",
  "old_status": "pending",
  "new_status": "completed",
  "old_title": null,
  "new_title": null
}
```

Recorded activity includes:

- task creation
- title updates
- status changes
- deletion

The activity schema keeps nullable title/status fields because different activity event types change different fields.

### Storage

Tasks are stored in an in-memory repository:

- `dict[str, Task]` for task records
- `dict[str, list[ActivityEntry]]` for activity logs

The state is isolated in `TaskStore`, not spread through route handlers. This gives a clear replacement path for SQLite, Postgres, Redis, or another durable backend later.

The store uses `RLock` to protect in-memory mutations. This is not a substitute for real database transaction isolation, but it makes the in-process store safer and testable under concurrent access.

### Auth

`POST /auth/login` accepts:

```json
{
  "email": "demo@carbonarc.local",
  "password": "password123"
}
```

On success:

```json
{
  "token": "demo-token",
  "token_type": "bearer"
}
```

All task endpoints require:

```http
Authorization: Bearer demo-token
```

This is demo-only auth. It proves the login/token/protected-route integration, but it is not production security because the token is static, never expires, and is not signed.

## 7. API Contract

### `POST /auth/login`

Logs in with demo credentials.

Responses:

- `200`: token response
- `401`: invalid credentials
- `422`: invalid request shape

### `GET /tasks`

Lists paginated tasks.

Query parameters:

- `page`: default `1`
- `page_size`: default `10`, max `50`
- `status`: `all`, `pending`, `in_progress`, or `completed`
- `search`: optional search across title and tags
- `tag`: optional comma-separated list of required tags
- `sort_by`: `created_at`, `target_date`, `status`, or `priority`
- `sort_order`: `asc` or `desc`

Tag filtering uses all-tags matching. For example:

```http
GET /tasks?tag=Data,Infra
```

returns only tasks that include both `Data` and `Infra`.

Response:

```json
{
  "items": [
    {
      "id": "task-1",
      "title": "Write report",
      "status": "in_progress",
      "priority": "high",
      "tags": ["Data", "Infra"],
      "target_date": "2026-06-01",
      "completed": false,
      "created_at": "2026-05-21T10:30:00Z",
      "updated_at": "2026-05-21T10:35:00Z"
    }
  ],
  "page": 1,
  "page_size": 10,
  "total": 1,
  "total_pages": 1
}
```

### `POST /tasks`

Creates a task.

Request:

```json
{
  "title": "Write report",
  "priority": "high",
  "tags": ["Data", "Infra"],
  "target_date": "2026-06-01"
}
```

Validation:

- `title` is required
- `title` must not be blank
- `title` max length is 160 characters
- `priority` must be `low`, `medium`, or `high`
- `tags` max length is 8
- `target_date` is optional

Responses:

- `201`: created task
- `401`: missing or invalid token
- `422`: invalid request

### `GET /tasks/{id}`

Returns task detail.

Responses:

- `200`: task
- `401`: missing or invalid token
- `404`: task not found

### `PATCH /tasks/{id}`

Updates editable task fields.

Request:

```json
{
  "title": "Updated title",
  "status": "in_progress",
  "priority": "medium",
  "tags": ["Metrics"],
  "target_date": "2026-06-10"
}
```

All fields are optional. This endpoint was added because the frontend requirements include editing, while the original backend endpoint table omitted a general update endpoint.

Responses:

- `200`: updated task
- `401`: missing or invalid token
- `404`: task not found
- `422`: invalid request

### `PUT /tasks/{id}/complete`

Marks a task as completed.

This preserves the original required endpoint.

### `PUT /tasks/{id}/toggle`

Toggles a task between `completed` and `pending`.

This is an additive convenience endpoint used by the detail page.

### `DELETE /tasks/{id}`

Deletes a task.

Responses:

- `204`: deleted
- `401`: missing or invalid token
- `404`: task not found

### `GET /tasks/stats`

Returns aggregate task stats.

```json
{
  "total": 10,
  "completed": 4,
  "in_progress": 2,
  "pending": 4
}
```

### `GET /tasks/{id}/activity`

Returns activity entries for a task.

Responses:

- `200`: activity log
- `401`: missing or invalid token
- `404`: task not found

## 8. Error Handling

Backend error strategy:

- `401` for missing or invalid auth
- `404` for unknown task IDs
- `422` for invalid request payloads

Example:

```json
{
  "detail": "Task not found"
}
```

The frontend API client normalizes failed responses into an `ApiError` with `status` and `message`. Pages display user-facing error states and clear auth state on `401`.

## 9. Frontend Design

### Routes

- `/login`: login page
- `/tasks`: main task table
- `/tasks/:id`: task detail page
- `/`: redirects to `/tasks` when authenticated, otherwise `/login`

### Auth Flow

1. User submits email and password on `/login`.
2. Frontend calls `POST /auth/login`.
3. Token is stored in `localStorage`.
4. User is redirected to `/tasks`.
5. API client attaches `Authorization: Bearer <token>`.
6. On `401`, token is cleared and protected routes return to login.

### Task List Page

The task list page includes:

- statistics panel for total, completed, in-progress, and pending tasks
- task creation form with title, target date, priority, and comma-separated tags
- paginated table
- search by title/tag
- status filter
- comma-separated all-tags filter
- sort controls for due date, status, priority, and created date
- inline title editing
- inline status and priority updates
- delete action
- loading, error, and empty states
- clickable task title linking to detail

The tag filter is intentionally applied only on submit. This avoids refetching while a user is halfway through typing a comma-separated list.

### Task Detail Page

The task detail page includes:

- task title
- status badge
- created time
- updated time
- target date
- editable title
- editable status
- editable priority
- editable tags
- editable target date
- completion toggle
- delete action
- activity timeline

After mutations, the page refetches task and activity data. This keeps the UI consistent without implementing optimistic update rollback logic.

### UI Direction

The list view is intentionally styled as a dense operational table inspired by project/task management tools:

- muted column headers
- compact rows
- status pills
- priority pills
- tag chips
- compact Edit/Delete controls
- no marketing hero or landing page

## 10. Docker Design

### Backend Dockerfile

- Uses a slim Python base image
- Installs dependencies from `pyproject.toml`
- Runs Uvicorn on `0.0.0.0:3001`

### Frontend Dockerfile

- Uses a Node base image
- Installs npm dependencies
- Runs Vite dev server on `0.0.0.0:3000`

### Compose

`docker-compose.yml` defines:

- `backend`
  - build: `./backend`
  - port: `3001:3001`
  - volume: `./backend:/app`
  - command: Uvicorn with `--reload`
  - healthcheck: `/healthz`
- `frontend`
  - build: `./frontend`
  - port: `3000:3000`
  - volume: `./frontend:/app`
  - anonymous volume: `/app/node_modules`
  - environment: `VITE_API_BASE_URL=http://localhost:3001`
  - depends on healthy backend

Vite dev server in Docker is good for local take-home review and fast iteration. A production deployment would build static assets and serve them from Nginx, a CDN, or a backend static server.

## 11. Testing Plan

### Implemented Tests

Backend tests:

- login succeeds with valid credentials
- login fails with invalid credentials
- task endpoints reject missing or invalid auth
- task create/list/detail
- missing task returns `404`
- task completion updates status, stats, and activity
- task deletion updates stats
- task title updates record activity
- task status, priority, tags, and target date updates
- search across title/tags
- all-tags filtering
- due-date sorting
- API response contract checks against frontend TypeScript response fields
- concurrent task creation
- concurrent status updates

Frontend component tests:

- Add button disabled until a non-blank title is entered
- task list renders stats/table/pagination
- task creation payload includes metadata
- row edit hides delete while editing
- status update from table row
- delete from table row
- empty state
- tag filter applies only after submit
- detail page renders metadata and activity
- detail page saves edits, toggles completion, handles delete, and shows load errors

Playwright E2E:

- login
- create task with priority, target date, and tags
- open detail
- edit title
- mark complete
- verify status activity
- delete task

### Commands

```bash
cd backend
uv run --extra dev python -m pytest -q
```

```bash
cd frontend
npm test
npm run build
npm run test:e2e
```

## 12. Assumptions and Simplifications

- The app uses a single demo account.
- Tokens are static demo tokens, not signed JWTs.
- Tasks are global, not user-specific.
- Data resets when the backend process restarts.
- In-memory storage is acceptable because the prompt explicitly allows it.
- `PATCH /tasks/{id}` is added because editing is required by the frontend.
- `PUT /tasks/{id}/toggle` is added for UI convenience while keeping the required complete endpoint.
- Frontend TypeScript response types are maintained manually, with contract tests to reduce drift.
- The Docker frontend uses Vite dev server for reviewer convenience, not production serving.

## 13. Risks and Mitigations

### Risk: In-memory store is not durable

Mitigation: Keep all state changes behind `TaskStore` so a durable repository can replace it later.

### Risk: Static token auth is not production auth

Mitigation: Keep auth isolated in `auth.py` and expose it through a FastAPI dependency so JWT/session auth can replace it later.

### Risk: Frontend and backend API contracts drift

Mitigation: Centralize frontend API types and calls under `frontend/src/api`, and add contract tests against backend OpenAPI response schemas.

### Risk: Refetch-after-mutation can feel less instant than optimistic updates

Mitigation: Use refetching for correctness and simplicity in this scoped assessment. Optimistic updates with rollback could be added later.

### Risk: Vite dev server is not production serving

Mitigation: Use it for local review only. A production Dockerfile would build `dist/` and serve static files through Nginx or a CDN-backed host.

## 14. Future Improvements

The following are not implemented and are intentionally listed as future work:

- More Playwright coverage for pagination, filters, auth redirects, and failed API requests.
- Visual regression checks for task list/detail layouts.
- More contract tests for request payloads, not just response schemas.
- Race-condition tests around simultaneous edits and deletes.
- Token expiration and refresh behavior.
- Persistent storage behind the existing store boundary, likely SQLite for local simplicity.
- Structured request logging and request IDs on the backend.
- Optimistic UI updates with rollback on mutation failures.
- CI that runs backend, component, contract, and Playwright tests on every pull request.

## 15. Success Criteria

The submission is successful when:

- `docker-compose up --build` starts both services.
- Frontend is available at `http://localhost:3000`.
- Backend is available at `http://localhost:3001`.
- User can log in with demo credentials.
- User can create, view, edit, complete, and delete tasks.
- User can set status, priority, target date, and tags.
- User can search, filter by all requested tags, filter by status, and sort tasks.
- Stats update correctly.
- Activity logs update correctly.
- Protected API routes reject missing or invalid tokens.
- Backend tests pass.
- Frontend component tests pass.
- Playwright E2E passes.
- README explains setup, assumptions, tests, and tradeoffs.
