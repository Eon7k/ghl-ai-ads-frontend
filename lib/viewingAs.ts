/**
 * For agency users: which client's data we're viewing.
 * API client sends X-Viewing-As when this is set.
 */
let currentViewingAs: string | null = null;

export function getViewingAs(): string | null {
  return currentViewingAs;
}

export function setViewingAs(clientUserId: string | null): void {
  currentViewingAs = clientUserId;
}
