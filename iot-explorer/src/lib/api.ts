const TOKEN_KEY = "iot_explorer_token";

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t: string) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* storage blocked */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ } },
};

export class ApiError extends Error {
  constructor(message: string, public status: number, public fields?: Record<string, string>) { super(message); }
}

/** Calls the Express API (proxied to /api in development). Sends the login token when there is one. */
export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: opts.method ?? (opts.body ? "POST" : "GET"),
      headers: { ...(opts.body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the server. Check your internet connection and that the backend is running.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.message ?? "Something went wrong. Please try again.", res.status, data.fields);
  return data as T;
}

/** Downloads a file from the API (used for CSV exports, which need the login token). */
export async function downloadFile(path: string, filename: string) {
  const token = tokenStore.get();
  let res: Response;
  try { res = await fetch(`/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }); }
  catch { throw new ApiError("Cannot reach the server.", 0); }
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new ApiError(d.message ?? "Download failed.", res.status); }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
