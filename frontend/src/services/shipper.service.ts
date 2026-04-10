import api from './api';

export type DeliveryStatus =
  | 'WAITING_PICKUP'
  | 'PICKED_UP'
  | 'IN_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETURNING'
  | 'RETURNED';

export type DeliveryFailReason =
  | 'VACANT'
  | 'WRONG_ADDRESS'
  | 'CUSTOMER_REFUSED'
  | 'OTHER';

export interface ShipperOrder {
  orderId: number;
  orderCode: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingWard?: string;
  shippingDistrict?: string;
  shippingCity: string;
  total: number;
  paymentMethod: string;
  status: string;
  deliveryStatus: DeliveryStatus;
  codAmount: number;
  codCollected: boolean;
  failReason?: DeliveryFailReason;
  deliveryPhotoUrl?: string;
  attemptCount: number;
  orderDate: string;
}

export interface ShipperOrderDetail extends ShipperOrder {
  items: Array<{
    order_detail_id: number;
    product_name: string;
    variant_name?: string;
    sku?: string;
    price: number;
    quantity: number;
    subtotal: number;
    product_image?: string;
  }>;
  deliveryAttempts: Array<{
    id: number;
    status: 'SUCCESS' | 'FAILED';
    failReason?: DeliveryFailReason;
    photoUrl?: string;
    note?: string;
    attemptedAt: string;
  }>;
  customerName?: string;
  customerPhone?: string;
}

export interface CODSummary {
  totalOrders: number;
  totalCodAmount: number;
  collectedAmount: number;
  pendingAmount: number;
}

export interface ShipperStats {
  totalDelivered: number;
  totalFailed: number;
  successRate: number;
  totalCodCollected: number;
}

export const shipperService = {
  getOrders: async (params?: {
    status?: DeliveryStatus;
    date?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/shipper/orders', { params });
    return response.data as { success: boolean; data: { items: ShipperOrder[]; total: number; page: number; limit: number } };
  },

  getOrderDetail: async (id: number) => {
    const response = await api.get(`/shipper/orders/${id}`);
    return response.data as { success: boolean; data: ShipperOrderDetail };
  },

  pickup: async (id: number) => {
    const response = await api.patch(`/shipper/orders/${id}/pickup`);
    return response.data;
  },

  startDelivery: async (id: number) => {
    const response = await api.patch(`/shipper/orders/${id}/start-delivery`);
    return response.data;
  },

  complete: async (id: number, payload: { photoUrl: string; codCollected?: boolean }) => {
    const response = await api.patch(`/shipper/orders/${id}/complete`, payload);
    return response.data;
  },

  fail: async (id: number, payload: { failReason: DeliveryFailReason; note?: string }) => {
    const response = await api.patch(`/shipper/orders/${id}/fail`, payload);
    return response.data;
  },

  retryDelivery: async (id: number) => {
    const response = await api.patch(`/shipper/orders/${id}/retry-delivery`);
    return response.data;
  },

  returnToWarehouse: async (id: number) => {
    const response = await api.patch(`/shipper/orders/${id}/return-to-warehouse`);
    return response.data;
  },

  getTodayCOD: async () => {
    const response = await api.get('/shipper/cod/today');
    return response.data as { success: boolean; data: CODSummary };
  },

  getStats: async (from: string, to: string) => {
    const response = await api.get('/shipper/stats', { params: { from, to } });
    return response.data as { success: boolean; data: ShipperStats };
  },
};
