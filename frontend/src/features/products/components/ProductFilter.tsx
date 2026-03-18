import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";

export const ProductsFilter = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.search as HTMLInputElement;

    setSearchParams({
      search: input.value,
      category,
      page: "1",
    });
  };

  const changeCategory = (value: string) => {
    const params: any = {
      page: "1",
    };

    if (search) params.search = search;
    if (value) params.category = value;

    setSearchParams(params);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <form onSubmit={handleSearch} className="flex gap-3 mb-4">
        <input
          name="search"
          defaultValue={search}
          placeholder="Tìm sản phẩm..."
          className="border px-4 py-2 rounded w-full"
        />
        <button className="bg-primary-600 text-white px-4 py-2 rounded flex items-center gap-2">
          <Search size={16} />
          Tìm
        </button>
      </form>
      
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => changeCategory("")}
          className={`px-3 py-1 border rounded ${
            category === "" ? "bg-primary-600 text-white" : ""
          }`}
        >
          Tất cả
        </button>

        <button
          onClick={() => changeCategory("iphone")}
          className={`px-3 py-1 border rounded ${
            category === "iphone" ? "bg-primary-600 text-white" : ""
          }`}
        >
          Iphone
        </button>

        <button
          onClick={() => changeCategory("samsung")}
          className={`px-3 py-1 border rounded ${
            category === "samsung" ? "bg-primary-600 text-white" : ""
          }`}
        >
          Samsung
        </button>

        <button
          onClick={() => changeCategory("xiaomi")}
          className={`px-3 py-1 border rounded ${
            category === "xiaomi" ? "bg-primary-600 text-white" : ""
          }`}
        >
          Xiaomi
        </button>

      </div>
    </div>
  );
};