import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Cpu, ShieldCheck, Zap, Star } from 'lucide-react';
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
      setAuth(result.user, result.token);
      toast.success('Đăng nhập thành công!');
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
    <div className="min-h-screen flex">
      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between overflow-hidden bg-[#0f172a] px-16 py-12">
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-sky-500/10 blur-2xl" />
        </div>

        {/* Grid lines overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/40">
            <Cpu size={20} className="text-white" />
          </div>
          <span className="text-white font-black text-2xl tracking-tight">TechMart</span>
        </div>

        {/* Hero */}
        <div className="relative z-10 space-y-10">
          <div>
            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">Nền tảng mua sắm công nghệ</p>
            <h2 className="text-5xl font-black text-white leading-[1.15] tracking-tight">
              Chào mừng<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-300">
                trở lại!
              </span>
            </h2>
            <p className="text-slate-400 text-base mt-5 leading-relaxed max-w-sm">
              Đăng nhập để tiếp tục trải nghiệm mua sắm thông minh cùng hàng ngàn sản phẩm chính hãng.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: ShieldCheck, label: 'Bảo hành chính hãng 12–24 tháng', color: 'text-emerald-400' },
              { icon: Zap,         label: 'Giao hàng siêu tốc toàn quốc',    color: 'text-yellow-400' },
              { icon: Star,        label: 'Hơn 50.000 khách hàng tin tưởng', color: 'text-sky-400' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={15} className={color} />
                </div>
                <span className="text-slate-300 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-slate-600 text-xs">© 2025 TechMart · Công nghệ cho mọi người</p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 justify-center mb-10">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
              <Cpu size={18} className="text-white" />
            </div>
            <span className="text-gray-900 font-black text-xl tracking-tight">TechMart</span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 px-10 py-10">
            <div className="mb-8">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Đăng nhập</h1>
              <p className="text-gray-400 text-sm mt-1.5">Nhập thông tin tài khoản của bạn để tiếp tục</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                  placeholder="email@example.com"
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Mật khẩu
                  </label>
                  <Link to="/forgot-password" className="text-xs font-medium text-blue-500 hover:text-blue-600 transition-colors">
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
                    placeholder="••••••••"
                    className="w-full px-4 py-3.5 pr-11 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-[0.98] disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                    Đang xác thực...
                  </span>
                ) : 'Đăng nhập'}
              </button>
            </form>

            <div className="mt-7 pt-6 border-t border-gray-100 text-center">
              <p className="text-gray-500 text-sm">
                Chưa có tài khoản?{' '}
                <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                  Tạo tài khoản mới
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Bằng cách đăng nhập, bạn đồng ý với{' '}
            <Link to="/policy" className="underline hover:text-gray-600 transition-colors">Điều khoản sử dụng</Link>
            {' '}của TechMart.
          </p>
        </div>
      </div>
    </div>
  );
};