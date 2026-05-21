import { expect, test } from "@playwright/test";

test("login, create, edit, complete, inspect activity, and delete", async ({ page }) => {
  const title = `E2E task ${Date.now()}`;
  const updatedTitle = `${title} updated`;

  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/tasks$/);

  await page.getByLabel("New task title").fill(title);
  await page.getByLabel("Target date").fill("2026-06-10");
  await page.getByLabel("Priority", { exact: true }).selectOption("high");
  await page.getByLabel("Tags", { exact: true }).fill("Data, Infra");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByRole("link", { name: title })).toBeVisible();

  await page.getByRole("link", { name: title }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("Task created")).toBeVisible();
  await expect(page.getByText("Initial status: Pending.")).toBeVisible();

  await page.getByLabel("Title").fill(updatedTitle);
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible();
  await expect(page.getByText("Title updated")).toBeVisible();

  await page.getByRole("button", { name: "Mark complete" }).click();
  await expect(page.locator(".badge.large.completed")).toContainText("Completed");
  await expect(page.getByText("Status changed")).toBeVisible();
  await expect(page.getByText("Pending changed to Completed.")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.getByRole("link", { name: updatedTitle })).toHaveCount(0);
});
