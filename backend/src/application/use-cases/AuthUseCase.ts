import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserLoginDTO } from '../../domain/entities/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET: string = process.env.JWT_SECRET || 'secret';
// SỬA TẠI ĐÂY: Ép kiểu 'any' hoặc dùng kiểu cụ thể để TypeScript không bắt bẻ
const JWT_EXPIRES = (process.env.JWT_EXPIRES_IN || '7d') as any;

export class AuthUseCase {
  constructor(private userRepository: IUserRepository) {}

  async login(loginData: UserLoginDTO): Promise<{ token: string; user: any } | null> {
    const user = await this.userRepository.findByEmail(loginData.email);
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
    if (!isPasswordValid) return null;

    // Bây giờ TypeScript sẽ cho phép dùng JWT_EXPIRES mà không báo lỗi
    const token = jwt.sign(
      { userId: user.userId, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    const { password, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
  }

  async register(userData: any) {
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) throw new Error('Email đã tồn tại');

    const user = await this.userRepository.create(userData);
    const { password, ...userWithoutPassword } = user;

    const token = jwt.sign(
      { userId: user.userId, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return { token, user: userWithoutPassword };
  }

  async getProfile(userId: number) {
    const user = await this.userRepository.findById(userId);
    if (!user) return null;
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }
}