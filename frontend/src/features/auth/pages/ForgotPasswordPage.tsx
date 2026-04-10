import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { authService } from "@/services/auth.service";
import toast from "react-hot-toast";
import { Mail, ArrowLeft, Loader2, Lock, Eye, EyeOff, Check, X } from "lucide-react";

const passwordRules = [
  {
    label: "Mật khẩu phải từ 8 đến 20 ký tự",
    test: (p: string) => p.length >= 8 && p.length <= 20,
  },
  {
    label: "Bao gồm số, chữ viết hoa, chữ viết thường",
    test: (p: string) => /[0-9]/.test(p) && /[A-Z]/.test(p) && /[a-z]/.test(p),
  },
  {
    label: "Bao gồm ít nhất một ký tự đặc biệt !@#$^*()_",
    test: (p: string) => /[!@#$^*()_]/.test(p),
  },
];

type Step = "email" | "otp" | "reset";

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [tempToken, setTempToken] = useState(""); 
  const [resetToken, setResetToken] = useState(""); 

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Vui lòng nhập email");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.forgotPassword(email);
      setTempToken(res.tempToken);
      setStep("otp");
      toast.success("OTP đã được gửi đến email của bạn");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Không thể gửi OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error("Vui lòng nhập đủ 6 số OTP");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.verifyOtp(tempToken, otp);
      setResetToken(res.resetToken);
      setStep("reset");
      toast.success("Xác thực OTP thành công");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "OTP không chính xác hoặc đã hết hạn",
      );
    } finally {
      setLoading(false);
    }
  };

  const getRuleStyle = (passes: boolean) => {
    if (!newPassword && !submitted) return "text-gray-400";
    if (passes) return "text-green-500";
    if (submitted) return "text-red-500";
    return "text-gray-400";
  };

  const getRuleIcon = (passes: boolean) => {
    if (!newPassword && !submitted) return <Check size={14} />;
    if (passes) return <Check size={14} />;
    if (submitted) return <X size={14} />;
    return <Check size={14} />;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const allRulesPass = passwordRules.every((r) => r.test(newPassword));
    if (!allRulesPass) return;

    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(resetToken, newPassword);
      toast.success("Đặt lại mật khẩu thành công!");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Đặt lại mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto bg-white rounded-[32px] shadow-xl border border-gray-100 p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-10">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
            >
              <ArrowLeft size={18} /> Quay lại đăng nhập
            </Link>

            <h1 className="text-4xl font-black text-gray-800 uppercase italic tracking-tighter">
              {step === "email" && "Quên mật khẩu"}
              {step === "otp" && "Nhập mã OTP"}
              {step === "reset" && "Đặt lại mật khẩu"}
            </h1>
            <p className="text-gray-400 text-sm font-medium mt-2">
              {step === "email" && "Nhập email để nhận mã OTP"}
              {step === "otp" && `Chúng tôi đã gửi mã OTP đến ${email}`}
              {step === "reset" && "Tạo mật khẩu mới cho tài khoản của bạn"}
            </p>
          </div>

          {step === "email" && (
            <form onSubmit={handleSendOtp} noValidate className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                  Email tài khoản
                </label>
                <div className="relative mt-1">
                  <Mail
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="khanh@example.com"
                    required
                    className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-[0.98] disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  "Gửi mã OTP"
                )}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} noValidate className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                  Mã OTP (6 số)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  required
                  className="w-full mt-1 px-5 py-4 bg-gray-50 border-none rounded-2xl text-2xl tracking-widest text-center focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-[0.98] disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  "Xác thực OTP"
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep("email")}
                className="w-full text-gray-500 hover:text-gray-700 text-sm font-medium py-2"
              >
                Thay đổi email
              </button>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={handleResetPassword} noValidate className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                  Mật khẩu mới
                </label>
                <div className="relative mt-1">
                  <Lock
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-12 pr-12 py-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <ul className="mt-2 space-y-1">
                  {passwordRules.map((rule) => {
                    const passes = rule.test(newPassword);
                    return (
                      <li key={rule.label} className={`flex items-center gap-1.5 text-sm ${getRuleStyle(passes)}`}>
                        {getRuleIcon(passes)}
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative mt-1">
                  <Lock
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-[0.98] disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" /> Đang cập
                    nhật...
                  </>
                ) : (
                  "Đặt lại mật khẩu"
                )}
              </button>
            </form>
          )}

          <div className="mt-8 text-center pt-6 border-t border-gray-50">
            <p className="text-gray-500 text-sm font-medium">
              Nhớ mật khẩu rồi?{" "}
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-700 font-bold underline-offset-4 hover:underline"
              >
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};
