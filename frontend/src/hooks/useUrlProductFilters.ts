import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SortOption, PRICE_PRESETS, SORT_OPTIONS, PricePreset } from './useProductFilters';

export type { SortOption, PricePreset };
export { PRICE_PRESETS, SORT_OPTIONS };

/**
 * URL-synced version of useProductFilters.
 * URL is the single source of truth. Clicking nav links that update
 * URL params will automatically reflect in the sidebar.
 */
export const useUrlProductFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Derived directly from URL – no local state for these
  const selectedBrand = searchParams.get('brand') || null;
  const sortBy = (searchParams.get('sort') as SortOption) || 'popular';
  const urlMinPrice = searchParams.get('minPrice');
  const urlMaxPrice = searchParams.get('maxPrice');

  const appliedPriceRange =
    urlMinPrice || urlMaxPrice
      ? {
          min: urlMinPrice ? Number(urlMinPrice) : undefined,
          max: urlMaxPrice ? Number(urlMaxPrice) : undefined,
        }
      : null;

  // Local state only for the text input fields
  const [minPriceInput, setMinPriceInput] = useState(
    urlMinPrice ? String(Number(urlMinPrice) / 1_000_000) : ''
  );
  const [maxPriceInput, setMaxPriceInput] = useState(
    urlMaxPrice ? String(Number(urlMaxPrice) / 1_000_000) : ''
  );

  // Keep input fields in sync when URL changes from external navigation
  useEffect(() => {
    setMinPriceInput(urlMinPrice ? String(Number(urlMinPrice) / 1_000_000) : '');
    setMaxPriceInput(urlMaxPrice ? String(Number(urlMaxPrice) / 1_000_000) : '');
  }, [urlMinPrice, urlMaxPrice]);

  const selectBrand = useCallback(
    (brandSlug: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (next.get('brand') === brandSlug) next.delete('brand');
        else next.set('brand', brandSlug);
        return next;
      });
    },
    [setSearchParams]
  );

  const clearBrand = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('brand');
      return next;
    });
  }, [setSearchParams]);

  const setSortBy = useCallback(
    (sort: SortOption) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('sort', sort);
        return next;
      });
    },
    [setSearchParams]
  );

  // Apply a quick preset → updates inputs + URL simultaneously
  const applyPreset = useCallback(
    (preset: PricePreset) => {
      setMinPriceInput(preset.min !== undefined ? String(preset.min / 1_000_000) : '');
      setMaxPriceInput(preset.max !== undefined ? String(preset.max / 1_000_000) : '');
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (preset.min !== undefined) next.set('minPrice', String(preset.min));
        else next.delete('minPrice');
        if (preset.max !== undefined) next.set('maxPrice', String(preset.max));
        else next.delete('maxPrice');
        return next;
      });
    },
    [setSearchParams]
  );

  // Apply the typed custom values only when user clicks "Áp dụng"
  const applyCustomPrice = useCallback(() => {
    const min = parseFloat(minPriceInput);
    const max = parseFloat(maxPriceInput);
    const hasMin = !isNaN(min) && min > 0;
    const hasMax = !isNaN(max) && max > 0;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (hasMin) next.set('minPrice', String(min * 1_000_000));
      else next.delete('minPrice');
      if (hasMax) next.set('maxPrice', String(max * 1_000_000));
      else next.delete('maxPrice');
      return next;
    });
  }, [minPriceInput, maxPriceInput, setSearchParams]);

  const clearPrice = useCallback(() => {
    setMinPriceInput('');
    setMaxPriceInput('');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('minPrice');
      next.delete('maxPrice');
      return next;
    });
  }, [setSearchParams]);

  const resetFilters = useCallback(() => {
    setMinPriceInput('');
    setMaxPriceInput('');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('brand');
      next.delete('minPrice');
      next.delete('maxPrice');
      next.delete('sort');
      return next;
    });
  }, [setSearchParams]);

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
      category?: string;
      search?: string;
      featured?: boolean;
      minPrice?: number;
      maxPrice?: number;
      sort?: SortOption;
    } = { sort: sortBy };

    if (selectedBrand) params.brand = selectedBrand;
    if (appliedPriceRange?.min !== undefined) params.minPrice = appliedPriceRange.min;
    if (appliedPriceRange?.max !== undefined) params.maxPrice = appliedPriceRange.max;

    // Pass-through URL params that the sidebar doesn't manage
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const featured = searchParams.get('featured');
    if (category) params.category = category;
    if (search) params.search = search;
    if (featured === 'true') params.featured = true;

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
