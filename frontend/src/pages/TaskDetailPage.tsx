import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiError } from "../api/client";
import {
  deleteTask,
  getTask,
  getTaskActivity,
  toggleTask,
  updateTask,
} from "../api/tasks";
import type { ActivityEntry, Task, TaskPriority, TaskStatus } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { formatDate, formatDateTime } from "../utils/date";

/** Detail page for editing one task and reading its activity timeline. */
export function TaskDetailPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { token, handleApiError } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftPriority, setDraftPriority] = useState<TaskPriority>("medium");
  const [draftTargetDate, setDraftTargetDate] = useState("");
  const [draftTags, setDraftTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!token || !taskId) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Detail and activity are fetched together so the page reflects one
      // backend snapshot after every mutation.
      const [taskResponse, activityResponse] = await Promise.all([
        getTask(token, taskId),
        getTaskActivity(token, taskId),
      ]);
      setTask(taskResponse);
      setDraftTitle(taskResponse.title);
      setDraftPriority(taskResponse.priority);
      setDraftTargetDate(taskResponse.target_date ?? "");
      setDraftTags(taskResponse.tags.join(", "));
      setActivity(activityResponse.items);
    } catch (caught) {
      handleApiError(caught);
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to load task. Check the backend and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [handleApiError, taskId, token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function saveTitle() {
    if (!token || !taskId || !task) {
      return;
    }
    const trimmed = draftTitle.trim();
    const nextTags = draftTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (
      !trimmed ||
      (trimmed === task.title &&
        draftPriority === task.priority &&
        draftTargetDate === (task.target_date ?? "") &&
        nextTags.join(",") === task.tags.join(","))
    ) {
      // Avoid a no-op API request and reset accidental whitespace edits.
      setDraftTitle(task.title);
      return;
    }

    await mutateAndReload(() =>
      updateTask(token, taskId, {
        title: trimmed,
        priority: draftPriority,
        target_date: draftTargetDate || null,
        tags: nextTags,
      }),
    );
  }

  async function mutateAndReload(action: () => Promise<unknown>) {
    setIsSaving(true);
    setError(null);
    try {
      await action();
      await loadData();
    } catch (caught) {
      handleApiError(caught);
      setError(caught instanceof ApiError ? caught.message : "Unable to update task.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!token || !taskId) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await deleteTask(token, taskId);
      navigate("/tasks", { replace: true });
    } catch (caught) {
      handleApiError(caught);
      setError(caught instanceof ApiError ? caught.message : "Unable to delete task.");
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <LoadingState label="Loading task" />;
  }

  if (!task) {
    return (
      <div className="page-stack">
        <ErrorState message={error ?? "Task not found"} onRetry={loadData} />
        <Link className="button subtle fit" to="/tasks">
          Back to tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="detail-header">
        <Link className="back-link" to="/tasks">
          Back to tasks
        </Link>
        <div className="detail-title-row">
          <div>
            <h1>{task.title}</h1>
            <p>Created {formatDateTime(task.created_at)}</p>
          </div>
          <span className={`badge large ${task.status}`}>
            {statusLabel(task.status)}
          </span>
        </div>
      </section>

      {error ? <ErrorState message={error} onRetry={loadData} /> : null}

      <section className="detail-grid">
        <form
          className="detail-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void saveTitle();
          }}
        >
          <h2>Task</h2>
          <label>
            Title
            <input
              maxLength={160}
              onChange={(event) => setDraftTitle(event.target.value)}
              value={draftTitle}
            />
          </label>
          <div className="detail-form-grid">
            <label>
              Status
              <select
                onChange={(event) =>
                  mutateAndReload(() =>
                    updateTask(token!, task.id, {
                      status: event.target.value as TaskStatus,
                    }),
                  )
                }
                value={task.status}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <label>
              Priority
              <select
                onChange={(event) =>
                  setDraftPriority(event.target.value as TaskPriority)
                }
                value={draftPriority}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label>
              Target date
              <input
                onChange={(event) => setDraftTargetDate(event.target.value)}
                type="date"
                value={draftTargetDate}
              />
            </label>
            <label>
              Tags
              <input
                onChange={(event) => setDraftTags(event.target.value)}
                placeholder="Marketing, Metrics"
                value={draftTags}
              />
            </label>
          </div>
          <dl className="detail-metadata">
            <div>
              <dt>Created</dt>
              <dd>{formatDateTime(task.created_at)}</dd>
            </div>
            <div>
              <dt>Target</dt>
              <dd>{formatDate(task.target_date)}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{formatDateTime(task.updated_at)}</dd>
            </div>
          </dl>
          <div className="action-row">
            <button className="button primary" disabled={isSaving} type="submit">
              Save task
            </button>
            <button
              className="button subtle"
              disabled={isSaving}
              onClick={() => mutateAndReload(() => toggleTask(token!, task.id))}
              type="button"
            >
              {task.completed ? "Mark pending" : "Mark complete"}
            </button>
            <button
              className="button danger"
              disabled={isSaving}
              onClick={handleDelete}
              type="button"
            >
              Delete
            </button>
          </div>
        </form>

        <section className="detail-panel">
          <h2>Activity</h2>
          {activity.length === 0 ? (
            <p className="muted">No activity recorded.</p>
          ) : (
            <ol className="activity-list">
              {activity.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <strong>{activityLabel(entry)}</strong>
                    <span>{formatDateTime(entry.timestamp)}</span>
                  </div>
                  <p>{activityDetail(entry)}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </section>
    </div>
  );
}

function activityLabel(entry: ActivityEntry): string {
  switch (entry.event_type) {
    case "created":
      return "Task created";
    case "title_updated":
      return "Title updated";
    case "completed_changed":
    case "status_changed":
      return "Status changed";
    case "deleted":
      return "Task deleted";
    default:
      return entry.event_type;
  }
}

/** Convert an audit entry into compact timeline copy. */
function activityDetail(entry: ActivityEntry): string {
  // Activity entries are intentionally generic on the backend; this function
  // turns them into compact human-readable timeline copy.
  if (entry.event_type === "title_updated") {
    return `"${entry.old_title ?? ""}" changed to "${entry.new_title ?? ""}".`;
  }

  if (entry.old_status !== null || entry.new_status !== null) {
    const oldStatus = entry.old_status ? statusLabel(entry.old_status) : "";
    const newStatus = entry.new_status ? statusLabel(entry.new_status) : "";
    if (entry.old_status === null) {
      return `Initial status: ${newStatus}.`;
    }
    return `${oldStatus} changed to ${newStatus}.`;
  }

  return "No field-level change recorded.";
}

/** Human-facing status labels for badges, selects, and activity text. */
function statusLabel(status: TaskStatus): string {
  if (status === "in_progress") {
    return "In Progress";
  }
  return status[0].toUpperCase() + status.slice(1);
}
