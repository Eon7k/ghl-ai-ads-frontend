/**
 * Client-side auth token storage. Uses localStorage so the token
 * persists across reloads and is sent with API requests via the api client.
 */

const TOKEN_KEY = "ghl_ai_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}
