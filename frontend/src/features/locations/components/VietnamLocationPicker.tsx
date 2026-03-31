import type { VietnamProvince, VietnamWard } from '@/services/location.service';

interface VietnamLocationPickerProps {
  provinceCode: string;
  wardCode: string;
  provinces: VietnamProvince[];
  wards: VietnamWard[];
  loadingProvinces?: boolean;
  loadingWards?: boolean;
  disabled?: boolean;
  error?: string | null;
  onProvinceChange: (provinceCode: string) => void;
  onWardChange: (wardCode: string) => void;
}

const selectClassName =
  'w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400';

export const VietnamLocationPicker = ({
  provinceCode,
  wardCode,
  provinces,
  wards,
  loadingProvinces = false,
  loadingWards = false,
  disabled = false,
  error,
  onProvinceChange,
  onWardChange,
}: VietnamLocationPickerProps) => (
  <div className="space-y-3">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-xs font-black uppercase tracking-widest text-gray-400">
          Tỉnh/Thành phố *
        </label>
        <select
          value={provinceCode}
          onChange={(event) => onProvinceChange(event.target.value)}
          disabled={disabled || loadingProvinces}
          className={selectClassName}
        >
          <option value="">
            {loadingProvinces ? 'Đang tải tỉnh/thành...' : 'Chọn tỉnh/thành phố'}
          </option>
          {provinces.map((province) => (
            <option key={province.code} value={province.code}>
              {province.fullName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-black uppercase tracking-widest text-gray-400">
          Phường/Xã *
        </label>
        <select
          value={wardCode}
          onChange={(event) => onWardChange(event.target.value)}
          disabled={disabled || !provinceCode || loadingWards}
          className={selectClassName}
        >
          <option value="">
            {!provinceCode
              ? 'Chọn tỉnh/thành trước'
              : loadingWards
                ? 'Đang tải phường/xã...'
                : 'Chọn phường/xã'}
          </option>
          {wards.map((ward) => (
            <option key={ward.code} value={ward.code}>
              {ward.fullName}
            </option>
          ))}
        </select>
      </div>
    </div>

    {error && (
      <p className="text-xs font-bold text-rose-500">
        {error}
      </p>
    )}
  </div>
);
