import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

// Hằng số định danh bộ nhớ đệm
const AUTH_STORAGE_KEY = 'auth-storage';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  updateUser: (partial: Partial<User>) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      setAuth: (user, token) => {
        set({ user, token });
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      },

      updateUser: (partial) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : state.user,
        }));
      },

      clearAuth: () => {
        set({ user: null, token: null });
        // Xóa sạch dấu vết để đảm bảo bảo mật
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem(AUTH_STORAGE_KEY);
      },

      isAuthenticated: () => {
        // Trả về true nếu có token, dùng get() để lấy dữ liệu mới nhất trong store
        return !!get().token;
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
    }
  )
);