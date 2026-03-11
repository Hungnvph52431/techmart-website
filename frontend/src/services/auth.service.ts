import api from './api';
import type { AuthUser } from '@/types/auth';

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const normalizeAuthUser = (input: any): AuthUser => ({
  userId: Number(input?.userId ?? input?.id ?? 0),
  email: input?.email ?? '',
  name: input?.name ?? input?.fullName ?? '',
  phone: input?.phone || undefined,
  role: input?.role ?? 'customer',
  status: input?.status,
  points: typeof input?.points === 'number' ? input.points : undefined,
  membershipLevel: input?.membershipLevel,
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
  }) => {
    const response = await api.post('/auth/register', {
      email: userData.email,
      password: userData.password,
      name: userData.fullName,
      phone: userData.phone,
      address: userData.address,
    });

    return {
      token: response.data.token,
      user: normalizeAuthUser(response.data.user),
    };
  },

  getProfile: async (): Promise<{ user: AuthUser }> => {
    const response = await api.get('/auth/profile');
    return {
      user: normalizeAuthUser(response.data.user),
    };
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth-storage');
  },
};
