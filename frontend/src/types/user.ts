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
  lastLogin?: string;
}

export type UserRole = User['role'];
export type UserStatus = User['status'];
export type MembershipLevel = User['membershipLevel'];

export interface CreateUserDTO {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: UserRole;
}

export interface UpdateUserDTO {
  userId: number;
  name?: string;
  phone?: string;
  role?: UserRole;
  status?: UserStatus;
  points?: number;
  membershipLevel?: MembershipLevel;
}