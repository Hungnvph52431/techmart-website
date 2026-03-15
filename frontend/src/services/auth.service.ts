import api from './api';
import { User } from '@/types';

// Định nghĩa phản hồi từ API
export interface AuthResponse {
  token: string;
  user: User;
}

/**
 * Hàm chuẩn hóa giúp dữ liệu User luôn đồng nhất, 
 * tránh lỗi "Property does not exist" ở Layout và Admin
 */
export const normalizeAuthUser = (input: any): User => ({
  userId: Number(input?.userId ?? input?.id ?? 0),
  email: input?.email ?? '',
  // Ưu tiên fullName theo chuẩn chúng ta đã sửa ở Header/AdminLayout
  fullName: input?.fullName ?? input?.name ?? '', 
  phone: input?.phone || undefined,
  role: input?.role ?? 'customer',
  status: input?.status,
  points: typeof input?.points === 'number' ? input.points : 0,
  membershipLevel: input?.membershipLevel ?? 'bronze',
});

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { email, password });
    return {
      token: response.data.token,
      user: normalizeAuthUser(response.data.user),
    };
  },

  register: async (userData: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    address?: string;
  }): Promise<AuthResponse> => {
    // Bản Incoming giúp mapping dữ liệu chuẩn xác hơn trước khi gửi lên
    const response = await api.post('/auth/register', {
      email: userData.email,
      password: userData.password,
      fullName: userData.fullName,
      phone: userData.phone,
      address: userData.address,
    });

    return {
      token: response.data.token,
      user: normalizeAuthUser(response.data.user),
    };
  },

  getProfile: async (): Promise<{ user: User }> => {
    const response = await api.get('/auth/profile');
    return {
      user: normalizeAuthUser(response.data.user),
    };
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Xóa thêm auth-storage của Zustand để đảm bảo sạch dữ liệu
    localStorage.removeItem('auth-storage'); 
  },
};