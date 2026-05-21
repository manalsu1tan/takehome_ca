from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ErrorResponse(BaseModel):
    """Shared shape for explicit API error responses."""

    detail: str


class LoginRequest(BaseModel):
    """Credentials accepted by the demo login endpoint."""

    email: str = Field(min_length=3, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    """Bearer token returned after successful login."""

    token: str
    token_type: Literal["bearer"] = "bearer"


TaskPriority = Literal["low", "medium", "high"]
TaskStatus = Literal["pending", "in_progress", "completed"]


class TaskCreate(BaseModel):
    """Payload for creating a task with optional planning metadata."""

    title: str = Field(min_length=1, max_length=160)
    priority: TaskPriority = "medium"
    tags: list[str] = Field(default_factory=list, max_length=8)
    target_date: date | None = None


class TaskUpdate(BaseModel):
    """Partial task update payload used by detail and table edits."""

    title: str | None = Field(default=None, min_length=1, max_length=160)
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    tags: list[str] | None = Field(default=None, max_length=8)
    target_date: date | None = None


class TaskResponse(BaseModel):
    """Public task representation returned to the frontend."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    status: TaskStatus
    priority: TaskPriority
    tags: list[str]
    target_date: date | None
    completed: bool
    created_at: datetime
    updated_at: datetime


class TaskListResponse(BaseModel):
    """Paginated task list response."""

    items: list[TaskResponse]
    page: int
    page_size: int
    total: int
    total_pages: int


class TaskStatsResponse(BaseModel):
    """Aggregate task counts for the dashboard stats panel."""

    total: int
    completed: int
    in_progress: int
    pending: int


class ActivityEntryResponse(BaseModel):
    """Public audit entry for a task timeline."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str
    event_type: str
    timestamp: datetime
    old_status: TaskStatus | None = None
    new_status: TaskStatus | None = None
    old_title: str | None = None
    new_title: str | None = None


class ActivityListResponse(BaseModel):
    """Activity timeline response for one task."""

    items: list[ActivityEntryResponse]
