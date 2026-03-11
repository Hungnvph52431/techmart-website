import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/types/auth';
import { normalizeAuthUser } from '@/services/auth.service';

const AUTH_STORAGE_KEY = 'auth-storage';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser | Record<string, unknown>, token: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        const normalizedUser = normalizeAuthUser(user);
        set({ user: normalizedUser, token });
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
      },
      clearAuth: () => {
        set({ user: null, token: null });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem(AUTH_STORAGE_KEY);
      },
      isAuthenticated: () => {
        return !!get().token;
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      merge: (persistedState, currentState) => {
        const typedState = (persistedState || {}) as Partial<AuthState>;

        return {
          ...currentState,
          ...typedState,
          token: typeof typedState.token === 'string' ? typedState.token : null,
          user: typedState.user
            ? normalizeAuthUser(typedState.user as Record<string, unknown>)
            : null,
        };
      },
    }
  )
);
