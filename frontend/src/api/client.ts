const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001";

export class ApiError extends Error {
  /** HTTP status and backend message normalized for page-level error states. */
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = {
  token?: string | null;
  method?: string;
  body?: unknown;
};

export async function apiRequest<T>(
  path: string,
  { token, method = "GET", body }: RequestOptions = {},
): Promise<T> {
  // Keep request construction in one place so auth headers, JSON handling, and
  // error parsing stay consistent across list/detail/login flows.
  const headers = new Headers();

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: unknown };
      if (typeof payload.detail === "string") {
        message = payload.detail;
      } else if (Array.isArray(payload.detail)) {
        // FastAPI validation errors arrive as an array; flatten them into one
        // readable string for forms and error banners.
        message = payload.detail
          .map((entry) => {
            if (
              typeof entry === "object" &&
              entry !== null &&
              "msg" in entry &&
              typeof entry.msg === "string"
            ) {
              return entry.msg;
            }
            return "Invalid request";
          })
          .join(", ");
      }
    } catch {
      message = response.statusText || message;
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    // DELETE returns no JSON body, but callers still get a resolved promise.
    return undefined as T;
  }

  return (await response.json()) as T;
}
