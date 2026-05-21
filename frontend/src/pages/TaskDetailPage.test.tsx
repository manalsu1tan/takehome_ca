import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteTask,
  getTask,
  getTaskActivity,
  toggleTask,
  updateTask,
} from "../api/tasks";
import { makeActivity, makeTask } from "../test/factories";
import { TaskDetailPage } from "./TaskDetailPage";

const authMock = vi.hoisted(() => ({
  handleApiError: vi.fn(),
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({
    token: "demo-token",
    handleApiError: authMock.handleApiError,
  }),
}));

vi.mock("../api/tasks", () => ({
  deleteTask: vi.fn(),
  getTask: vi.fn(),
  getTaskActivity: vi.fn(),
  toggleTask: vi.fn(),
  updateTask: vi.fn(),
}));

const mockedDeleteTask = vi.mocked(deleteTask);
const mockedGetTask = vi.mocked(getTask);
const mockedGetTaskActivity = vi.mocked(getTaskActivity);
const mockedToggleTask = vi.mocked(toggleTask);
const mockedUpdateTask = vi.mocked(updateTask);

function renderDetailPage() {
  render(
    <MemoryRouter initialEntries={["/tasks/task-1"]}>
      <Routes>
        <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
        <Route path="/tasks" element={<div>Task list route</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TaskDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedGetTask.mockResolvedValue(makeTask());
    mockedGetTaskActivity.mockResolvedValue({
      items: [
        makeActivity(),
        makeActivity({
          id: "activity-2",
          event_type: "status_changed",
          old_status: "pending",
          new_status: "completed",
          new_title: null,
        }),
      ],
    });
    mockedUpdateTask.mockResolvedValue(makeTask({ title: "Updated report" }));
    mockedToggleTask.mockResolvedValue(makeTask({ completed: true, status: "completed" }));
    mockedDeleteTask.mockResolvedValue(undefined);
    authMock.handleApiError.mockClear();
  });

  it("renders task detail, status, timestamps, and activity states", async () => {
    renderDetailPage();

    expect(screen.getByText("Loading task")).toBeInTheDocument();

    expect(await screen.findByRole("heading", { name: "Write report" })).toBeInTheDocument();
    expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument();
    expect(screen.getByText("Task created")).toBeInTheDocument();
    expect(screen.getByText("Status changed")).toBeInTheDocument();
    expect(screen.getByText("Pending changed to Completed.")).toBeInTheDocument();
  });

  it("saves title edits and toggles completion", async () => {
    const user = userEvent.setup();
    renderDetailPage();

    const titleInput = await screen.findByDisplayValue("Write report");
    await user.clear(titleInput);
    await user.type(titleInput, "Updated report");
    await user.click(screen.getByRole("button", { name: "Save task" }));

    expect(mockedUpdateTask).toHaveBeenCalledWith(
      "demo-token",
      "task-1",
      {
        title: "Updated report",
        priority: "medium",
        target_date: "2026-05-30",
        tags: ["Marketing"],
      },
    );
    await waitFor(() => expect(mockedGetTask).toHaveBeenCalledTimes(2));

    await user.click(screen.getByRole("button", { name: "Mark complete" }));
    expect(mockedToggleTask).toHaveBeenCalledWith("demo-token", "task-1");
  });

  it("deletes the task and navigates back to the list", async () => {
    const user = userEvent.setup();
    renderDetailPage();

    await screen.findByRole("heading", { name: "Write report" });
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(mockedDeleteTask).toHaveBeenCalledWith("demo-token", "task-1");
    expect(await screen.findByText("Task list route")).toBeInTheDocument();
  });

  it("shows an error state when the task cannot be loaded", async () => {
    mockedGetTask.mockRejectedValueOnce(new Error("not found"));

    renderDetailPage();

    expect(await screen.findByText("Unable to load task. Check the backend and try again.")).toBeInTheDocument();
  });
});
