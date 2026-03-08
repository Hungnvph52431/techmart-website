import { User, CreateUserDTO, UpdateUserDTO } from '../entities/User';

export interface IUserRepository {
  findAll(): Promise<User[]>;
  findById(userId: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: CreateUserDTO): Promise<User>;
  update(user: UpdateUserDTO): Promise<User | null>;
  updatePassword(userId: number, hashedPassword: string): Promise<boolean>;
  delete(userId: number): Promise<boolean>;
}
