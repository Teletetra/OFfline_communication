export const storageService = {
  get<T>(key: string, fallback: T | null = null): T | null {
    try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value) as T; } catch { return fallback; }
  },
  set<T>(key: string, value: T) { localStorage.setItem(key, JSON.stringify(value)); },
  remove(key: string) { localStorage.removeItem(key); },
  clear() { localStorage.clear(); },
};
