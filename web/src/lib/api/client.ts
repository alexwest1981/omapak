// Thin fetch wrapper for api.omapak.org (the same API the desktop app will
// use). The session cookie travels automatically (SameSite=None, httpOnly);
// every call is credentialed so /v1/me works after magic-link sign-in.
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? "https://api.omapak.org";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    let message = `${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // non-JSON error (offline worker, 502 html, …)
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
