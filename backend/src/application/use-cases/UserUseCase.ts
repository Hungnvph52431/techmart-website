import { IUserRepository } from "../../domain/repositories/IUserRepository";
import {
  User,
  CreateUserDTO,
  UpdateUserDTO,
  UserWithPassword,
} from "../../domain/entities/User";
import bcrypt from 'bcryptjs';

export class UserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async getUserById(userId: number): Promise<User | null> {
    return this.userRepository.findById(userId);
  }

  async createUser(dto: CreateUserDTO): Promise<User> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new Error("Email đã được sử dụng");
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const createData = {
      ...dto,
      hashedPassword,
      role: dto.role || "customer",
    };

    return this.userRepository.create(createData);
  }

  async updateUser(dto: UpdateUserDTO): Promise<User | null> {
    return this.userRepository.update(dto);
  }

  async updateUserStatus(
    userId: number,
    status: User["status"],
  ): Promise<boolean> {
    return this.userRepository.updateStatus(userId, status);
  }

  async updateUserRole(userId: number, role: User["role"]): Promise<boolean> {
    return this.userRepository.updateRole(userId, role);
  }

  async addPoints(userId: number, points: number): Promise<boolean> {
    return this.userRepository.updatePoints(userId, points);
  }

  async deleteUser(userId: number): Promise<boolean> {
    return this.userRepository.delete(userId);
  }

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<UserWithPassword | null> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;

    return user;
  }
}
