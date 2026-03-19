const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') 
  || 'http://localhost:5001';

export const getImageUrl = (url: string | null | undefined): string => {
  if (!url) return '/placeholder.jpg'; // ảnh mặc định khi không có
  
  // Đã là URL đầy đủ (http/https) → giữ nguyên
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  
  // Chỉ là path → ghép với backend URL
  return `${BACKEND_URL}${url}`;
};