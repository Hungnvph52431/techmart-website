import { User, CreateUserDTO, UpdateUserDTO } from '../entities/User';

export interface IUserRepository {
  findAll(): Promise<User[]>;
  findById(userId: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: CreateUserDTO): Promise<User>;
  update(user: UpdateUserDTO): Promise<User | null>;
<<<<<<< HEAD
  delete(userId: number): Promise<boolean>;
  updatePassword(userId: number, password: string): Promise<boolean>;
=======
  updatePassword(userId: number, hashedPassword: string): Promise<boolean>;
  delete(userId: number): Promise<boolean>;
>>>>>>> b108ee4d7c5113d772df70a095f2bd30d25283f8
}
