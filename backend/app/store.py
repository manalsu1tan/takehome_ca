from __future__ import annotations

from datetime import UTC, date, datetime
from math import ceil
from threading import RLock
from uuid import uuid4

from app.models import ActivityEntry, Task, TaskPriority, TaskStatus


class TaskNotFoundError(Exception):
    """Raised when a route or service asks for a missing task."""
    pass


class TaskStore:
    """Thread-safe in-memory repository for tasks and activity entries.

    The app intentionally uses memory storage for the take-home, but keeping all
    state changes behind this class makes the route layer look like it would with
    a real repository backed by SQLite, Postgres, Redis, or another service.
    """

    def __init__(self) -> None:
        self._tasks: dict[str, Task] = {}
        self._activity: dict[str, list[ActivityEntry]] = {}
        self._lock = RLock()

    def reset(self) -> None:
        """Clear all state; used by tests to isolate cases."""

        with self._lock:
            self._tasks.clear()
            self._activity.clear()

    def create_task(
        self,
        title: str,
        *,
        priority: TaskPriority = "medium",
        tags: list[str] | None = None,
        target_date: date | None = None,
    ) -> Task:
        """Create a pending task and record the first activity entry."""

        now = self._now()
        task = Task(
            id=str(uuid4()),
            title=title.strip(),
            status="pending",
            priority=priority,
            tags=tuple(self._normalize_tags(tags or [])),
            target_date=target_date,
            created_at=now,
            updated_at=now,
        )
        with self._lock:
            self._tasks[task.id] = task
            self._activity[task.id] = [
                self._activity_entry(
                    task_id=task.id,
                    event_type="created",
                    new_status=task.status,
                    new_title=task.title,
                )
            ]
        return task

    def list_tasks(
        self,
        *,
        page: int,
        page_size: int,
        status_filter: str = "all",
        search: str | None = None,
        tags: list[str] | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> tuple[list[Task], int, int]:
        """Return a filtered page of tasks plus total counts for pagination."""

        with self._lock:
            tasks = list(self._tasks.values())

        if status_filter != "all":
            tasks = [task for task in tasks if task.status == status_filter]

        if tags:
            required_tags = {tag.strip().casefold() for tag in tags if tag.strip()}
            tasks = [
                task
                for task in tasks
                if required_tags.issubset(
                    {task_tag.casefold() for task_tag in task.tags}
                )
            ]

        if search:
            normalized_search = search.casefold()
            tasks = [
                task
                for task in tasks
                if normalized_search in task.title.casefold()
                or any(normalized_search in tag.casefold() for tag in task.tags)
            ]

        tasks.sort(
            key=self._sort_key(sort_by),
            reverse=sort_order == "desc",
        )
        total = len(tasks)
        total_pages = ceil(total / page_size) if total else 0
        start = (page - 1) * page_size
        end = start + page_size
        return tasks[start:end], total, total_pages

    def get_task(self, task_id: str) -> Task:
        """Return one task or raise TaskNotFoundError."""

        with self._lock:
            task = self._tasks.get(task_id)
        if task is None:
            raise TaskNotFoundError(task_id)
        return task

    def update_task(
        self,
        task_id: str,
        *,
        title: str | None = None,
        status: TaskStatus | None = None,
        priority: TaskPriority | None = None,
        tags: list[str] | None = None,
        target_date: date | None = None,
    ) -> Task:
        """Update task fields and append activity entries for changed values."""

        with self._lock:
            task = self._tasks.get(task_id)
            if task is None:
                raise TaskNotFoundError(task_id)

            next_title = title.strip() if title is not None else task.title
            next_status = status if status is not None else task.status
            next_tags = (
                tuple(self._normalize_tags(tags)) if tags is not None else task.tags
            )
            updated = Task(
                id=task.id,
                title=next_title,
                status=next_status,
                priority=priority if priority is not None else task.priority,
                tags=next_tags,
                target_date=target_date if target_date is not None else task.target_date,
                created_at=task.created_at,
                updated_at=self._now(),
            )
            self._tasks[task_id] = updated

            if task.title != updated.title:
                self._activity[task_id].append(
                    self._activity_entry(
                        task_id=task_id,
                        event_type="title_updated",
                        old_status=task.status,
                        new_status=updated.status,
                        old_title=task.title,
                        new_title=updated.title,
                    )
                )
            if task.status != updated.status:
                self._activity[task_id].append(
                    self._activity_entry(
                        task_id=task_id,
                        event_type="status_changed",
                        old_status=task.status,
                        new_status=updated.status,
                    )
                )
            return updated

    def update_task_title(self, task_id: str, title: str) -> Task:
        """Update a task title and append a title change activity entry."""

        return self.update_task(task_id, title=title)

    def complete_task(self, task_id: str) -> Task:
        """Mark a task complete."""

        return self._set_status(task_id, "completed")

    def toggle_task(self, task_id: str) -> Task:
        """Flip completion status for the frontend's toggle action."""

        task = self.get_task(task_id)
        return self._set_status(
            task_id,
            "pending" if task.status == "completed" else "completed",
        )

    def delete_task(self, task_id: str) -> None:
        """Delete a task after recording a final activity entry."""

        with self._lock:
            task = self._tasks.get(task_id)
            if task is None:
                raise TaskNotFoundError(task_id)
            self._activity[task_id].append(
                self._activity_entry(
                    task_id=task_id,
                    event_type="deleted",
                    old_status=task.status,
                    new_status=task.status,
                    old_title=task.title,
                )
            )
            del self._tasks[task_id]

    def get_stats(self) -> dict[str, int]:
        """Calculate total, completed, and pending task counts."""

        with self._lock:
            total = len(self._tasks)
            completed = sum(1 for task in self._tasks.values() if task.completed)
            in_progress = sum(
                1 for task in self._tasks.values() if task.status == "in_progress"
            )
            pending = sum(1 for task in self._tasks.values() if task.status == "pending")
        return {
            "total": total,
            "completed": completed,
            "in_progress": in_progress,
            "pending": pending,
        }

    def get_activity(self, task_id: str) -> list[ActivityEntry]:
        """Return activity for an existing task."""

        with self._lock:
            if task_id not in self._tasks:
                raise TaskNotFoundError(task_id)
            return list(self._activity.get(task_id, []))

    def _set_status(self, task_id: str, status: TaskStatus) -> Task:
        """Shared status update path used by complete and toggle endpoints."""

        with self._lock:
            task = self._tasks.get(task_id)
            if task is None:
                raise TaskNotFoundError(task_id)

            updated = Task(
                id=task.id,
                title=task.title,
                status=status,
                priority=task.priority,
                tags=task.tags,
                target_date=task.target_date,
                created_at=task.created_at,
                updated_at=self._now(),
            )
            self._tasks[task_id] = updated
            self._activity[task_id].append(
                self._activity_entry(
                    task_id=task_id,
                    event_type="status_changed",
                    old_status=task.status,
                    new_status=updated.status,
                )
            )
            return updated

    @staticmethod
    def _activity_entry(
        *,
        task_id: str,
        event_type: str,
        old_status: TaskStatus | None = None,
        new_status: TaskStatus | None = None,
        old_title: str | None = None,
        new_title: str | None = None,
    ) -> ActivityEntry:
        """Build a timestamped activity entry with only relevant fields set."""

        return ActivityEntry(
            id=str(uuid4()),
            task_id=task_id,
            event_type=event_type,
            timestamp=TaskStore._now(),
            old_status=old_status,
            new_status=new_status,
            old_title=old_title,
            new_title=new_title,
        )

    @staticmethod
    def _now() -> datetime:
        """Return timezone-aware UTC timestamps for API serialization."""

        return datetime.now(UTC)

    @staticmethod
    def _normalize_tags(tags: list[str]) -> list[str]:
        seen: set[str] = set()
        normalized: list[str] = []
        for tag in tags:
            cleaned = tag.strip()
            key = cleaned.casefold()
            if cleaned and key not in seen:
                seen.add(key)
                normalized.append(cleaned[:40])
        return normalized[:8]

    @staticmethod
    def _sort_key(sort_by: str):
        status_rank = {"pending": 0, "in_progress": 1, "completed": 2}
        priority_rank = {"high": 0, "medium": 1, "low": 2}

        if sort_by == "target_date":
            return lambda task: (task.target_date is None, task.target_date or date.max)
        if sort_by == "status":
            return lambda task: status_rank[task.status]
        if sort_by == "priority":
            return lambda task: priority_rank[task.priority]
        return lambda task: task.created_at


task_store = TaskStore()
