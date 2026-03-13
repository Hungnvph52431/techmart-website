import api from './api';
import { User } from '@/types';

export const authService = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const data = response.data;
    if (data.user) {
      data.user = {
        ...data.user,
        id: data.user.userId,
        fullName: data.user.name,
      };
    }
    return data;
  },

  register: async (userData: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    address?: string;
  }) => {
    const payload = {
      email: userData.email,
      password: userData.password,
      name: userData.fullName,
      phone: userData.phone,
    };
    const response = await api.post('/auth/register', payload);
    const data = response.data;
    if (data.user) {
      data.user = {
        ...data.user,
        id: data.user.userId,
        fullName: data.user.name,
      };
    }
    return data;
  },

  getProfile: async (): Promise<{ user: User }> => {
    const response = await api.get('/auth/profile');
    const data = response.data;
    if (data.user) {
      data.user = {
        ...data.user,
        id: data.user.userId,
        fullName: data.user.name,
      };
    }
    return data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};
