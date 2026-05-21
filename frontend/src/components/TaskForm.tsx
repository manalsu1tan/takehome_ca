import { useState } from "react";

import type { TaskCreateInput, TaskPriority } from "../api/types";

/**
 * Toolbar form for creating a task with planning metadata.
 *
 * Tags are entered as comma-separated text because the backend stores them as
 * normalized string arrays.
 */
export function TaskForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (input: TaskCreateInput) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [targetDate, setTargetDate] = useState("");
  const [tags, setTags] = useState("");
  const trimmedTitle = title.trim();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedTitle) {
      return;
    }
    await onSubmit({
      title: trimmedTitle,
      priority,
      target_date: targetDate || null,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    setTitle("");
    setTags("");
    setTargetDate("");
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <input
        aria-label="New task title"
        maxLength={160}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Add a task"
        value={title}
      />
      <input
        aria-label="Target date"
        onChange={(event) => setTargetDate(event.target.value)}
        type="date"
        value={targetDate}
      />
      <select
        aria-label="Priority"
        onChange={(event) => setPriority(event.target.value as TaskPriority)}
        value={priority}
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <input
        aria-label="Tags"
        onChange={(event) => setTags(event.target.value)}
        placeholder="Tags, comma separated"
        value={tags}
      />
      <button
        className="button primary"
        disabled={isSubmitting || !trimmedTitle}
        type="submit"
      >
        {isSubmitting ? "Adding" : "Add"}
      </button>
    </form>
  );
}
