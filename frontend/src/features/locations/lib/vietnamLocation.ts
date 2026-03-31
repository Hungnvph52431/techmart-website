import type { VietnamProvince, VietnamWard } from '@/services/location.service';

const ADMIN_PREFIXES = [
  'thanh pho',
  'tp',
  'tinh',
  'phuong',
  'xa',
  'thi tran',
  'thi xa',
];

export const normalizeVietnamLocationName = (value?: string | null) => {
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

export const resolveProvinceByCityName = (
  provinces: VietnamProvince[],
  city?: string | null
) => {
  const normalizedCity = normalizeVietnamLocationName(city);
  if (!normalizedCity) return null;

  return (
    provinces.find((province) =>
      [
        province.name,
        province.fullName,
        province.slug,
      ].some(
        (candidate) =>
          normalizeVietnamLocationName(candidate) === normalizedCity
      )
    ) ?? null
  );
};

export const resolveWardByName = (
  wards: VietnamWard[],
  wardName?: string | null
) => {
  const normalizedWard = normalizeVietnamLocationName(wardName);
  if (!normalizedWard) return null;

  return (
    wards.find((ward) =>
      [ward.name, ward.fullName, ward.slug].some(
        (candidate) =>
          normalizeVietnamLocationName(candidate) === normalizedWard
      )
    ) ?? null
  );
};
