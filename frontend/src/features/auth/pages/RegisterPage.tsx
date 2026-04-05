import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { authService } from '@/services/auth.service';
import toast from 'react-hot-toast';

const passwordRules = [
  {
    label: 'Mật khẩu phải từ 8 đến 20 ký tự',
    test: (p: string) => p.length >= 8 && p.length <= 20,
  },
  {
    label: 'Bao gồm số, chữ viết hoa, chữ viết thường',
    test: (p: string) => /[0-9]/.test(p) && /[A-Z]/.test(p) && /[a-z]/.test(p),
  },
  {
    label: 'Bao gồm ít nhất một ký tự đặc biệt !@#$^*()_',
    test: (p: string) => /[!@#$^*()_]/.test(p),
  },
];

export const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    address: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const allRulesPass = passwordRules.every((r) => r.test(formData.password));
    if (!allRulesPass) return;

    if (formData.password !== formData.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword: _, ...payload } = formData;
      await authService.register(payload);
      toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
      navigate('/login');
    } catch (error: any) {
      let errorMessage = error.response?.data?.message || 'Đăng ký thất bại';
      if (
        errorMessage.toLowerCase().includes('already exist') ||
        errorMessage.toLowerCase().includes('duplicate entry')
      ) {
        if (errorMessage.toLowerCase().includes('email')) {
          errorMessage = 'Email đã tồn tại';
        } else if (errorMessage.toLowerCase().includes('phone')) {
          errorMessage = 'Số điện thoại đã tồn tại';
        } else {
          errorMessage = 'Thông tin đã tồn tại';
        }
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getRuleStyle = (passes: boolean) => {
    if (!formData.password && !submitted) return 'text-gray-400';
    if (passes) return 'text-green-500';
    if (submitted) return 'text-red-500';
    return 'text-gray-400';
  };

  const getRuleIcon = (passes: boolean) => {
    if (!formData.password && !submitted) return <Check size={14} />;
    if (passes) return <Check size={14} />;
    if (submitted) return <X size={14} />;
    return <Check size={14} />;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-center mb-8">Đăng ký tài khoản</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                Họ và Tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng nhập họ và tên')}
                onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Nguyễn Văn A"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                required
                onInvalid={(e) => {
                  const target = e.target as HTMLInputElement;
                  if (target.validity.valueMissing) {
                    target.setCustomValidity('Vui lòng nhập email');
                  } else if (target.validity.typeMismatch) {
                    target.setCustomValidity('Vui lòng nhập đúng định dạng email');
                  }
                }}
                onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <ul className="mt-2 space-y-1">
                {passwordRules.map((rule) => {
                  const passes = rule.test(formData.password);
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
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Nhập lại mật khẩu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {submitted && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">Mật khẩu xác nhận không khớp</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng nhập số điện thoại')}
                onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="09xx xxx xxx"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Địa chỉ (Không bắt buộc)
              </label>
              <input
                type="text"
                id="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Số 1, Đường X, Phường Y..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang xử lý...' : 'Đăng ký'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Đã có tài khoản?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};
