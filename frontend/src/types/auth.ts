export type AuthUserRole = 'customer' | 'admin' | 'staff' | 'warehouse';

export interface AuthUser {
  userId: number;
  email: string;
  name: string;
  phone?: string;
  role: AuthUserRole;
  status?: 'active' | 'inactive' | 'banned';
  points?: number;
  membershipLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
}
