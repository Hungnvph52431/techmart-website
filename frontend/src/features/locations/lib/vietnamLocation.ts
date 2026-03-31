import type { VietnamProvince, VietnamWard } from '@/services/location.service';

// Hàm gọt giũa chuỗi cực mạnh
export const normalizeForMatch = (str?: string | null) => {
  if (!str) return '';
  
  // 1. Chữ thường, bỏ dấu tiếng Việt
  let normalized = str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();

  // 2. Cắt bỏ các tiền tố hành chính phổ biến
  const prefixes = ['thanh pho ', 'tp ', 'tinh ', 'quan ', 'huyen ', 'thi xa ', 'tx ', 'phuong ', 'xa ', 'thi tran ', 'tt '];
  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.replace(prefix, '').trim();
      break; 
    }
  }

  // 3. Xóa TOÀN BỘ khoảng trắng và ký tự đặc biệt (chỉ giữ lại chữ và số)
  // "Quảng Ninh" -> "quangninh"
  return normalized.replace(/[^a-z0-9]/g, '');
};

export const resolveProvinceByCityName = (provinces: VietnamProvince[], city?: string | null) => {
  if (!city || provinces.length === 0) return null;
  const target = normalizeForMatch(city);

  return provinces.find((p) => {
    const nameMatch = normalizeForMatch(p.name);
    const fullMatch = p.fullName ? normalizeForMatch(p.fullName) : '';
    
    // So sánh: Giống nhau y hệt, hoặc chuỗi này nằm trong chuỗi kia
    return nameMatch === target || 
           (fullMatch && fullMatch === target) || 
           target.includes(nameMatch) || 
           nameMatch.includes(target);
  }) ?? null;
};

export const resolveWardByName = (wards: VietnamWard[], wardName?: string | null) => {
  if (!wardName || wards.length === 0) return null;
  const target = normalizeForMatch(wardName);

  return wards.find((w) => {
    const nameMatch = normalizeForMatch(w.name);
    const fullMatch = w.fullName ? normalizeForMatch(w.fullName) : '';
    
    return nameMatch === target || 
           (fullMatch && fullMatch === target) || 
           target.includes(nameMatch) || 
           nameMatch.includes(target);
  }) ?? null;
};