from dataclasses import dataclass
from datetime import date, datetime
from typing import Literal


TaskPriority = Literal["low", "medium", "high"]
TaskStatus = Literal["pending", "in_progress", "completed"]


@dataclass(frozen=True)
class Task:
    """Internal task record stored by the in-memory repository."""

    id: str
    title: str
    status: TaskStatus
    priority: TaskPriority
    tags: tuple[str, ...]
    target_date: date | None
    created_at: datetime
    updated_at: datetime

    @property
    def completed(self) -> bool:
        """Compatibility field for the original take-home contract."""

        return self.status == "completed"


@dataclass(frozen=True)
class ActivityEntry:
    """Audit entry describing how a task changed over time."""

    id: str
    task_id: str
    event_type: str
    timestamp: datetime
    old_status: TaskStatus | None = None
    new_status: TaskStatus | None = None
    old_title: str | None = None
    new_title: str | None = None
