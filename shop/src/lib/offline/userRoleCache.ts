const KEY = 'auth:user';

export async function cacheUserSession(user: { id: string; role: string } | null) {
  try {
    localStorage.setItem(KEY, JSON.stringify(user || null));
  } catch {}
}

export function getCachedUser(): { id: string; role: string } | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
