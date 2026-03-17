import { X, SlidersHorizontal } from 'lucide-react';
import { Brand } from '@/types';
import { SortOption, PRICE_PRESETS } from '@/hooks/useProductFilters';

interface FilterBarProps {
  brands: Brand[];
  selectedBrands: string[];
  pricePresetIndex: number | null;
  sortBy: SortOption;
  activeFilterCount: number;
  onBrandToggle: (slug: string) => void;
  onSelectAllBrands: () => void;
  onPricePresetSelect: (index: number) => void;
  onSortSelect: (sort: SortOption) => void;
  onReset: () => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'popular', label: 'Phổ biến' },
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
];

export const FilterBar = ({
  brands,
  selectedBrands,
  pricePresetIndex,
  sortBy,
  activeFilterCount,
  onBrandToggle,
  onSelectAllBrands,
  onPricePresetSelect,
  onSortSelect,
  onReset,
}: FilterBarProps) => {
  const activePreset = pricePresetIndex !== null ? PRICE_PRESETS[pricePresetIndex] : null;

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 text-gray-700 font-semibold">
          <SlidersHorizontal className="w-4 h-4" />
          <span>Bộ lọc</span>
          {activeFilterCount > 0 && (
            <span className="bg-primary-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Sort Row */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 overflow-x-auto scrollbar-none">
        <span className="flex-none text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">
          Sắp xếp
        </span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSortSelect(opt.value)}
            className={`flex-none px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap
              ${sortBy === opt.value
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Brand Row */}
      {brands.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 overflow-x-auto scrollbar-none">
          <span className="flex-none text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">
            Hãng
          </span>
          <button
            onClick={onSelectAllBrands}
            className={`flex-none px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap
              ${selectedBrands.length === 0
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            Tất cả
          </button>
          {brands.map((brand) => {
            const active = selectedBrands.includes(brand.slug);
            return (
              <button
                key={brand.brandId}
                onClick={() => onBrandToggle(brand.slug)}
                className={`flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap border
                  ${active
                    ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
              >
                {brand.logoUrl ? (
                  <img
                    src={brand.logoUrl}
                    alt={brand.name}
                    className="w-4 h-4 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : null}
                {brand.name}
                {active && <X className="w-3 h-3 ml-0.5 opacity-70" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Price Range Row */}
      <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-none">
        <span className="flex-none text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">
          Giá
        </span>
        {PRICE_PRESETS.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => onPricePresetSelect(idx)}
            className={`flex-none px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap border
              ${pricePresetIndex === idx
                ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
          >
            {preset.label}
            {pricePresetIndex === idx && <X className="inline w-3 h-3 ml-1 opacity-70" />}
          </button>
        ))}
      </div>

      {/* Active filter summary tags */}
      {(selectedBrands.length > 1 || (selectedBrands.length > 0 && activePreset)) && (
        <div className="flex flex-wrap gap-2 px-4 pb-3">
          {selectedBrands.map((slug) => {
            const brand = brands.find((b) => b.slug === slug);
            return (
              <span
                key={slug}
                className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200"
              >
                {brand?.name ?? slug}
                <button onClick={() => onBrandToggle(slug)} className="hover:text-blue-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
