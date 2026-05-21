import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TaskForm } from "./TaskForm";

describe("TaskForm", () => {
  it("disables Add until a non-blank title is entered", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TaskForm isSubmitting={false} onSubmit={onSubmit} />);

    const input = screen.getByLabelText("New task title");
    const button = screen.getByRole("button", { name: "Add" }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);

    await user.type(input, "   ");
    expect(button.disabled).toBe(true);

    await user.type(input, "Task");
    expect(button.disabled).toBe(false);
  });
});
