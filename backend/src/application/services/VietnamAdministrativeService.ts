import provinceData from '../../infrastructure/data/vietnam-administrative/province.json';
import wardData from '../../infrastructure/data/vietnam-administrative/ward.json';

type RawProvinceMap = Record<string, RawProvince>;
type RawWardMap = Record<string, RawWard>;

interface RawProvince {
  code: string;
  name: string;
  name_with_type: string;
  slug: string;
  type: string;
}

interface RawWard {
  code: string;
  name: string;
  name_with_type: string;
  slug: string;
  type: string;
  parent_code: string;
  path: string;
  path_with_type: string;
}

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

export interface ValidatedVietnamLocation {
  province: VietnamProvince;
  ward: VietnamWard;
}

const ADMIN_PREFIXES = [
  'thanh pho',
  'tp',
  'tinh',
  'phuong',
  'xa',
  'thi tran',
  'thi xa',
];

const normalizeVietnamName = (value?: string | null) => {
  if (!value) return '';

  let normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const prefix of ADMIN_PREFIXES) {
    if (normalized === prefix) return '';
    if (normalized.startsWith(`${prefix} `)) {
      normalized = normalized.slice(prefix.length + 1).trim();
      break;
    }
  }

  return normalized;
};

const uniqueAliases = (...values: Array<string | undefined>) =>
  Array.from(
    new Set(values.map((value) => normalizeVietnamName(value)).filter(Boolean))
  );

export class VietnamAdministrativeService {
  private readonly provinces: VietnamProvince[];
  private readonly provinceByCode = new Map<string, VietnamProvince>();
  private readonly provinceAliases = new Map<string, VietnamProvince>();
  private readonly wardsByProvince = new Map<string, VietnamWard[]>();

  constructor() {
    this.provinces = Object.values(provinceData as RawProvinceMap)
      .map((province) => ({
        code: province.code,
        name: province.name,
        fullName: province.name_with_type,
        slug: province.slug,
        type: province.type,
      }))
      .sort((left, right) => left.name.localeCompare(right.name, 'vi'));

    for (const province of this.provinces) {
      this.provinceByCode.set(province.code, province);

      for (const alias of uniqueAliases(
        province.name,
        province.fullName,
        province.slug
      )) {
        this.provinceAliases.set(alias, province);
      }
    }

    for (const ward of Object.values(wardData as RawWardMap)) {
      const province = this.provinceByCode.get(ward.parent_code);
      if (!province) continue;

      const normalizedWard: VietnamWard = {
        code: ward.code,
        name: ward.name,
        fullName: ward.name_with_type,
        slug: ward.slug,
        type: ward.type,
        provinceCode: province.code,
        provinceName: province.name,
      };

      const provinceWards = this.wardsByProvince.get(province.code) ?? [];
      provinceWards.push(normalizedWard);
      this.wardsByProvince.set(province.code, provinceWards);
    }

    for (const [provinceCode, wards] of this.wardsByProvince.entries()) {
      wards.sort((left, right) => left.name.localeCompare(right.name, 'vi'));
      this.wardsByProvince.set(provinceCode, wards);
    }
  }

  listProvinces(search?: string) {
    const keyword = normalizeVietnamName(search);
    if (!keyword) return this.provinces;

    return this.provinces.filter((province) =>
      uniqueAliases(province.name, province.fullName, province.slug).some((alias) =>
        alias.includes(keyword)
      )
    );
  }

  listWardsByProvince(provinceCode: string, search?: string) {
    const wards = this.wardsByProvince.get(provinceCode) ?? [];
    const keyword = normalizeVietnamName(search);

    if (!keyword) return wards;

    return wards.filter((ward) =>
      uniqueAliases(ward.name, ward.fullName, ward.slug).some((alias) =>
        alias.includes(keyword)
      )
    );
  }

  findProvinceByCode(provinceCode: string) {
    return this.provinceByCode.get(provinceCode) ?? null;
  }

  resolveProvinceByName(city: string) {
    return this.provinceAliases.get(normalizeVietnamName(city)) ?? null;
  }

  resolveWardByName(wardName: string, provinceCode: string) {
    const normalizedWardName = normalizeVietnamName(wardName);
    if (!normalizedWardName) return null;

    return (
      this.listWardsByProvince(provinceCode).find((ward) =>
        uniqueAliases(ward.name, ward.fullName, ward.slug).includes(
          normalizedWardName
        )
      ) ?? null
    );
  }

  validateCurrentSelection(input: {
    city?: string | null;
    ward?: string | null;
  }): ValidatedVietnamLocation {
    const province = this.resolveProvinceByName(input.city ?? '');
    if (!province) {
      throw new Error('Tỉnh/thành phố giao hàng không hợp lệ');
    }

    const ward = this.resolveWardByName(input.ward ?? '', province.code);
    if (!ward) {
      throw new Error('Phường/xã giao hàng không thuộc tỉnh/thành phố đã chọn');
    }

    return { province, ward };
  }

  getSummary() {
    const wardCount = Array.from(this.wardsByProvince.values()).reduce(
      (total, wards) => total + wards.length,
      0
    );

    return {
      provinceCount: this.provinces.length,
      wardCount,
    };
  }
}

export { normalizeVietnamName };
