import axios from 'axios';

// 👉 Dùng link Cloudflare mới của bạn
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Debug
console.log("API BaseURL đang dùng là:", api.defaults.baseURL);

// ================= REQUEST =================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ================= RESPONSE =================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 👉 Handle CORS / Network lỗi rõ hơn
    if (!error.response) {
      console.error("❌ Network / CORS error:", error.message);
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth-storage');

      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;