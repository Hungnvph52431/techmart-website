import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import { brandService, type Brand } from "@/services/brand.service";

const FILTER_GROUPS = [
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
    key: "chip", label: "Chip xử lý", paramKey: "chip", multi: true,
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

const getValues = (csv: string): string[] => (csv ? csv.split(",") : []);
const toggleInCsv = (csv: string, value: string): string => {
  const arr = getValues(csv);
  const idx = arr.indexOf(value);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(value);
  return arr.join(",");
};

// Đảm bảo tên export này trùng khớp với import ở ProductListPage
export const ProductsFilter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [tempFilters, setTempFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    brandService.getAll()
      .then((data) => setBrands((data || []).filter((b: Brand) => b.isActive)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const current: Record<string, string> = {};
    FILTER_GROUPS.forEach((g) => {
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

  const updateParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    next.set("page", "1");
    setSearchParams(next);
  };

  const toggleTemp = (group: (typeof FILTER_GROUPS)[0], value: string) => {
    setTempFilters((prev) => {
      const key = group.paramKey;
      if (group.multi) return { ...prev, [key]: toggleInCsv(prev[key] || "", value) };
      return { ...prev, [key]: prev[key] === value ? "" : value };
    });
  };

  const applyFilters = () => {
    const updates: Record<string, string> = {};
    FILTER_GROUPS.forEach((g) => {
      if (g.key === "price") {
        const priceVal = tempFilters.price || "";
        const [min, max] = priceVal.split("-");
        updates.minPrice = min || "";
        updates.maxPrice = max || "";
      } else {
        updates[g.paramKey] = tempFilters[g.paramKey] || "";
      }
    });
    updateParams(updates);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Thương hiệu</h3>
        <div className="grid grid-cols-2 gap-2">
          {brands.map((b) => {
            const isSelected = searchParams.get("brand") === b.slug;
            return (
              <button
                key={b.brandId}
                onClick={() => updateParams({ brand: isSelected ? "" : b.slug! })}
                className={`py-2 px-1 rounded-xl border text-[11px] font-bold transition-all ${
                  isSelected ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100" : "bg-gray-50 border-transparent text-gray-500 hover:border-gray-200"
                }`}
              >
                {b.name}
              </button>
            );
          })}
        </div>
      </div>
      {FILTER_GROUPS.map((g) => (
        <div key={g.key} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">{g.label}</h3>
          <div className="space-y-3">
            {g.options.map((opt) => {
              const isActive = getValues(tempFilters[g.paramKey] || "").includes(opt.value);
              return (
                <button key={opt.value} onClick={() => toggleTemp(g, opt.value)} className="flex items-center w-full group">
                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                    isActive ? "bg-blue-600 border-blue-600" : "border-gray-200 group-hover:border-blue-400 bg-gray-50"
                  }`}>
                    {isActive && <Check size={12} className="text-white stroke-[3px]" />}
                  </div>
                  <span className={`ml-3 text-sm font-semibold ${isActive ? "text-blue-600" : "text-gray-500 group-hover:text-gray-900"}`}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <button onClick={applyFilters} className="w-full py-4 rounded-2xl bg-gray-900 text-white text-xs font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl active:scale-95">
        Lọc kết quả
      </button>
    </div>
  );
};