import { useState, useCallback } from 'react';

export type SortOption = 'popular' | 'newest' | 'price_asc' | 'price_desc';

export interface PricePreset {
  label: string;
  min?: number;
  max?: number;
}

export const PRICE_PRESETS: PricePreset[] = [
  { label: 'Dưới 3 triệu', max: 3_000_000 },
  { label: '3 – 7 triệu', min: 3_000_000, max: 7_000_000 },
  { label: '7 – 15 triệu', min: 7_000_000, max: 15_000_000 },
  { label: '15 – 30 triệu', min: 15_000_000, max: 30_000_000 },
  { label: 'Trên 30 triệu', min: 30_000_000 },
];

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'popular', label: 'Phổ biến' },
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
];

export const useProductFilters = () => {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [appliedPriceRange, setAppliedPriceRange] = useState<{ min?: number; max?: number } | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('popular');

  // Single-select brand (matches single-brand API)
  const selectBrand = useCallback((brandSlug: string) => {
    setSelectedBrand((prev) => (prev === brandSlug ? null : brandSlug));
  }, []);

  const clearBrand = useCallback(() => {
    setSelectedBrand(null);
  }, []);

  // Apply a quick preset – fills inputs AND marks as applied immediately
  const applyPreset = useCallback((preset: PricePreset) => {
    setMinPriceInput(preset.min !== undefined ? String(preset.min / 1_000_000) : '');
    setMaxPriceInput(preset.max !== undefined ? String(preset.max / 1_000_000) : '');
    setAppliedPriceRange({ min: preset.min, max: preset.max });
  }, []);

  // Apply the typed custom values – only triggers after "Áp dụng" is clicked
  const applyCustomPrice = useCallback(() => {
    const min = parseFloat(minPriceInput);
    const max = parseFloat(maxPriceInput);
    const hasMin = !isNaN(min) && min > 0;
    const hasMax = !isNaN(max) && max > 0;
    if (hasMin || hasMax) {
      setAppliedPriceRange({
        min: hasMin ? min * 1_000_000 : undefined,
        max: hasMax ? max * 1_000_000 : undefined,
      });
    } else {
      setAppliedPriceRange(null);
    }
  }, [minPriceInput, maxPriceInput]);

  const clearPrice = useCallback(() => {
    setMinPriceInput('');
    setMaxPriceInput('');
    setAppliedPriceRange(null);
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedBrand(null);
    setMinPriceInput('');
    setMaxPriceInput('');
    setAppliedPriceRange(null);
    setSortBy('popular');
  }, []);

  // Returns true when the given preset exactly matches the currently applied range
  const isActivePreset = useCallback(
    (preset: PricePreset) => {
      if (!appliedPriceRange) return false;
      return appliedPriceRange.min === preset.min && appliedPriceRange.max === preset.max;
    },
    [appliedPriceRange]
  );

  const activeFilterCount = (selectedBrand ? 1 : 0) + (appliedPriceRange !== null ? 1 : 0);

  const toApiParams = () => {
    const params: {
      brand?: string;
      minPrice?: number;
      maxPrice?: number;
      sort?: SortOption;
    } = { sort: sortBy };

    if (selectedBrand) params.brand = selectedBrand;

    if (appliedPriceRange) {
      if (appliedPriceRange.min !== undefined) params.minPrice = appliedPriceRange.min;
      if (appliedPriceRange.max !== undefined) params.maxPrice = appliedPriceRange.max;
    }

    return params;
  };

  return {
    selectedBrand,
    minPriceInput,
    maxPriceInput,
    appliedPriceRange,
    sortBy,
    selectBrand,
    clearBrand,
    setMinPriceInput,
    setMaxPriceInput,
    applyCustomPrice,
    applyPreset,
    clearPrice,
    isActivePreset,
    setSortBy,
    resetFilters,
    activeFilterCount,
    toApiParams,
  };
};
