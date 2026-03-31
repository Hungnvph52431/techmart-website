import api from './api';

export interface VietnamProvince {
  code: string;
  name: string;
  fullName: string;
  slug: string;
  type: string;
}

export interface VietnamWard {
  code: string;
  name: string;
  fullName: string;
  slug: string;
  type: string;
  provinceCode: string;
  provinceName: string;
}

export const locationService = {
  getProvinces: async (search?: string): Promise<VietnamProvince[]> => {
    const response = await api.get('/locations/provinces', {
      params: search ? { search } : undefined,
    });

    return response.data;
  },

  getWardsByProvince: async (
    provinceCode: string,
    search?: string
  ): Promise<VietnamWard[]> => {
    const response = await api.get(
      `/locations/provinces/${provinceCode}/wards`,
      {
        params: search ? { search } : undefined,
      }
    );

    return response.data;
  },
};
