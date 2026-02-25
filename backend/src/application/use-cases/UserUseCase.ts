import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import bcrypt from 'bcryptjs';
import { CreateUserDTO, UpdateUserDTO } from '../../domain/entities/User';

export interface UserFilters {
    role?: 'customer' | 'admin' | 'staff' | 'warehouse';
    status?: 'active' | 'inactive' | 'banned';
    search?: string;
    membershipLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export class UserUseCase {
    constructor(private userRepository: IUserRepository) { }

    async getAllUsers(filters?: UserFilters): Promise<User[]> {
        let users = await this.userRepository.findAll();

        if (filters) {
            if (filters.role) {
                users = users.filter(user => user.role === filters.role);
            }
            if (filters.status) {
                users = users.filter(user => user.status === filters.status);
            }
            if (filters.membershipLevel) {
                users = users.filter(user => user.membershipLevel === filters.membershipLevel);
            }
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                users = users.filter(user =>
                    user.name.toLowerCase().includes(searchLower) ||
                    user.email.toLowerCase().includes(searchLower) ||
                    (user.phone && user.phone.includes(searchLower))
                );
            }

        }
        return users.map(({ password, ...user }) => user as User);
    }

    async getUserById(userId: number): Promise<Omit<User, 'password'> | null> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            return null;
        }
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    async createUser(userData: CreateUserDTO): Promise<Omit<User, 'password'>> {
        const normalizedEmail = userData.email.trim().toLowerCase();
        const normalizedName = userData.name.trim();
        const normalizedPassword = userData.password.trim();
        const normalizedPhone = userData.phone?.trim() || undefined;
        const allowedRoles: Array<'customer' | 'admin' | 'staff' | 'warehouse'> = ['customer', 'admin', 'staff', 'warehouse'];
        const normalizedRole = userData.role && allowedRoles.includes(userData.role)
            ? userData.role
            : 'customer';

        const existingUser = await this.userRepository.findByEmail(normalizedEmail);
        if (existingUser) {
            throw new Error('Email already exists');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            throw new Error('Invalid email format');
        }

        if (normalizedPassword.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        if (!normalizedName) {
            throw new Error('Name is required');
        }

        const createPayload: CreateUserDTO = {
            email: normalizedEmail,
            password: normalizedPassword,
            name: normalizedName,
            phone: normalizedPhone,
            role: normalizedRole,
        };

        const user = await this.userRepository.create(createPayload);
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    async updateUser(userData: UpdateUserDTO): Promise<Omit<User, 'password'> | null> {
        const existingUser = await this.userRepository.findById(userData.userId);
        if (!existingUser) {
            throw new Error('User not found');
        }

        if (userData.email && userData.email !== existingUser.email) {
            const emailExists = await this.userRepository.findByEmail(userData.email);
            if (emailExists) {
                throw new Error('Email already exists');
            }
        }

        const updatedUser = await this.userRepository.update(userData);
        if (!updatedUser) {
            return null;
        }

        const { password, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    }
    async deleteUser(userId: number): Promise<boolean> {
        const existingUser = await this.userRepository.findById(userId);
        if (!existingUser) {
            throw new Error('User not found');
        }

        if (existingUser.role === 'admin') {
            throw new Error('Cannot delete admin users');
        }

        try {
            return await this.userRepository.delete(userId);
        } catch (error: any) {
            const dbErrorCode = error?.code;
            if (dbErrorCode === 'ER_ROW_IS_REFERENCED_2' || dbErrorCode === 'ER_ROW_IS_REFERENCED') {
                const deactivatedUser = await this.userRepository.update({
                    userId,
                    status: 'inactive',
                });
                return !!deactivatedUser;
            }
            throw error;
        }
    }

    async updateStatus(userId: number, status: 'active' | 'inactive' | 'banned'): Promise<Omit<User, 'password'> | null> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const updatedUser = await this.userRepository.update({ userId, status });
        if (!updatedUser) {
            return null;
        }
        const { password, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    }

    async updateUserPoints(userId: number, points: number): Promise<Omit<User, 'password'> | null> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        const updatedUser = await this.userRepository.update({ userId, points });
        if (!updatedUser) {
            return null;
        }
        const { password, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    }
    async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<boolean> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            throw new Error('Old password is incorrect');
        }
        if (newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters long');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        return await this.userRepository.updatePassword(userId, hashedPassword);
    }

    async getUserStatus(): Promise<{
        totalUsers: number;
        activeUsers: number;
        inactiveUsers: number;
        bannedUsers: number;
        usersByRole: Record<string, number>;
        usersByMembership: Record<string, number>;
    }> {
        const users = await this.userRepository.findAll();

        const status = {
            totalUsers: users.length,
            activeUsers: users.filter(u => u.status === 'active').length,
            inactiveUsers: users.filter(u => u.status === 'inactive').length,
            bannedUsers: users.filter(u => u.status === 'banned').length,
            usersByRole: {
                customer: users.filter(u => u.role === 'customer').length,
                admin: users.filter(u => u.role === 'admin').length,
                staff: users.filter(u => u.role === 'staff').length,
                warehouse: users.filter(u => u.role === 'warehouse').length,
            },
            usersByMembership: {
                bronze: users.filter(u => u.membershipLevel === 'bronze').length,
                silver: users.filter(u => u.membershipLevel === 'silver').length,
                gold: users.filter(u => u.membershipLevel === 'gold').length,
                platinum: users.filter(u => u.membershipLevel === 'platinum').length,
            },

        };
        return status;
    }
}