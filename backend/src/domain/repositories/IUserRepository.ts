import { User, UserWithPassword, CreateUserDTO, UpdateUserDTO } from '../entities/User';

export interface IUserRepository {
  findAll(): Promise<User[]>;
  findById(userId: number): Promise<User | null>;
  findByEmail(email: string): Promise<UserWithPassword | null>;
  create(userData: CreateUserDTO & { hashedPassword: string }): Promise<User>;
  update(userData: UpdateUserDTO): Promise<User | null>;
  updateStatus(userId: number, status: User['status']): Promise<boolean>;
  updateRole(userId: number, role: User['role']): Promise<boolean>;
  updatePoints(userId: number, pointsDelta: number): Promise<boolean>;
  delete(userId: number): Promise<boolean>;
}