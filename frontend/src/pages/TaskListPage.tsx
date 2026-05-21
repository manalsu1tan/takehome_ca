import { useCallback, useEffect, useState } from "react";

import { ApiError } from "../api/client";
import {
  createTask,
  deleteTask,
  getTaskStats,
  listTasks,
  updateTask,
} from "../api/tasks";
import type {
  Task,
  TaskCreateInput,
  TaskSortBy,
  TaskStats,
  TaskStatusFilter,
  TaskUpdateInput,
  SortOrder,
} from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { StatsPanel } from "../components/StatsPanel";
import { TaskForm } from "../components/TaskForm";
import { TaskRow } from "../components/TaskRow";

const PAGE_SIZE = 6;

/** Main task workspace with stats, filters, sorting, pagination, and table edits. */
export function TaskListPage() {
  const { token, handleApiError } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [sortBy, setSortBy] = useState<TaskSortBy>("target_date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Load the list and aggregate stats together so the dashboard updates as
      // one coherent view after creates, edits, toggles, and deletes.
      const [taskResponse, statsResponse] = await Promise.all([
        listTasks(token, {
          page,
          pageSize: PAGE_SIZE,
          status: statusFilter,
          search,
          tag: tagFilter,
          sortBy,
          sortOrder,
        }),
        getTaskStats(token),
      ]);
      setTasks(taskResponse.items);
      setTotalPages(taskResponse.total_pages);
      setStats(statsResponse);
    } catch (caught) {
      handleApiError(caught);
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to load tasks. Check the backend and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [handleApiError, page, search, sortBy, sortOrder, statusFilter, tagFilter, token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCreate(input: TaskCreateInput) {
    if (!token) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await createTask(token, input);
      setPage(1);
      await loadData();
    } catch (caught) {
      handleApiError(caught);
      setError(caught instanceof ApiError ? caught.message : "Unable to add task.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function mutateAndReload(action: () => Promise<unknown>) {
    // Mutations are small and infrequent here, so a refetch keeps pagination,
    // filters, and stats consistent without duplicating backend logic.
    setError(null);
    try {
      await action();
      await loadData();
    } catch (caught) {
      handleApiError(caught);
      setError(caught instanceof ApiError ? caught.message : "Unable to update task.");
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="page-icon" aria-hidden="true">
            🎯
          </span>
          <h1>Tasks</h1>
          <p>Prioritize task work by status, due date, and tags.</p>
        </div>
      </section>

      <StatsPanel stats={stats} />

      <section className="toolbar">
        <TaskForm isSubmitting={isSubmitting} onSubmit={handleCreate} />
        <div className="filters">
          <input
            aria-label="Search tasks"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search"
            value={search}
          />
          <select
            aria-label="Task status filter"
            onChange={(event) => {
              setStatusFilter(event.target.value as TaskStatusFilter);
              setPage(1);
            }}
            value={statusFilter}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <form
            className="tag-filter-form"
            onSubmit={(event) => {
              event.preventDefault();
              // Tag filtering is exact/all-tags matching, so apply it only once
              // the user has finished typing the comma-separated list.
              setTagFilter(tagDraft.trim());
              setPage(1);
            }}
          >
            <input
              aria-label="Filter by tags"
              onChange={(event) => setTagDraft(event.target.value)}
              placeholder="Filter tags, comma separated"
              value={tagDraft}
            />
            <button className="button subtle" type="submit">
              Apply
            </button>
            {tagFilter ? (
              <button
                className="button ghost"
                onClick={() => {
                  setTagDraft("");
                  setTagFilter("");
                  setPage(1);
                }}
                type="button"
              >
                Clear
              </button>
            ) : null}
          </form>
          <select
            aria-label="Sort tasks"
            onChange={(event) => setSortBy(event.target.value as TaskSortBy)}
            value={sortBy}
          >
            <option value="target_date">Due date</option>
            <option value="status">Status</option>
            <option value="priority">Priority</option>
            <option value="created_at">Created</option>
          </select>
          <select
            aria-label="Sort order"
            onChange={(event) => setSortOrder(event.target.value as SortOrder)}
            value={sortOrder}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </section>

      {error ? <ErrorState message={error} onRetry={loadData} /> : null}

      {isLoading ? (
        <LoadingState label="Loading tasks" />
      ) : tasks.length === 0 ? (
        <section className="empty-state">
          <h2>No tasks found</h2>
          <p>Create a task or adjust your filters.</p>
        </section>
      ) : (
        <section className="task-table" aria-label="Task list">
          <div className="task-table-header">
            <span>Task name</span>
            <span>Status</span>
            <span>Due</span>
            <span>Priority</span>
            <span>Tags</span>
            <span>Actions</span>
          </div>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              onDelete={(taskId) =>
                mutateAndReload(() => deleteTask(token!, taskId))
              }
              onUpdate={(taskId, input: TaskUpdateInput) =>
                mutateAndReload(() => updateTask(token!, taskId, input))
              }
              task={task}
            />
          ))}
        </section>
      )}

      <section className="pagination" aria-label="Pagination">
        <button
          className="button subtle"
          disabled={page <= 1 || isLoading}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          type="button"
        >
          Previous
        </button>
        <span>
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <button
          className="button subtle"
          disabled={page >= totalPages || totalPages === 0 || isLoading}
          onClick={() => setPage((current) => current + 1)}
          type="button"
        >
          Next
        </button>
      </section>
    </div>
  );
}
