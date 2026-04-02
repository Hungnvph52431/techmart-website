import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { Layout } from "@/components/layout/Layout";
import { Product } from "@/types";
import { productService } from "@/services/product.service";

import { ProductCard } from "../components/ProductCard";
import { ProductsFilter } from "../components/ProductFilter";
import { ProductsSort } from "../components/ProductSort";
import { Pagination } from "../components/ProductPagination";

export const ProductListPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  const [searchParams] = useSearchParams();

  const currentPage = Number(searchParams.get("page")) || 1;
  const searchQuery = searchParams.get("search")?.trim() || "";

  const categorySlug =
    searchParams.get("categorySlug")?.toLowerCase() ||
    searchParams.get("category")?.toLowerCase() ||
    undefined;

  const brandSlug =
    searchParams.get("brandSlug")?.toLowerCase() ||
    searchParams.get("brand")?.toLowerCase() ||
    undefined;

  const sort = searchParams.get("sort") || undefined;

  const isFeatured = searchParams.get("isFeatured") === "true";
  const isNew = searchParams.get("isNew") === "true";
  const isBestseller = searchParams.get("isBestseller") === "true";
  const onSale = searchParams.get("onSale") === "true";

  const filters = useMemo(
    () => ({
      search: searchQuery || undefined,
      categorySlug, 
      brandSlug,
      sort,
      isFeatured: isFeatured || undefined,
      isNew: isNew || undefined,
      isBestseller: isBestseller || undefined,
      onSale: onSale || undefined,

      // Filter chi tiết
      ram: searchParams.get("ram") || undefined,
      storage: searchParams.get("storage") || undefined,
      chip: searchParams.get("chip") || undefined,
      need: searchParams.get("need") || undefined,
      feature: searchParams.get("feature") || undefined,
      minPrice: searchParams.get("minPrice") || undefined,
      maxPrice: searchParams.get("maxPrice") || undefined,

      page: currentPage,
      limit: 12,
    }),
    [searchParams],
  );

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        const data = (await productService.getAll(filters)) as any;

        if (Array.isArray(data)) {
          setProducts(data);
          setTotalPages(1);
        } else {
          setProducts(data?.data || data?.products || []);
          setTotalPages(data?.totalPages || 1);
        }
      } catch (error) {
        console.error("Lỗi tải danh sách sản phẩm:", error);
        setProducts([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [filters]);

  const pageTitle = searchQuery
    ? `Kết quả tìm kiếm cho "${searchQuery}"`
    : categorySlug
      ? `Danh mục: ${categorySlug.toUpperCase()}`
      : "Tất cả sản phẩm";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h1 className="text-3xl font-black text-gray-800 uppercase italic tracking-tight">
            {pageTitle}
          </h1>
          <ProductsSort />
        </div>

        <div className="mb-6">
          <ProductsFilter />
        </div>

        <div className="flex items-center justify-between mb-6">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Tìm thấy{" "}
            <span className="text-blue-600 font-black">{products.length}</span>{" "}
            sản phẩm
            {searchQuery && ` cho "${searchQuery}"`}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-24">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-sm text-gray-500">Đang tải sản phẩm...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
            <div className="text-6xl mb-4 opacity-20 italic font-black">
              EMPTY
            </div>
            <p className="text-gray-500 font-medium">
              Không tìm thấy sản phẩm nào phù hợp với bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-12">
              {products.map((product) => (
                <ProductCard key={product.productId} product={product} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center pt-12 border-t border-gray-100">
                <Pagination currentPage={currentPage} totalPages={totalPages} />
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};
