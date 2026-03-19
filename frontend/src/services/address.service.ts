// src/services/address.service.ts

import api from './api';

export interface Address {
  addressId: number;
  userId: number;
  fullName: string;
  phone: string;
  addressLine: string;
  ward: string;
  district: string;
  city: string;
  isDefault: boolean;
}

export interface CreateAddressPayload {
  fullName: string;
  phone: string;
  addressLine: string;
  ward: string;
  district: string;
  city: string;
  isDefault?: boolean;
}

export type UpdateAddressPayload = Partial<CreateAddressPayload>;

export const addressService = {
  getMyAddresses: async (): Promise<Address[]> => {
    const res = await api.get('/addresses');
    return res.data;
  },

  create: async (payload: CreateAddressPayload): Promise<Address> => {
    const res = await api.post('/addresses', payload);
    return res.data;
  },

  update: async (addressId: number, payload: UpdateAddressPayload): Promise<Address> => {
    const res = await api.put(`/addresses/${addressId}`, payload);
    return res.data;
  },

  delete: async (addressId: number): Promise<void> => {
    await api.delete(`/addresses/${addressId}`);
  },

  setDefault: async (addressId: number): Promise<void> => {
    await api.patch(`/addresses/${addressId}/default`);
  },
};
