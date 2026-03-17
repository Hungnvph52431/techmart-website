import { X, SlidersHorizontal, ChevronLeft } from 'lucide-react';
import { Brand } from '@/types';
import { PricePreset, PRICE_PRESETS } from '@/hooks/useProductFilters';

interface FilterSidebarProps {
  brands: Brand[];
  selectedBrand: string | null;
  minPriceInput: string;
  maxPriceInput: string;
  appliedPriceRange: { min?: number; max?: number } | null;
  activeFilterCount: number;
  isActivePreset: (preset: PricePreset) => boolean;
  onBrandSelect: (slug: string) => void;
  onClearBrand: () => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onApplyCustomPrice: () => void;
  onApplyPreset: (preset: PricePreset) => void;
  onClearPrice: () => void;
  onReset: () => void;
  isDrawer?: boolean;
  onClose?: () => void;
}

export const FilterSidebar = ({
  brands,
  selectedBrand,
  minPriceInput,
  maxPriceInput,
  appliedPriceRange,
  activeFilterCount,
  isActivePreset,
  onBrandSelect,
  onClearBrand,
  onMinPriceChange,
  onMaxPriceChange,
  onApplyCustomPrice,
  onApplyPreset,
  onClearPrice,
  onReset,
  isDrawer = false,
  onClose,
}: FilterSidebarProps) => {
  const isPriceSet = appliedPriceRange !== null;

  const containerClass = isDrawer
    ? 'bg-white h-full shadow-xl overflow-y-auto'
    : 'bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden';

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <SlidersHorizontal className="w-4 h-4" />
          <span>Bộ lọc</span>
          {activeFilterCount > 0 && (
            <span className="bg-primary-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={onReset}
              className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
              Xóa tất cả
            </button>
          )}
          {isDrawer && onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Đóng bộ lọc"
            >
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* ── Brand Section ── */}
      <div className="border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Thương hiệu
          </span>
          {selectedBrand && (
            <button
              onClick={onClearBrand}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Bỏ chọn
            </button>
          )}
        </div>

        <div className="px-3 pb-3 space-y-0.5 max-h-52 overflow-y-auto">
          {/* All brands option */}
          <button
            onClick={onClearBrand}
            className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
              ${!selectedBrand
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
              }`}
          >
            <span
              className={`w-4 h-4 rounded-full border-2 flex-none transition-colors
                ${!selectedBrand ? 'border-primary-500 bg-primary-500' : 'border-gray-300'}`}
            />
            Tất cả thương hiệu
          </button>

          {brands.map((brand) => {
            const active = selectedBrand === brand.slug;
            return (
              <button
                key={brand.brandId}
                onClick={() => onBrandSelect(brand.slug)}
                className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
                  ${active
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <span
                  className={`w-4 h-4 rounded-full border-2 flex-none transition-colors
                    ${active ? 'border-primary-500 bg-primary-500' : 'border-gray-300'}`}
                />
                {brand.logoUrl && (
                  <img
                    src={brand.logoUrl}
                    alt={brand.name}
                    className="w-4 h-4 object-contain flex-none"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <span className="truncate">{brand.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Price Range Section ── */}
      <div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Khoảng giá
          </span>
          {isPriceSet && (
            <button
              onClick={onClearPrice}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Xóa
            </button>
          )}
        </div>

        {/* Quick presets */}
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {PRICE_PRESETS.map((preset, idx) => {
            const active = isActivePreset(preset);
            return (
              <button
                key={idx}
                onClick={() => onApplyPreset(preset)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all
                  ${active
                    ? 'bg-primary-50 border-primary-400 text-primary-700 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
              >
                {preset.label}
                {active && <X className="inline w-3 h-3 ml-0.5 opacity-70" />}
              </button>
            );
          })}
        </div>

        {/* Custom range inputs */}
        <div className="px-3 pb-4 pt-1">
          <p className="text-xs text-gray-400 mb-2">Nhập khoảng giá (triệu đồng):</p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                min="0"
                placeholder="Từ"
                value={minPriceInput}
                onChange={(e) => onMinPriceChange(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 transition-colors"
              />
            </div>
            <span className="text-gray-400 text-sm flex-none">–</span>
            <div className="relative flex-1">
              <input
                type="number"
                min="0"
                placeholder="Đến"
                value={maxPriceInput}
                onChange={(e) => onMaxPriceChange(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 transition-colors"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center mt-1">triệu đồng</p>

          <button
            onClick={onApplyCustomPrice}
            className="mt-2 w-full py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Áp dụng
          </button>

          {isPriceSet && appliedPriceRange && (
            <p className="text-xs text-primary-600 text-center mt-2 font-medium">
              {appliedPriceRange.min !== undefined
                ? `Từ ${(appliedPriceRange.min / 1_000_000).toLocaleString('vi-VN')} triệu`
                : 'Không giới hạn'}
              {' – '}
              {appliedPriceRange.max !== undefined
                ? `đến ${(appliedPriceRange.max / 1_000_000).toLocaleString('vi-VN')} triệu`
                : 'Không giới hạn'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
