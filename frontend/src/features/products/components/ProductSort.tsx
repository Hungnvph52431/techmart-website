import { useSearchParams } from "react-router-dom";
import { ArrowUpDown } from "lucide-react";

export const ProductsSort = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = searchParams.get("sort") || "";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const params: any = Object.fromEntries(searchParams.entries());
    if (!value) {
      delete params.sort;
    } else {
      params.sort = value;
    }
    params.page = "1";
    setSearchParams(params);
  };

  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown size={15} className="text-gray-400" />
      <span className="text-sm font-semibold text-gray-500">Sắp xếp:</span>
      <select
        value={sort}
        onChange={handleChange}
        className="border border-gray-200 bg-white px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:border-blue-400 cursor-pointer"
      >
        <option value="">Mặc định</option>
        <option value="price-asc">Giá tăng dần</option>
        <option value="price-desc">Giá giảm dần</option>
        <option value="rating">Đánh giá cao</option>
        <option value="newest">Mới nhất</option>
      </select>
    </div>
  );
};