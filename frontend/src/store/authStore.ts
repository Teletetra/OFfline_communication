import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'include',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Request failed');
  }
  return response.json();
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,

      login: async (identifier, password) => {
        const data = await request<{ user: User; token: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ identifier, password }),
        });
        set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
      },

      register: async (username, email, password) => {
        const data = await request<{ user: User; token: string }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username, email, password }),
        });
        set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        void request('/auth/logout', { method: 'POST' }).catch(() => undefined);
      },

      checkAuth: async () => {
        set({ isLoading: true });
        const token = get().token;
        if (!token) {
          set({ user: null, isAuthenticated: false, isLoading: false });
          return;
        }
        try {
          const data = await request<{ user: User }>('/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          set({ user: data.user, isAuthenticated: true, isLoading: false });
        } catch {
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },

      updateUser: (user) => set((state) => ({ user: state.user ? { ...state.user, ...user } : null })),
    }),
    { name: 'offline-chat-auth', partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }) }
  )
);