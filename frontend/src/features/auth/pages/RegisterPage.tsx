import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
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
    `w-full px-5 py-4 bg-gray-50 border-2 rounded-2xl text-sm outline-none transition-all ${
      errors[field as keyof typeof errors]
        ? 'border-red-300 focus:border-red-400 bg-red-50/30'
        : 'border-transparent focus:border-blue-400 focus:bg-white'
    }`;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-md mx-auto bg-white rounded-[32px] shadow-xl border border-gray-100 p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-gray-800 uppercase italic tracking-tighter">Đăng ký</h1>
            <p className="text-gray-400 text-sm font-medium mt-2">Tạo tài khoản TechMart của bạn</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Họ và tên */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                Họ và Tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={e => set('fullName', e.target.value)}
                className={inputCls('fullName')}
                placeholder="Nguyễn Văn A"
              />
              {errors.fullName && <p className="text-xs text-red-500 ml-1">{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => set('email', e.target.value)}
                className={inputCls('email')}
                placeholder="example@email.com"
              />
              {errors.email && <p className="text-xs text-red-500 ml-1">{errors.email}</p>}
            </div>

            {/* Mật khẩu */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={e => set('password', e.target.value)}
                  className={`${inputCls('password')} pr-12`}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {/* Rules — luôn hiện */}
              <ul className="mt-1.5 space-y-1 px-1">
                {passwordRules.map(rule => {
                  const passes = rule.test(formData.password);
                  const show = touched.password || formData.password;
                  return (
                    <li key={rule.label} className={`flex items-center gap-1.5 text-xs transition-colors ${
                      !show ? 'text-gray-300'
                      : passes ? 'text-emerald-600'
                      : 'text-red-400'
                    }`}>
                      {passes && show ? <Check size={11} /> : <X size={11} className={!show ? 'opacity-30' : ''} />}
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Nhập lại mật khẩu */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                Nhập lại mật khẩu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={e => set('confirmPassword', e.target.value)}
                  className={`${inputCls('confirmPassword')} pr-12`}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowConfirmPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-500 ml-1">{errors.confirmPassword}</p>}
              {touched.confirmPassword && passwordMatch && formData.confirmPassword && (
                <p className="text-xs text-emerald-600 ml-1 flex items-center gap-1"><Check size={11} /> Mật khẩu khớp</p>
              )}
            </div>

            {/* Số điện thoại */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => set('phone', e.target.value)}
                className={inputCls('phone')}
                placeholder="09xx xxx xxx"
              />
              {errors.phone && <p className="text-xs text-red-500 ml-1">{errors.phone}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-[0.98] disabled:bg-gray-300 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Đang xử lý...' : 'Đăng ký'}
            </button>
          </form>

          <div className="mt-6 text-center pt-6 border-t border-gray-50">
            <p className="text-gray-500 text-sm font-medium">
              Đã có tài khoản?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-bold underline-offset-4 hover:underline">
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};
