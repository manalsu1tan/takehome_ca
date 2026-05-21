import { useState } from "react";
import { Link } from "react-router-dom";

import type { Task, TaskPriority, TaskStatus } from "../api/types";
import { formatDate } from "../utils/date";

/**
 * One row in the task table.
 *
 * Status and priority update immediately through select controls; title edits
 * use an explicit Save/Cancel flow to avoid accidental renames.
 */
export function TaskRow({
  task,
  onDelete,
  onUpdate,
}: {
  task: Task;
  onDelete: (taskId: string) => Promise<void>;
  onUpdate: (
    taskId: string,
    input: Partial<{
      title: string;
      status: TaskStatus;
      priority: TaskPriority;
      tags: string[];
      target_date: string | null;
    }>,
  ) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [isBusy, setIsBusy] = useState(false);

  async function handleSave() {
    const trimmed = draftTitle.trim();
    if (!trimmed || trimmed === task.title) {
      setDraftTitle(task.title);
      setIsEditing(false);
      return;
    }

    setIsBusy(true);
    try {
      await onUpdate(task.id, { title: trimmed });
      setIsEditing(false);
    } finally {
      setIsBusy(false);
    }
  }

  async function runAction(action: () => Promise<void>) {
    setIsBusy(true);
    try {
      await action();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <article className="task-row">
      <div className="task-main-cell">
        {isEditing ? (
          <input
            autoFocus
            className="inline-input"
            maxLength={160}
            onChange={(event) => setDraftTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleSave();
              }
              if (event.key === "Escape") {
                setDraftTitle(task.title);
                setIsEditing(false);
              }
            }}
            value={draftTitle}
          />
        ) : (
          <Link className="task-link" to={`/tasks/${task.id}`}>
            {task.title}
          </Link>
        )}
      </div>

      <select
        aria-label={`Status for ${task.title}`}
        className={`table-select status-select ${task.status}`}
        disabled={isBusy}
        onChange={(event) =>
          runAction(() =>
            onUpdate(task.id, { status: event.target.value as TaskStatus }),
          )
        }
        value={task.status}
      >
        <option value="pending">Pending</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
      </select>

      <span className="table-date">{formatDate(task.target_date)}</span>

      <select
        aria-label={`Priority for ${task.title}`}
        className={`table-select priority-select ${task.priority}`}
        disabled={isBusy}
        onChange={(event) =>
          runAction(() =>
            onUpdate(task.id, { priority: event.target.value as TaskPriority }),
          )
        }
        value={task.priority}
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      <div className="tag-list">
        {task.tags.length ? (
          task.tags.map((tag) => (
            <span className="tag-chip" key={tag}>
              {tag}
            </span>
          ))
        ) : (
          <span className="muted">No tags</span>
        )}
      </div>

      <div className="task-actions">
        {isEditing ? (
          <>
            <button
              className="button subtle"
              disabled={isBusy}
              onClick={handleSave}
              type="button"
            >
              Save
            </button>
            <button
              className="button ghost"
              disabled={isBusy}
              onClick={() => {
                setDraftTitle(task.title);
                setIsEditing(false);
              }}
              type="button"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            className="button subtle"
            disabled={isBusy}
            onClick={() => setIsEditing(true)}
            type="button"
          >
            Edit
          </button>
        )}
        {!isEditing ? (
          <button
            className="button danger"
            disabled={isBusy}
            onClick={() => runAction(() => onDelete(task.id))}
            type="button"
          >
            Delete
          </button>
        ) : null}
      </div>
    </article>
  );
}
