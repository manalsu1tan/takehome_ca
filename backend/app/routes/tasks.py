from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.auth import require_auth
from app.schemas import (
    ActivityListResponse,
    TaskCreate,
    TaskListResponse,
    TaskResponse,
    TaskStatsResponse,
    TaskUpdate,
)
from app.store import TaskNotFoundError, task_store


router = APIRouter(prefix="/tasks", tags=["tasks"], dependencies=[Depends(require_auth)])


def _not_found() -> HTTPException:
    """Normalize missing task errors across task routes."""

    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Task not found",
    )


@router.get("/stats", response_model=TaskStatsResponse)
def get_task_stats() -> TaskStatsResponse:
    """Return aggregate counts used by the frontend stats panel."""

    return TaskStatsResponse(**task_store.get_stats())


@router.get("", response_model=TaskListResponse)
def list_tasks(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    status_filter: Literal["all", "pending", "in_progress", "completed"] = Query(
        default="all",
        alias="status",
    ),
    search: str | None = Query(default=None, min_length=1, max_length=160),
    tag: str | None = Query(default=None, min_length=1, max_length=200),
    sort_by: Literal["created_at", "target_date", "status", "priority"] = "created_at",
    sort_order: Literal["asc", "desc"] = "desc",
) -> TaskListResponse:
    """List tasks with pagination, all-tags filtering, search, and sorting."""

    tag_filters = [value.strip() for value in (tag or "").split(",") if value.strip()]

    items, total, total_pages = task_store.list_tasks(
        page=page,
        page_size=page_size,
        status_filter=status_filter,
        search=search,
        tags=tag_filters,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return TaskListResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate) -> TaskResponse:
    """Create a new pending task."""

    task = task_store.create_task(
        payload.title,
        priority=payload.priority,
        tags=payload.tags,
        target_date=payload.target_date,
    )
    return TaskResponse.model_validate(task)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: str) -> TaskResponse:
    """Return detail for one task."""

    try:
        return TaskResponse.model_validate(task_store.get_task(task_id))
    except TaskNotFoundError as exc:
        raise _not_found() from exc


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(task_id: str, payload: TaskUpdate) -> TaskResponse:
    """Update editable task fields."""

    try:
        return TaskResponse.model_validate(
            task_store.update_task(
                task_id,
                title=payload.title,
                status=payload.status,
                priority=payload.priority,
                tags=payload.tags,
                target_date=payload.target_date,
            )
        )
    except TaskNotFoundError as exc:
        raise _not_found() from exc


@router.put("/{task_id}/complete", response_model=TaskResponse)
def complete_task(task_id: str) -> TaskResponse:
    """Mark a task as completed."""

    try:
        return TaskResponse.model_validate(task_store.complete_task(task_id))
    except TaskNotFoundError as exc:
        raise _not_found() from exc


@router.put("/{task_id}/toggle", response_model=TaskResponse)
def toggle_task(task_id: str) -> TaskResponse:
    """Toggle completion state for a smoother frontend interaction."""

    try:
        return TaskResponse.model_validate(task_store.toggle_task(task_id))
    except TaskNotFoundError as exc:
        raise _not_found() from exc


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: str) -> Response:
    """Delete a task."""

    try:
        task_store.delete_task(task_id)
    except TaskNotFoundError as exc:
        raise _not_found() from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{task_id}/activity", response_model=ActivityListResponse)
def get_task_activity(task_id: str) -> ActivityListResponse:
    """Return the activity timeline for one task."""

    try:
        return ActivityListResponse(items=task_store.get_activity(task_id))
    except TaskNotFoundError as exc:
        raise _not_found() from exc
