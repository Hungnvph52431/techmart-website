export interface User {
  userId: number;
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'customer' | 'admin' | 'staff' | 'warehouse';
  status: 'active' | 'inactive' | 'banned';
  points: number;
  membershipLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
  walletBalance: number;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: 'customer' | 'admin' | 'staff' | 'warehouse';
}

export interface UpdateUserDTO extends Partial<Omit<CreateUserDTO, 'password'>> {
  userId: number;
  status?: 'active' | 'inactive' | 'banned';
  points?: number;
  membershipLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
  walletBalance?: number;
}

export interface UserLoginDTO {
  email: string;
  password: string;
}
