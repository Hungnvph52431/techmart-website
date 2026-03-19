// frontend/src/services/banner.service.ts

import api from './api';
import { Banner } from '@/types/banner';

export const bannerService = {
  // Storefront: lấy banner đang active theo vị trí
  getActive: async (position?: string): Promise<Banner[]> => {
    const params = position ? { position } : {};
    const res = await api.get('/banners', { params });
    return res.data;
  },

  // Admin: lấy tất cả banner
  getAll: async (position?: string): Promise<Banner[]> => {
    const params = position ? { position } : {};
    const res = await api.get('/admin/banners', { params });
    return res.data;
  },

  getById: async (id: number): Promise<Banner> => {
    const res = await api.get(`/admin/banners/${id}`);
    return res.data;
  },

  // Create - dùng FormData để upload ảnh
  create: async (formData: FormData): Promise<Banner> => {
    const res = await api.post('/admin/banners', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // Update - dùng FormData để có thể đổi ảnh
  update: async (id: number, formData: FormData): Promise<Banner> => {
    const res = await api.put(`/admin/banners/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/banners/${id}`);
  },

  toggle: async (id: number): Promise<Banner> => {
    const res = await api.patch(`/admin/banners/${id}/toggle`);
    return res.data;
  },
};
