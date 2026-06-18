// src/lib/api.ts
// ─────────────────────────────────────────────────────────────────
// Centralised fetch wrapper. Attaches JWT from localStorage,
// handles 401 auto-redirect to /login, and parses JSON uniformly.
// ─────────────────────────────────────────────────────────────────

const TOKEN_KEY = 'crmp_token';
const USER_KEY  = 'crmp_user';

// ── Token helpers ─────────────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ── User helpers ──────────────────────────────────────────────────
export function getUser<T = Record<string, unknown>>(): T | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function setUser(user: unknown): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// ── Core fetch wrapper ────────────────────────────────────────────
export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    // Network-level failure (server down, CORS preflight blocked, etc.)
    throw new Error('Could not reach the server. Please check your connection.');
  }

  // Auto-logout on 401
  if (res.status === 401) {
    // Only redirect if it's not a login/register attempt
    const isAuthRoute = url.includes('/api/auth/');
    if (!isAuthRoute) {
      removeToken();
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
  }

  // Parse JSON — even error responses carry a message body
  type ErrorBody = { message?: string; error?: string; errors?: string[] };
  const data: ErrorBody | T = await res.json().catch(() => ({}));

  if (!res.ok) {
    const body = data as ErrorBody;
    // Try every common shape the backend might return
    const msg =
      body.message ||
      body.error ||
      (body.errors && body.errors[0]) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

