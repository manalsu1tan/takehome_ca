/** Format ISO datetimes returned by the backend for display. */
export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/** Format date-only target dates without timezone drift. */
export function formatDate(value: string | null): string {
  if (!value) {
    return "No target";
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}
