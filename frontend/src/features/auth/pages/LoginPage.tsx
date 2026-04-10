import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await authService.login(email, password);
      // Lưu thông tin vào Zustand Store
      setAuth(result.user, result.token);
      toast.success('Đăng nhập thành công!');
      
      // LOGIC ĐIỀU HƯỚNG THÔNG MINH:
      // 1. Nếu là Admin/Staff -> Vào thẳng trang quản trị
      // 2. Nếu là Khách -> Quay lại trang trước đó (ví dụ: Checkout) hoặc vào trang Đơn hàng
      if (result.user.role === 'shipper') {
        navigate('/shipper');
      } else if (result.user.role !== 'customer') {
        navigate('/admin');
      } else {
        const redirectTarget = (location.state as any)?.from || '/';
        navigate(redirectTarget);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Email hoặc mật khẩu không chính xác');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto bg-white rounded-[32px] shadow-xl border border-gray-100 p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-gray-800 uppercase italic tracking-tighter">Đăng nhập</h1>
            <p className="text-gray-400 text-sm font-medium mt-2">Chào mừng bạn trở lại với TechMart</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="text-[10px] font-black text-gray-400 uppercase ml-1">
                Email tài khoản
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="khanh@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="text-[10px] font-black text-gray-400 uppercase ml-1">
                  Mật khẩu bảo mật
                </label>
                <Link to="/forgot-password" className="text-[10px] font-bold text-blue-500 hover:text-blue-700 uppercase">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full px-5 py-4 pr-12 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-[0.98] disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang xác thực...' : 'Vào hệ thống'}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-gray-50">
            <p className="text-gray-500 text-sm font-medium">
              Chưa có tài khoản TechMart?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700 font-bold underline-offset-4 hover:underline">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};