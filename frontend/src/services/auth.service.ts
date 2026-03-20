import api from './api';
import { User } from '@/types';

// Định nghĩa phản hồi từ API
export interface AuthResponse {
  token: string;
  user: User;
}

/**
 * Hàm chuẩn hóa giúp dữ liệu User luôn đồng nhất
 */
export const normalizeAuthUser = (input: any): User => ({
  userId: Number(input?.userId ?? input?.user_id ?? input?.id ?? 0),
  email: input?.email ?? '',
  // Ưu tiên fullName để khớp với logic Header/AdminLayout
  fullName: input?.fullName ?? input?.name ?? '',
  phone: input?.phone || undefined,
  role: input?.role ?? 'customer',
  status: input?.status ?? 'active',
  points: typeof input?.points === 'number' ? input.points : 0,
  membershipLevel: input?.membershipLevel ?? input?.membership_level ?? 'bronze',
  walletBalance: Number(input?.walletBalance ?? input?.wallet_balance ?? 0),
});

export const authService = {
  // 1. ĐĂNG NHẬP
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { email, password });
    return {
      token: response.data.token,
      user: normalizeAuthUser(response.data.user),
    };
  },

  // 2. ĐĂNG KÝ
  register: async (userData: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    address?: string;
  }): Promise<AuthResponse> => {
    const payload = {
      email: userData.email,
      password: userData.password,
      name: userData.fullName,
      phone: userData.phone,
      address: userData.address,
    };

    const response = await api.post('/auth/register', payload);

    return {
      token: response.data.token,
      user: normalizeAuthUser(response.data.user),
    };
  },

  // 3. LẤY THÔNG TIN CÁ NHÂN
  getProfile: async (): Promise<{ user: User }> => {
    const response = await api.get('/auth/profile');
    return {
      user: normalizeAuthUser(response.data.user),
    };
  },

  // 4. ĐĂNG XUẤT
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Xóa sạch cả auth-storage để tránh "rác" dữ liệu
    localStorage.removeItem('auth-storage'); 
  },
};