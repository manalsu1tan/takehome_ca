import type { ActivityEntry, Task } from "../api/types";

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Write report",
    status: "pending",
    priority: "medium",
    tags: ["Marketing"],
    target_date: "2026-05-30",
    completed: false,
    created_at: "2026-05-21T14:00:00Z",
    updated_at: "2026-05-21T14:05:00Z",
    ...overrides,
  };
}

export function makeActivity(
  overrides: Partial<ActivityEntry> = {},
): ActivityEntry {
  return {
    id: "activity-1",
    task_id: "task-1",
    event_type: "created",
    timestamp: "2026-05-21T14:00:00Z",
    old_status: null,
    new_status: "pending",
    old_title: null,
    new_title: "Write report",
    ...overrides,
  };
}
