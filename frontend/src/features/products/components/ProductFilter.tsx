import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import { brandService, type Brand } from "@/services/brand.service";
import { categoryService, type Category } from "@/services/category.service";
import { ProductListContent } from "./ProductListContent";

const FILTER_GROUPS: {
  key: string;
  label: string;
  paramKey: string;
  multi: boolean;
  options: { value: string; label: string }[];
}[] = [
  {
    key: "price", label: "Mức giá", paramKey: "price", multi: false,
    options: [
      { value: "0-5000000", label: "Dưới 5 triệu" },
      { value: "5000000-10000000", label: "5 - 10 triệu" },
      { value: "10000000-20000000", label: "10 - 20 triệu" },
      { value: "20000000-30000000", label: "20 - 30 triệu" },
      { value: "30000000-", label: "Trên 30 triệu" },
    ],
  },
  {
    key: "chip", label: "Chip xử lí", paramKey: "chip", multi: true,
    options: [
      { value: "Snapdragon", label: "Snapdragon" },
      { value: "Apple A", label: "Apple A" },
      { value: "Dimensity", label: "Dimensity" },
      { value: "Helio", label: "Helio" },
      { value: "Exynos", label: "Exynos" },
      { value: "Unisoc", label: "Unisoc" },
    ],
  },
  {
    key: "ram", label: "Dung lượng RAM", paramKey: "ram", multi: true,
    options: [
      { value: "3GB", label: "3 GB" },
      { value: "4GB", label: "4 GB" },
      { value: "6GB", label: "6 GB" },
      { value: "8GB", label: "8 GB" },
      { value: "12GB", label: "12 GB" },
      { value: "16GB", label: "16 GB" },
    ],
  },
  {
    key: "storage", label: "Bộ nhớ trong", paramKey: "storage", multi: true,
    options: [
      { value: "64GB", label: "64 GB" },
      { value: "128GB", label: "128 GB" },
      { value: "256GB", label: "256 GB" },
      { value: "512GB", label: "512 GB" },
      { value: "1TB", label: "1 TB" },
    ],
  },
];

const getValues = (csv: string): string[] => csv ? csv.split(",") : [];
const toggleInCsv = (csv: string, value: string): string => {
  const arr = getValues(csv);
  const idx = arr.indexOf(value);
  if (idx >= 0) arr.splice(idx, 1); else arr.push(value);
  return arr.join(",");
};

export const ProductsFilter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showPanel, setShowPanel] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [childCategories, setChildCategories] = useState<Category[]>([]);
  const [tempFilters, setTempFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    brandService.getAll()
      .then(data => setBrands((data || []).filter((b: Brand) => b.isActive)))
      .catch(() => {});
    categoryService.getAll()
      .then(data => setChildCategories((data || []).filter((c: Category) => !c.parentId && c.isActive !== false)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const current: Record<string, string> = {};
    FILTER_GROUPS.forEach(g => {
      if (g.key === "price") {
        const min = searchParams.get("minPrice");
        const max = searchParams.get("maxPrice");
        if (min || max) current.price = `${min || "0"}-${max || ""}`;
      } else {
        const val = searchParams.get(g.paramKey);
        if (val) current[g.paramKey] = val;
      }
    });
    setTempFilters(current);
  }, [searchParams]);

  const brand = searchParams.get("brand") || "";
  const category = searchParams.get("category") || "";

  const realActiveCount = FILTER_GROUPS.filter(g => {
    if (g.key === "price") return searchParams.get("minPrice") || searchParams.get("maxPrice");
    return searchParams.get(g.paramKey);
  }).length;

  const updateParams = (updates: Record<string, string>) => {
    const current: Record<string, string> = {};
    searchParams.forEach((v, k) => { current[k] = v; });
    const next = { ...current, ...updates, page: "1" };
    Object.keys(next).forEach(k => { if (!next[k]) delete next[k]; });
    setSearchParams(next);
  };

  const toggleTemp = (group: typeof FILTER_GROUPS[0], value: string) => {
    setTempFilters(prev => {
      const key = group.paramKey;
      if (group.multi) {
        return { ...prev, [key]: toggleInCsv(prev[key] || "", value) };
      }
      return { ...prev, [key]: prev[key] === value ? "" : value };
    });
  };

  const applyFilters = () => {
    const updates: Record<string, string> = {};
    FILTER_GROUPS.forEach(g => {
      if (g.key === "price") {
        const priceVal = tempFilters.price || "";
        if (priceVal) {
          const [min, max] = priceVal.split("-");
          updates.minPrice = min || "";
          updates.maxPrice = max || "";
        } else {
          updates.minPrice = "";
          updates.maxPrice = "";
        }
        updates.price = "";
      } else {
        updates[g.paramKey] = tempFilters[g.paramKey] || "";
      }
    });
    updateParams(updates);
    setShowPanel(false);
  };

  const resetFilters = () => setTempFilters({});

  const clearAll = () => {
    setTempFilters({});
    setSearchParams({ page: "1" });
    setShowPanel(false);
  };

  const hasAnyFilter = brand || category || realActiveCount > 0 || searchParams.get("search");

  return (
    // Layout 3/10 - 7/10
    <div className="flex gap-4 items-start">

      {/* ── Cột 3/10: Sidebar thương hiệu ── */}
      <aside className="w-[15%] shrink-0 bg-white rounded-2xl border border-gray-100 p-4 sticky top-4">
  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Thương hiệu</h3>
  
   {/* Nút Tất cả */}
    <button
      onClick={() => updateParams({ brand: "" })}
      className={`w-full flex items-center justify-start px-3 py-2.5 rounded-xl text-base font-semibold border transition-all mb-2 ${
        !brand
          ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-200"
          : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100"
      }`}
    >
      Tất cả
    </button>

    {/* Danh sách thương hiệu - 1 cột, căn trái */}
    <div className="flex flex-col gap-1.5">
      {brands.map(b => (
        <button
          key={b.brandId}
          onClick={() => updateParams({ brand: brand === b.slug ? "" : b.slug! })}
          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-base font-semibold border transition-all ${
            brand === b.slug
              ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-200"
              : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100"
          }`}
        >
          {b.logoUrl && (
            <img
              src={b.logoUrl.startsWith('/') ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001'}${b.logoUrl}` : b.logoUrl}
              alt=""
              className="w-5 h-5 object-contain shrink-0"
            />
          )}
          <span className="truncate text-left">{b.name}</span>
        </button>
      ))}
    </div>
  </aside>

      {/* ── Cột 7/10: Danh mục + Bộ lọc + Sản phẩm ── */}
      <div className="w-[85%] min-w-0 space-y-3">

        {/* Danh mục + Bộ lọc */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">

          {/* Category pills */}
          {childCategories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-wide mr-1">Danh mục:</span>
              <button
                onClick={() => updateParams({ category: "" })}
                className={`px-3.5 py-1.5 rounded-xl text-base font-semibold border transition-all ${
                  !category
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                }`}
              >
                Tất cả
              </button>
              {childCategories.map(c => (
                <button
                  key={c.categoryId}
                  onClick={() => updateParams({ category: category === c.slug ? "" : c.slug })}
                  className={`px-3.5 py-1.5 rounded-xl text-base font-semibold border transition-all ${
                    category === c.slug
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowPanel(p => !p)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                showPanel
                  ? "border-red-400 bg-red-50 text-red-600"
                  : realActiveCount > 0
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              <SlidersHorizontal size={15} />
              Bộ lọc
              {realActiveCount > 0 && (
                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold">
                  {realActiveCount}
                </span>
              )}
            </button>

            {/* Active filter tags */}
            {FILTER_GROUPS.map(g => {
              let val = "";
              if (g.key === "price") {
                const min = searchParams.get("minPrice");
                const max = searchParams.get("maxPrice");
                if (min || max) val = `${min || "0"}-${max || ""}`;
              } else {
                val = searchParams.get(g.paramKey) || "";
              }
              if (!val) return null;

              const values = getValues(val);
              const labels = values.map(v => g.options.find(o => o.value === v)?.label || v);

              return (
                <span key={g.key} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-100">
                  {g.label}: {labels.join(", ")}
                  <button
                    onClick={() => {
                      if (g.key === "price") {
                        updateParams({ minPrice: "", maxPrice: "", price: "" });
                      } else {
                        updateParams({ [g.paramKey]: "" });
                      }
                    }}
                    className="text-blue-400 hover:text-blue-700 ml-0.5"
                  >
                    <X size={11} />
                  </button>
                </span>
              );
            })}

            {hasAnyFilter && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-semibold text-red-500 border border-red-100 bg-red-50 hover:bg-red-100 transition-colors ml-auto"
              >
                <X size={13} /> Xóa lọc
              </button>
            )}
          </div>

          {/* Filter panel */}
          {showPanel && (
            <div className="pt-3 border-t border-gray-100">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {FILTER_GROUPS.map(g => {
                  const activeValues = getValues(tempFilters[g.paramKey] || "");
                  return (
                    <div key={g.key}>
                      <h4 className="text-sm font-bold text-gray-800 mb-2">{g.label}</h4>
                      <div className="flex flex-wrap gap-2">
                        {g.options.map(opt => {
                          const isActive = activeValues.includes(opt.value);
                          return (
                            <button
                              key={opt.value}
                              onClick={() => toggleTemp(g, opt.value)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                                isActive
                                  ? "border-blue-500 bg-blue-50 text-blue-700"
                                  : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-5 pt-4 border-t border-gray-100">
                <button
                  onClick={resetFilters}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all"
                >
                  Reset
                </button>
                <button
                  onClick={applyFilters}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all"
                >
                  Xem kết quả
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Danh sách sản phẩm ── */}
        <ProductListContent />

      </div>
      {/* kết thúc cột 7/10 */}

    </div>
    // kết thúc flex container
  );
};