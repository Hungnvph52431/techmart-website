import api from './api';

export interface User {
  userId: number;
  email: string;
  name: string;
  phone?: string;
  role: 'customer' | 'admin' | 'staff' | 'warehouse';
  status: 'active' | 'inactive' | 'banned';
  points: number;
  membershipLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
  createdAt: string;
  updatedAt: string;
}

export type UserRole = User['role'];
export type UserStatus = User['status'];
export type MembershipLevel = User['membershipLevel'];

export interface UserFilters {
  search?: string;
  role?: 'customer' | 'admin' | 'staff' | 'warehouse';
  status?: 'active' | 'inactive' | 'banned';
}

export interface CreateUserPayload {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: 'customer' | 'admin' | 'staff' | 'warehouse';
}

export interface UpdateUserPayload {
  email?: string;
  name?: string;
  phone?: string;
  role?: 'customer' | 'admin' | 'staff' | 'warehouse';
  status?: 'active' | 'inactive' | 'banned';
  points?: number;
  membershipLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  bannedUsers: number;
  usersByRole: Record<string, number>;
  usersByMembership: Record<string, number>;
}

export interface DeleteUserResponse {
  action: 'deleted' | 'deactivated';
}

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

const unwrapData = <T>(payload: T | ApiEnvelope<T>): T => {
  if (payload && typeof payload === 'object' && 'data' in (payload as ApiEnvelope<T>)) {
    const envelope = payload as ApiEnvelope<T>;
    return (envelope.data ?? payload) as T;
  }
  return payload as T;
};

const buildQueryString = (filters?: UserFilters): string => {
  const params = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }

  return params.toString();
};

export const userService = {
  getAllUsers: async (filters?: UserFilters): Promise<User[]> => {
    const query = buildQueryString(filters);
    const response = await api.get(query ? `/users?${query}` : '/users');
    return unwrapData<User[]>(response.data);
  },

  getById: async (userId: number): Promise<User> => {
    const response = await api.get(`/users/${userId}`);
    return unwrapData<User>(response.data);
  },

  createUser: async (payload: CreateUserPayload): Promise<User> => {
    const response = await api.post('/users', payload);
    return unwrapData<User>(response.data);
  },

  updateUser: async (userId: number, payload: UpdateUserPayload): Promise<User> => {
    const response = await api.put(`/users/${userId}`, payload);
    return unwrapData<User>(response.data);
  },

  deleteUser: async (userId: number): Promise<DeleteUserResponse> => {
    const response = await api.delete(`/users/${userId}`);
    return unwrapData<DeleteUserResponse>(response.data);
  },

  async updateUserStatus(userId: number, status: 'active' | 'inactive' | 'banned'): Promise<User> {

    const response = await api.patch(`/users/${userId}/status`, { status });
    return unwrapData<User>(response.data);
  },

  async updateUserPoints(userId: number, points: number): Promise<User> {
    const response = await api.patch(`/users/${userId}/points`, { points });
    return unwrapData<User>(response.data);
  },

  async getUserStats(): Promise<UserStats> {
    const response = await api.get('/users/stats');
    return unwrapData<UserStats>(response.data);
  },

  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    await api.post(`/users/${userId}/password`, { oldPassword, newPassword });
  }
};
