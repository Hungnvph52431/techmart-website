import { useSearchParams } from "react-router-dom";

export const ProductsSort = () => {

  const [searchParams, setSearchParams] = useSearchParams();
  const sort = searchParams.get("sort") || "";
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params: any = Object.fromEntries(searchParams.entries());
    params.sort = e.target.value;
    params.page = "1";

    setSearchParams(params);
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-600">Sắp xếp:</span>
      <select
        value={sort}
        onChange={handleChange}
        className="border px-3 py-2 rounded"
      >
        <option value="">Mặc định</option>

        <option value="price-asc">
          Giá tăng dần
        </option>

        <option value="price-desc">
          Giá giảm dần
        </option>

        <option value="rating">
          Đánh giá cao
        </option>

        <option value="newest">
          Mới nhất
        </option>

      </select>

    </div>
  );
};