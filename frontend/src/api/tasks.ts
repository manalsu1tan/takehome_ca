import { apiRequest } from "./client";
import type {
  ActivityListResponse,
  Task,
  TaskCreateInput,
  TaskListResponse,
  TaskSortBy,
  TaskStats,
  TaskStatusFilter,
  TaskUpdateInput,
  SortOrder,
} from "./types";

export type ListTasksParams = {
  page: number;
  pageSize: number;
  status: TaskStatusFilter;
  search?: string;
  tag?: string;
  sortBy: TaskSortBy;
  sortOrder: SortOrder;
};

/**
 * Fetch a backend-filtered and sorted page of tasks.
 *
 * `tag` can contain a comma-separated list. The backend returns only tasks
 * containing every requested tag.
 */
export function listTasks(
  token: string,
  params: ListTasksParams,
): Promise<TaskListResponse> {
  // The backend owns pagination/filtering so the frontend can stay lightweight.
  const searchParams = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.pageSize),
    status: params.status,
    sort_by: params.sortBy,
    sort_order: params.sortOrder,
  });

  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }
  if (params.tag?.trim()) {
    searchParams.set("tag", params.tag.trim());
  }

  return apiRequest<TaskListResponse>(`/tasks?${searchParams.toString()}`, { token });
}

/** Create a task from the toolbar form payload. */
export function createTask(token: string, input: TaskCreateInput): Promise<Task> {
  return apiRequest<Task>("/tasks", {
    token,
    method: "POST",
    body: input,
  });
}

/** Fetch one task for the detail page. */
export function getTask(token: string, taskId: string): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}`, { token });
}

/** Convenience wrapper for the original title-only edit behavior. */
export function updateTaskTitle(
  token: string,
  taskId: string,
  title: string,
): Promise<Task> {
  return updateTask(token, taskId, { title });
}

/** Apply a partial task update, such as status, priority, tags, or due date. */
export function updateTask(
  token: string,
  taskId: string,
  input: TaskUpdateInput,
): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}`, {
    token,
    method: "PATCH",
    body: input,
  });
}

/** Preserve the required take-home endpoint for marking a task completed. */
export function completeTask(token: string, taskId: string): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}/complete`, {
    token,
    method: "PUT",
  });
}

/** Flip between completed and pending for the detail page action button. */
export function toggleTask(token: string, taskId: string): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}/toggle`, {
    token,
    method: "PUT",
  });
}

/** Delete a task and resolve after the backend returns 204. */
export function deleteTask(token: string, taskId: string): Promise<void> {
  return apiRequest<void>(`/tasks/${taskId}`, {
    token,
    method: "DELETE",
  });
}

/** Load aggregate counts for the task dashboard cards. */
export function getTaskStats(token: string): Promise<TaskStats> {
  return apiRequest<TaskStats>("/tasks/stats", { token });
}

/** Load the audit timeline shown on the detail page. */
export function getTaskActivity(
  token: string,
  taskId: string,
): Promise<ActivityListResponse> {
  return apiRequest<ActivityListResponse>(`/tasks/${taskId}/activity`, { token });
}
