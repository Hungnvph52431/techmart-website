// frontend/src/services/notification.service.ts

import api from './api';
import { AppNotification } from '@/types/notification.type';

export const notificationService = {
  list: async (limit = 50): Promise<AppNotification[]> => {
    const res = await api.get('/notifications', { params: { limit } });
    return res.data;
  },

  unreadCount: async (): Promise<number> => {
    const res = await api.get('/notifications/unread-count');
    return res.data?.count ?? 0;
  },

  markRead: async (id: number): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all');
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },
};
