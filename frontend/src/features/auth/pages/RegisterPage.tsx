import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check, X, Cpu, PackageCheck, BadgePercent, HeadphonesIcon } from 'lucide-react';
import { authService } from '@/services/auth.service';
import toast from 'react-hot-toast';

const passwordRules = [
  { label: 'Từ 8 đến 20 ký tự', test: (p: string) => p.length >= 8 && p.length <= 20 },
  { label: 'Có số, chữ viết hoa, chữ viết thường', test: (p: string) => /[0-9]/.test(p) && /[A-Z]/.test(p) && /[a-z]/.test(p) },
  { label: 'Có ký tự đặc biệt !@#$^*()_', test: (p: string) => /[!@#$^*()_]/.test(p) },
];

export const RegisterPage = () => {
  const [formData, setFormData] = useState({
    fullName: '', email: '', password: '', confirmPassword: '', phone: '',
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (field: string, value: string) => {
    setFormData(p => ({ ...p, [field]: value }));
    setTouched(p => ({ ...p, [field]: true }));
  };

  const allRulesPass = passwordRules.every(r => r.test(formData.password));
  const passwordMatch = formData.password === formData.confirmPassword;

  const errors = {
    fullName:        touched.fullName && !formData.fullName.trim()          ? 'Vui lòng nhập họ và tên' : '',
    email:           touched.email    && !formData.email.trim()             ? 'Vui lòng nhập email'
                   : touched.email    && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? 'Email không đúng định dạng' : '',
    password:        touched.password && !allRulesPass                     ? 'Mật khẩu chưa đạt yêu cầu' : '',
    confirmPassword: touched.confirmPassword && !passwordMatch             ? 'Mật khẩu xác nhận không khớp' : '',
    phone:           touched.phone    && !formData.phone.trim()            ? 'Vui lòng nhập số điện thoại'
                   : touched.phone    && !/^(0[3-9])\d{8}$/.test(formData.phone.replace(/\s/g,'')) ? 'Số điện thoại không hợp lệ' : '',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mark all touched
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true, phone: true });

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) return;
    if (!allRulesPass || !passwordMatch) return;

    setLoading(true);
    try {
      const { confirmPassword: _, ...payload } = formData;
      await authService.register(payload);
      toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
      navigate('/login');
    } catch (error: any) {
      let msg = error.response?.data?.message || 'Đăng ký thất bại';
      if (msg.toLowerCase().includes('email')) msg = 'Email đã được sử dụng';
      else if (msg.toLowerCase().includes('phone')) msg = 'Số điện thoại đã được sử dụng';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field: string) =>
    `w-full px-4 py-3.5 rounded-xl border text-sm text-gray-800 placeholder-gray-300 outline-none transition-shadow ${
      errors[field as keyof typeof errors]
        ? 'border-red-300 bg-red-50/40 focus:ring-2 focus:ring-red-200'
        : 'border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
    }`;

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-[46%] relative flex-col justify-between overflow-hidden bg-[#0f172a] px-14 py-12">
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[380px] h-[380px] rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute top-2/3 left-1/4 w-[200px] h-[200px] rounded-full bg-sky-400/10 blur-2xl" />
        </div>
        {/* Grid */}
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
            <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-3">Tham gia cộng đồng</p>
            <h2 className="text-5xl font-black text-white leading-[1.15] tracking-tight">
              Đăng ký<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-300">
                miễn phí!
              </span>
            </h2>
            <p className="text-slate-400 text-base mt-5 leading-relaxed max-w-xs">
              Tạo tài khoản ngay hôm nay để nhận ưu đãi độc quyền và theo dõi đơn hàng dễ dàng.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: PackageCheck,     label: 'Theo dõi đơn hàng theo thời gian thực', color: 'text-emerald-400' },
              { icon: BadgePercent,     label: 'Nhận voucher & ưu đãi thành viên',        color: 'text-yellow-400'  },
              { icon: HeadphonesIcon,   label: 'Hỗ trợ khách hàng 24/7',                 color: 'text-sky-400'     },
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

        <div className="relative z-10">
          <p className="text-slate-600 text-xs">© 2025 TechMart · Công nghệ cho mọi người</p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-[440px]">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 justify-center mb-8">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
              <Cpu size={18} className="text-white" />
            </div>
            <span className="text-gray-900 font-black text-xl tracking-tight">TechMart</span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 px-10 py-10">
            <div className="mb-7">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Tạo tài khoản</h1>
              <p className="text-gray-400 text-sm mt-1.5">Điền thông tin bên dưới để bắt đầu</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Họ và tên */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Họ và Tên <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={e => set('fullName', e.target.value)}
                  className={inputCls('fullName')}
                  placeholder="Nguyễn Văn A"
                />
                {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => set('email', e.target.value)}
                  className={inputCls('email')}
                  placeholder="email@example.com"
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>

              {/* Số điện thoại */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Số điện thoại <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => set('phone', e.target.value)}
                  className={inputCls('phone')}
                  placeholder="09xx xxx xxx"
                />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>

              {/* Mật khẩu */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Mật khẩu <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => set('password', e.target.value)}
                    className={`${inputCls('password')} pr-11`}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {/* Password rules */}
                <ul className="mt-2 space-y-1">
                  {passwordRules.map(rule => {
                    const passes = rule.test(formData.password);
                    const show = touched.password || !!formData.password;
                    return (
                      <li key={rule.label} className={`flex items-center gap-1.5 text-xs transition-colors ${
                        !show ? 'text-gray-300' : passes ? 'text-emerald-600' : 'text-red-400'
                      }`}>
                        {passes && show
                          ? <Check size={11} strokeWidth={3} />
                          : <X size={11} strokeWidth={3} className={!show ? 'opacity-30' : ''} />}
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Xác nhận mật khẩu */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Xác nhận mật khẩu <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={e => set('confirmPassword', e.target.value)}
                    className={`${inputCls('confirmPassword')} pr-11`}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
                {touched.confirmPassword && passwordMatch && formData.confirmPassword && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <Check size={11} strokeWidth={3} /> Mật khẩu khớp
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-[0.98] disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                    Đang xử lý...
                  </span>
                ) : 'Tạo tài khoản'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-gray-500 text-sm">
                Đã có tài khoản?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                  Đăng nhập
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Bằng cách đăng ký, bạn đồng ý với{' '}
            <Link to="/policy" className="underline hover:text-gray-600 transition-colors">Điều khoản sử dụng</Link>
            {' '}của TechMart.
          </p>
        </div>
      </div>
    </div>
  );
};
