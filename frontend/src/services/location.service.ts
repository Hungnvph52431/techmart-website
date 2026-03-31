import axios from 'axios';

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

// Sử dụng API mở chuyên về địa chính Việt Nam (rất nhanh và ổn định)
const OPEN_API_URL = 'https://provinces.open-api.vn/api';

export const locationService = {
  // Lấy danh sách Tỉnh/Thành
  getProvinces: async (): Promise<VietnamProvince[]> => {
    const response = await axios.get(`${OPEN_API_URL}/p/`);
    return response.data.map((p: any) => ({
      code: p.code.toString(),
      name: p.name,
      fullName: p.name,
      slug: p.codename,
      type: p.division_type
    }));
  },

  // Lấy danh sách Phường/Xã thuộc một Tỉnh
  getWardsByProvince: async (provinceCode: string): Promise<VietnamWard[]> => {
    // Lấy thông tin Tỉnh kèm theo toàn bộ Quận/Huyện và Phường/Xã (depth=3)
    const response = await axios.get(`${OPEN_API_URL}/p/${provinceCode}?depth=3`);
    
    const allWards: VietnamWard[] = [];
    // Duyệt qua danh sách quận huyện (districts)
    response.data.districts.forEach((d: any) => {
      // Duyệt qua danh sách phường xã (wards) của từng quận huyện
      d.wards.forEach((w: any) => {
        allWards.push({
          code: w.code.toString(),
          name: w.name,
          fullName: w.name,
          slug: w.codename,
          type: w.division_type,
          provinceCode: provinceCode,
          provinceName: response.data.name
        });
      });
    });
    return allWards;
  },
};