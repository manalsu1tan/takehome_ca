import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTask,
  deleteTask,
  getTaskStats,
  listTasks,
  updateTask,
} from "../api/tasks";
import { makeTask } from "../test/factories";
import { TaskListPage } from "./TaskListPage";

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
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  getTaskStats: vi.fn(),
  listTasks: vi.fn(),
  updateTask: vi.fn(),
}));

const mockedListTasks = vi.mocked(listTasks);
const mockedGetTaskStats = vi.mocked(getTaskStats);
const mockedCreateTask = vi.mocked(createTask);
const mockedDeleteTask = vi.mocked(deleteTask);
const mockedUpdateTask = vi.mocked(updateTask);

describe("TaskListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedListTasks.mockResolvedValue({
      items: [makeTask()],
      page: 1,
      page_size: 6,
      total: 1,
      total_pages: 1,
    });
    mockedGetTaskStats.mockResolvedValue({
      total: 1,
      completed: 0,
      in_progress: 0,
      pending: 1,
    });
    mockedCreateTask.mockResolvedValue(makeTask({ id: "task-2", title: "New task" }));
    mockedDeleteTask.mockResolvedValue(undefined);
    mockedUpdateTask.mockResolvedValue(makeTask({ title: "Updated title" }));
    authMock.handleApiError.mockClear();
  });

  it("renders tasks, stats, and pagination state", async () => {
    render(
      <MemoryRouter>
        <TaskListPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Loading tasks")).toBeInTheDocument();

    expect(await screen.findByRole("link", { name: "Write report" })).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  });

  it("creates a task and reloads the list", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TaskListPage />
      </MemoryRouter>,
    );

    await screen.findByRole("link", { name: "Write report" });
    await user.type(screen.getByLabelText("New task title"), "Review dataset");
    await user.type(screen.getByLabelText("Target date"), "2026-06-10");
    await user.selectOptions(screen.getByLabelText("Priority"), "high");
    await user.type(screen.getByLabelText("Tags"), "Data, Infra");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(mockedCreateTask).toHaveBeenCalledWith("demo-token", {
      title: "Review dataset",
      priority: "high",
      target_date: "2026-06-10",
      tags: ["Data", "Infra"],
    });
    await waitFor(() => expect(mockedListTasks.mock.calls.length).toBeGreaterThan(1));
  });

  it("edits, toggles, and deletes a task", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TaskListPage />
      </MemoryRouter>,
    );

    await screen.findByRole("link", { name: "Write report" });

    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    const titleInput = screen.getByDisplayValue("Write report");
    await user.clear(titleInput);
    await user.type(titleInput, "Updated report");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedUpdateTask).toHaveBeenCalledWith(
      "demo-token",
      "task-1",
      { title: "Updated report" },
    );

    await user.selectOptions(screen.getByLabelText("Status for Write report"), "completed");
    expect(mockedUpdateTask).toHaveBeenCalledWith(
      "demo-token",
      "task-1",
      { status: "completed" },
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(mockedDeleteTask).toHaveBeenCalledWith("demo-token", "task-1");
  });

  it("shows an empty state", async () => {
    mockedListTasks.mockResolvedValueOnce({
      items: [],
      page: 1,
      page_size: 6,
      total: 0,
      total_pages: 0,
    });

    render(
      <MemoryRouter>
        <TaskListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("No tasks found")).toBeInTheDocument();
  });

  it("applies comma-separated tag filters only after submit", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TaskListPage />
      </MemoryRouter>,
    );

    await screen.findByRole("link", { name: "Write report" });
    const initialCalls = mockedListTasks.mock.calls.length;

    await user.type(screen.getByLabelText("Filter by tags"), "Marketing, Metrics");
    expect(mockedListTasks).toHaveBeenCalledTimes(initialCalls);

    await user.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() =>
      expect(mockedListTasks).toHaveBeenLastCalledWith(
        "demo-token",
        expect.objectContaining({ tag: "Marketing, Metrics" }),
      ),
    );
  });
});
