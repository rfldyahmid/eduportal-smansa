import type { UserAccount } from '../types';

// Keep only the current user in memory. The user is revalidated with PostgreSQL
// through /api/auth/me after a page refresh; school records are never cached here.
let activeSession: UserAccount | null = null;

export function getActiveSession(): UserAccount | null {
  return activeSession;
}

export function setActiveSession(user: UserAccount | null): void {
  activeSession = user;
  if (!user) {
    sessionStorage.removeItem('sman1halteng_auth_token');
    sessionStorage.removeItem('sman1halteng_admin_token');
  }
  window.dispatchEvent(new Event('storage-session-updated'));
}
