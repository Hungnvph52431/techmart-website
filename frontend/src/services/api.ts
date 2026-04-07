import axios from 'axios';

const isLoginRequest = (error: any) => {
  const method = error?.config?.method?.toLowerCase();
  const url = String(error?.config?.url || '');
  return method === 'post' && url.includes('/auth/login');
};

const shouldSkipAuthRedirect = (error: any) => {
  return Boolean((error?.config as any)?.skipAuthRedirect);
};

const api = axios.create({
  // Đảm bảo cổng 5001 khớp với cấu hình Backend của bạn
  baseURL: import.meta.env.VITE_API_URL || 'https://perhaps-robbie-ntsc-proceed.trycloudflare.com/',
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Giữ lại log để Khanh dễ dàng kiểm tra kết nối trong Console
console.log("API BaseURL đang dùng là:", api.defaults.baseURL);

// 1. Request interceptor: Tự động đính kèm Token vào mỗi yêu cầu
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 2. Response interceptor: Xử lý lỗi hệ thống (đặc biệt là lỗi 401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !isLoginRequest(error) &&
      !shouldSkipAuthRedirect(error)
    ) {
      // Đã gộp: Xóa sạch localStorage và cả auth-storage của Zustand
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth-storage'); 
      
      // Đưa người dùng về trang đăng nhập ngay lập tức
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
