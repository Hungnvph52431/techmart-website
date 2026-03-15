import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

// Hằng số định danh bộ nhớ đệm
const AUTH_STORAGE_KEY = 'auth-storage';

interface AuthState {
  user: User | null;
  token: string | null;
  // Hàm cập nhật thông tin đăng nhập
  setAuth: (user: User, token: string) => void;
  // Hàm đăng xuất sạch sẽ
  clearAuth: () => void;
  // Hàm kiểm tra trạng thái đăng nhập (đã fix cho Header)
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      setAuth: (user, token) => {
        set({ user, token });
        // Đồng bộ thêm vào localStorage để các service khác (như api.ts) có thể truy cập
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
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