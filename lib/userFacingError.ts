/**
 * Map thrown API errors to clearer copy; keep technical codes for support.
 */
export function userFacingError(e: unknown): string {
  if (!(e instanceof Error)) return "Something went wrong. Try again.";
  let m = e.message;
  if (/failed to fetch|NetworkError|Load failed|fetch/i.test(m)) {
    return "We could not reach the server. Check your connection, then try again.";
  }
  if (/\(401\)|401/.test(m) || /UNAUTHORIZED/i.test(m)) {
    return "You are not signed in, or the session expired. Log in and try again.";
  }
  if (/\(403\)|403/.test(m) || /FORBIDDEN|not enabled/i.test(m)) {
    return m.includes("(") ? m : "This action is not available for your account.";
  }
  if (/\(404\)|NOT_FOUND|not found/i.test(m)) {
    return "We could not find that item. It may have been removed.";
  }
  // Our API often appends (SERVER_ERROR) to a human-readable message; show the message, not only a generic 5xx line.
  {
    const withoutAppCode = m.replace(/\s*\(SERVER_ERROR\)\s*$/i, "").trim();
    if (withoutAppCode && withoutAppCode !== m) {
      m = withoutAppCode;
    }
  }
  if (/\(5\d\d\)/.test(m) || /^HTTP 5\d\d$/i.test(m.trim()) || /^Internal Server Error$/i.test(m.trim())) {
    return "The server had a problem. Wait a moment and try again, or check status with your team.";
  }
  return m;
}
