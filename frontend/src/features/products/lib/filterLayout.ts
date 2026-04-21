const FILTER_KEYS = [
  "search",
  "brand",
  "category",
  "minPrice",
  "maxPrice",
  "chip",
  "ram",
  "storage",
];

export function hasActiveProductLayoutFilters(
  params: URLSearchParams
): boolean {
  return FILTER_KEYS.some((key) => {
    const value = params.get(key);
    return value !== null && value.trim() !== "";
  });
}
