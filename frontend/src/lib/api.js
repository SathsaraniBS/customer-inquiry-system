const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function api(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      credentials: "include", // send the httpOnly cookie
      headers: { "Content-Type": "application/json" },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the server. Check your connection.", 0, null);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(body?.error || "Request failed", res.status, body);
  }
  return body;
}