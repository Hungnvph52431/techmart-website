import { IUserRepository } from "../../domain/repositories/IUserRepository";
import { UserLoginDTO } from "../../domain/entities/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendForgotPasswordOtpEmail } from "../../application/services/EmailService";

const JWT_SECRET: string = process.env.JWT_SECRET || "secret";
const JWT_EXPIRES = (process.env.JWT_EXPIRES_IN || "7d") as any;

const OTP_EXPIRY_MINUTES = 10;
const TEMP_TOKEN_EXPIRY = "15m";

export class AuthUseCase {
  constructor(private userRepository: IUserRepository) {}

  async login(
    loginData: UserLoginDTO,
  ): Promise<{ token: string; user: any } | null> {
    const user = await this.userRepository.findByEmail(loginData.email);
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(
      loginData.password,
      user.password,
    );
    if (!isPasswordValid) return null;

    // Bây giờ TypeScript sẽ cho phép dùng JWT_EXPIRES mà không báo lỗi
    const token = jwt.sign(
      { userId: user.userId, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES },
    );

    const { password, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
  }

  async register(userData: any) {
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) throw new Error("Email already exists");

    const user = await this.userRepository.create(userData);
    const { password, ...userWithoutPassword } = user;

    const token = jwt.sign(
      { userId: user.userId, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES },
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

  async forgotPassword(email: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error("Email không tồn tại hoặc yêu cầu không hợp lệ");
    }

    // Tạo OTP 6 số
    const otp = crypto.randomInt(100000, 999999).toString();

    // Tạo temporary JWT chứa OTP và userId (để verify sau)
    const tempPayload = {
      userId: user.userId,
      email: user.email,
      otp: otp,
      purpose: "forgot-password-otp",
    };

    const tempToken = jwt.sign(tempPayload, JWT_SECRET, {
      expiresIn: `${OTP_EXPIRY_MINUTES}m`,
    });

    // Gửi email OTP
    await sendForgotPasswordOtpEmail({
      customerName: user.name,
      customerEmail: user.email,
      otp,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    });

    // Trả về tempToken để frontend dùng khi verify OTP
    return {
      message: "OTP đã được gửi đến email của bạn",
      tempToken, // Frontend sẽ lưu tạm token này
    };
  }

  async verifyForgotPasswordOtp(tempToken: string, enteredOtp: string) {
    let decoded: any;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET);
      if (decoded.purpose !== "forgot-password-otp") {
        throw new Error("Token không hợp lệ");
      }
    } catch (err) {
      throw new Error(
        "OTP đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu lại.",
      );
    }

    if (decoded.otp !== enteredOtp) {
      throw new Error("OTP không chính xác");
    }

    // Tạo temporary reset token (dùng để đổi mật khẩu)
    const resetToken = jwt.sign(
      {
        userId: decoded.userId,
        purpose: "reset-password",
      },
      JWT_SECRET,
      { expiresIn: TEMP_TOKEN_EXPIRY },
    );

    return { resetToken };
  }

  async resetPassword(resetToken: string, newPassword: string) {
    let decoded: any;
    try {
      decoded = jwt.verify(resetToken, JWT_SECRET);
      if (decoded.purpose !== "reset-password") {
        throw new Error("Token không hợp lệ");
      }
    } catch {
      throw new Error("Token reset mật khẩu không hợp lệ hoặc đã hết hạn");
    }

    const user = await this.userRepository.findById(decoded.userId);
    if (!user) throw new Error("Người dùng không tồn tại");

    // Hash mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Cập nhật mật khẩu
    await this.userRepository.updatePassword(decoded.userId, hashedPassword);

    return { message: "Mật khẩu đã được đặt lại thành công" };
  }
}
