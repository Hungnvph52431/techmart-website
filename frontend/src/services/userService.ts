import axios from 'axios';
import { User, CreateUserDTO, UpdateUserDTO } from '@/types/user';

const API_BASE = import.meta.env.VITE_API_URL;

const userApi = axios.create({
  baseURL: `${API_BASE}/users`,
  headers: { 'Content-Type': 'application/json' },
});

userApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const userService = {
  getAllUsers: async (): Promise<User[]> => {
    const res = await userApi.get('/');
    return res.data;
  },

  getUserById: async (id: number): Promise<User> => {
    const res = await userApi.get(`/${id}`);
    return res.data;
  },

  createUser: async (data: CreateUserDTO): Promise<User> => {
    const res = await userApi.post('/', data);
    return res.data;
  },

  updateUser: async (data: UpdateUserDTO): Promise<User> => {
    const res = await userApi.patch(`/${data.userId}`, data);
    return res.data;
  },

  updateStatus: async (userId: number, status: User['status']): Promise<void> => {
    await userApi.patch(`/${userId}/status`, { status });
  },

  deleteUser: async (userId: number): Promise<void> => {
    await userApi.delete(`/${userId}`);
  },
};