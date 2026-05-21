export type TokenResponse = {
  token: string;
  token_type: "bearer";
};

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  target_date: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export type TaskListResponse = {
  items: Task[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type TaskStats = {
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
};

export type ActivityEntry = {
  id: string;
  task_id: string;
  event_type: string;
  timestamp: string;
  old_status: TaskStatus | null;
  new_status: TaskStatus | null;
  old_title: string | null;
  new_title: string | null;
};

export type ActivityListResponse = {
  items: ActivityEntry[];
};

export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskStatusFilter = "all" | TaskStatus;
export type TaskSortBy = "created_at" | "target_date" | "status" | "priority";
export type SortOrder = "asc" | "desc";

export type TaskCreateInput = {
  title: string;
  priority: TaskPriority;
  tags: string[];
  target_date: string | null;
};

export type TaskUpdateInput = Partial<{
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  target_date: string | null;
}>;
