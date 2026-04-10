import { Request, Response } from "express";
import { AuthUseCase } from "../../application/use-cases/AuthUseCase";

export class AuthController {
  constructor(private authUseCase: AuthUseCase) {}

  login = async (req: Request, res: Response) => {
    try {
      // req.body chứa email và password
      const result = await this.authUseCase.login(req.body);

      if (!result) {
        return res
          .status(401)
          .json({ message: "Email hoặc mật khẩu không chính xác" });
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  register = async (req: Request, res: Response) => {
    try {
      const result = await this.authUseCase.register(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  getProfile = async (req: Request, res: Response) => {
    try {
      // authUser được đính kèm vào request thông qua AuthMiddleware
      const authUser = (req as any).user;

      if (!authUser || !authUser.userId) {
        return res.status(401).json({ message: "Bạn chưa đăng nhập" });
      }

      const user = await this.authUseCase.getProfile(authUser.userId);

      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }

      res.json({ user });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  forgotPassword = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Vui lòng nhập email" });
      }

      const result = await this.authUseCase.forgotPassword(email);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  verifyOtp = async (req: Request, res: Response) => {
    try {
      const { tempToken, otp } = req.body;

      if (!tempToken || !otp) {
        return res
          .status(400)
          .json({ message: "Thiếu thông tin (tempToken hoặc OTP)" });
      }

      const result = await this.authUseCase.verifyForgotPasswordOtp(
        tempToken,
        otp,
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  resetPassword = async (req: Request, res: Response) => {
    try {
      const { resetToken, newPassword } = req.body;

      if (!resetToken || !newPassword) {
        return res
          .status(400)
          .json({ message: "Thiếu thông tin (resetToken hoặc mật khẩu mới)" });
      }

      if (newPassword.length < 8) {
        return res
          .status(400)
          .json({ message: "Mật khẩu phải có ít nhất 8 ký tự" });
      }

      const result = await this.authUseCase.resetPassword(
        resetToken,
        newPassword,
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };
}
