import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";

export const ProductsFilter = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") || "";
  const brand = searchParams.get("brand") || "";

  // Hàm xử lý khi nhấn nút "Tìm"
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.search as HTMLInputElement;

    setSearchParams({
      search: input.value,
      brand, // Giữ nguyên hãng đang chọn khi tìm kiếm
      page: "1",
    });
  };

  // Hàm cập nhật bộ lọc hãng dựa trên slug trong bảng brands
  const changeBrand = (value: string) => {
  const params: any = { page: "1" };
  if (search) params.search = search;
  if (value) params.brand = value; // Phải là chữ 'brand', không được là 'category'
  setSearchParams(params);
};

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      {/* Form tìm kiếm */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-4">
        <input
          name="search"
          defaultValue={search}
          placeholder="Tìm sản phẩm..."
          className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-primary-500 outline-none"
        />
        <button className="bg-primary-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-primary-700 transition">
          <Search size={16} />
          Tìm
        </button>
      </form>
      
      {/* Danh sách các nút lọc theo hãng */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => changeBrand("")}
          className={`px-4 py-1.5 border rounded-full transition ${
            brand === "" ? "bg-primary-600 text-white border-primary-600" : "hover:bg-gray-50 text-gray-600"
          }`}
        >
          Tất cả
        </button>

        {/* Nút lọc cho Apple */}
        <button
          onClick={() => changeBrand("apple")}
          className={`px-4 py-1.5 border rounded-full transition ${
            brand === "apple" ? "bg-primary-600 text-white border-primary-600" : "hover:bg-gray-50 text-gray-600"
          }`}
        >
          Apple
        </button>

        {/* Nút lọc cho Samsung */}
        <button
              onClick={() => changeBrand("samsung")} // Dùng chữ 'samsung' viết thường 100%
              className={`px-4 py-1.5 border rounded-full transition ${
                brand === "samsung" ? "bg-primary-600 text-white" : ""
              }`}
            >
              Samsung
            </button>

        {/* Nút lọc cho Xiaomi */}
        <button
          onClick={() => changeBrand("xiaomi")}
          className={`px-4 py-1.5 border rounded-full transition ${
            brand === "xiaomi" ? "bg-primary-600 text-white border-primary-600" : "hover:bg-gray-50 text-gray-600"
          }`}
        >
          Xiaomi
        </button>

        {/* Nút lọc cho OPPO */}
        <button
          onClick={() => changeBrand("oppo")}
          className={`px-4 py-1.5 border rounded-full transition ${
            brand === "oppo" ? "bg-primary-600 text-white border-primary-600" : "hover:bg-gray-50 text-gray-600"
          }`}
        >
          OPPO
        </button>
      </div>
    </div>
  );
};