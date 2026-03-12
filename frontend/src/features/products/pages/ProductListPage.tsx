import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Product } from "@/types";
import { productService } from "@/services/product.service";
import { ProductCard } from "../components/ProductCard";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Pagination } from "../components/ProductPagination";
import { ProductsSort } from "../components/ProductSort";

import {
  FaList,
  FaTag,
  FaFilter,
  FaShareAlt,
  FaFacebookF,
  FaTwitter,
  FaLinkedinIn,
} from "react-icons/fa";

export const ProductListPage = () => {

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const page = Number(searchParams.get("page")) || 1;
  const category = searchParams.get("category") || "";
  const brand = searchParams.get("brand") || "";
  const minPrice = Number(searchParams.get("minPrice")) || undefined;
  const maxPrice = Number(searchParams.get("maxPrice")) || undefined;

  useEffect(() => {

    const fetchProducts = async () => {
      try {
        setLoading(true);
        const filters = {
          category,
          brand,
          minPrice,
          maxPrice,
          page,
          limit: 8,
        };

        const data = await productService.getAll(filters);

        setProducts(data.products || []);
        setTotalPages(data.totalPages || 1);

      } catch (error) {
        console.error("Fetch product error:", error);
      } finally {

        setLoading(false);

      }
    };

    fetchProducts();

  }, [category, brand, minPrice, maxPrice, page]);

  /* FILTER FUNCTIONS */
  const handleCategoryFilter = (value: string) => {
    navigate(`?category=${value}`);
  };

  const handleBrandFilter = (value: string) => {
    navigate(`?brand=${value}`);
  };

  const handlePriceFilter = (min: number, max: number) => {
    navigate(`?minPrice=${min}&maxPrice=${max}`);
  };

  return (

    <Layout>

      <div className="container mx-auto px-4 py-8">

        <div className="flex gap-8">

          {/* SIDEBAR */}
          <div className="w-64 space-y-6">

            {/* DANH MỤC */}
            <div>

              <div className="bg-blue-600 text-white p-2 font-semibold flex items-center gap-2">
                <FaList />
                Danh mục
              </div>

              <ul className="border p-3 space-y-2">

                <li
                  onClick={() => handleCategoryFilter("iphone")}
                  className={`cursor-pointer transition-all duration-200 hover:text-blue-600 hover:pl-2 ${
                    category === "iphone" ? "text-blue-600 font-semibold" : ""
                  }`}
                >
                  iPhone
                </li>

                <li
                  onClick={() => handleCategoryFilter("samsung")}
                  className={`cursor-pointer transition-all duration-200 hover:text-blue-600 hover:pl-2 ${
                    category === "samsung" ? "text-blue-600 font-semibold" : ""
                  }`}
                >
                  Samsung
                </li>

                <li
                  onClick={() => handleCategoryFilter("xiaomi")}
                  className={`cursor-pointer transition-all duration-200 hover:text-blue-600 hover:pl-2 ${
                    category === "xiaomi" ? "text-blue-600 font-semibold" : ""
                  }`}
                >
                  Xiaomi
                </li>

                <li
                  onClick={() => handleCategoryFilter("oppo")}
                  className={`cursor-pointer transition-all duration-200 hover:text-blue-600 hover:pl-2 ${
                    category === "oppo" ? "text-blue-600 font-semibold" : ""
                  }`}
                >
                  Oppo
                </li>

                <li
                  onClick={() => handleCategoryFilter("vivo")}
                  className={`cursor-pointer transition-all duration-200 hover:text-blue-600 hover:pl-2 ${
                    category === "vivo" ? "text-blue-600 font-semibold" : ""
                  }`}
                >
                  Vivo
                </li>

              </ul>

            </div>

            {/* THƯƠNG HIỆU */}
            <div>
              <div className="bg-blue-600 text-white p-2 font-semibold flex items-center gap-2">
                <FaTag />
                Thương hiệu
              </div>

              <div className="grid grid-cols-2 gap-3 border p-3">

                {/* Apple */}
                <button
                  onClick={() => handleBrandFilter("apple")}
                  className={`border h-14 flex items-center justify-center rounded transition hover:shadow hover:border-blue-500 ${
                    brand === "apple" ? "border-blue-500" : ""
                  }`}
                >
                  <img
                    src="/brands/thuong-hieu-apple.png"
                    alt="Apple"
                    className="h-80 object-contain"
                  />
                </button>

                {/* Samsung */}
                <button
                  onClick={() => handleBrandFilter("samsung")}
                  className={`border h-14 flex items-center justify-center rounded transition hover:shadow hover:border-blue-500 ${
                    brand === "samsung" ? "border-blue-500" : ""
                  }`}
                >
                  <img
                    src="/brands/thuong-hieu-samsung.png"
                    alt="Samsung"
                    className="h-80 object-contain"
                  />
                </button>

                {/* Xiaomi */}
                <button
                  onClick={() => handleBrandFilter("xiaomi")}
                  className={`border h-14 flex items-center justify-center rounded transition hover:shadow hover:border-blue-500 ${
                    brand === "xiaomi" ? "border-blue-500" : ""
                  }`}
                >
                  <img
                    src="/brands/thuong-hieu-xiaomi.png"
                    alt="Xiaomi"
                    className="h-10 object-contain"
                  />
                </button>

                {/* Oppo */}
                <button
                  onClick={() => handleBrandFilter("oppo")}
                  className={`border h-14 flex items-center justify-center rounded transition hover:shadow hover:border-blue-500 ${
                    brand === "oppo" ? "border-blue-500" : ""
                  }`}
                >
                  <img
                    src="/brands/thuong-hieu-oppo.png"
                    alt="Oppo"
                    className="h-12 object-contain"
                  />
                </button>

                {/* Vivo */}
                <button
                  onClick={() => handleBrandFilter("vivo")}
                  className={`border h-14 flex items-center justify-center rounded transition hover:shadow hover:border-blue-500 ${
                    brand === "vivo" ? "border-blue-500" : ""
                  }`}
                >
                  <img
                    src="/brands/thuong-hieu-vivo.png"
                    alt="Vivo"
                    className="h-5 object-contain"
                  />
                </button>

              </div>
            </div>

            {/* BỘ LỌC GIÁ */}
            <div>

              <div className="bg-blue-600 text-white p-2 font-semibold flex items-center gap-2">
                <FaFilter />
                Bộ lọc giá
              </div>

              <div className="border p-3 space-y-2">

                <button
                  onClick={() => handlePriceFilter(0, 5000000)}
                  className="block w-full text-left hover:text-blue-600"
                >
                  Dưới 5 triệu
                </button>

                <button
                  onClick={() => handlePriceFilter(5000000, 10000000)}
                  className="block w-full text-left hover:text-blue-600"
                >
                  5 - 10 triệu
                </button>

                <button
                  onClick={() => handlePriceFilter(10000000, 20000000)}
                  className="block w-full text-left hover:text-blue-600"
                >
                  10 - 20 triệu
                </button>

                <button
                  onClick={() => handlePriceFilter(20000000, 50000000)}
                  className="block w-full text-left hover:text-blue-600"
                >
                  Trên 20 triệu
                </button>

              </div>

            </div>

            {/* KẾT NỐI */}
            <div>

              <div className="bg-blue-600 text-white p-2 font-semibold flex items-center gap-2">
                <FaShareAlt />
                Kết nối
              </div>

              <div className="border p-3 flex gap-3">

                <a className="border p-2 rounded hover:bg-gray-100">
                  <FaFacebookF />
                </a>

                <a className="border p-2 rounded hover:bg-gray-100">
                  <FaTwitter />
                </a>

                <a className="border p-2 rounded hover:bg-gray-100">
                  <FaLinkedinIn />
                </a>

              </div>

            </div>

          </div>

          {/* PRODUCT LIST */}
          <div className="flex-1">

            <div className="flex justify-between items-center mb-6">

              <h2 className="text-2xl font-bold">
                Danh Sách Sản phẩm
              </h2>
              
              <ProductsSort />
            </div>

            {loading && (
              <div className="text-center py-20">
                Loading...
              </div>
            )}

            {!loading && products.length === 0 && (
              <div className="text-center py-20 text-gray-500">
                Không có sản phẩm
              </div>
            )}

            {!loading && products.length > 0 && (

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">

                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                  />
                ))}
              </div>
            )}

            {!loading && totalPages > 1 && (

              <div className="mt-8">

                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                />

              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};