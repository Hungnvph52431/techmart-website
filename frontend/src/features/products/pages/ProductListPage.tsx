import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Product } from "@/types";
import { productService } from "@/services/product.service";
import { ProductCard } from "../components/ProductCard";
import { useSearchParams } from "react-router-dom";
import { ProductsFilter } from "../components/ProductFilter";
import { ProductsSort } from "../components/ProductSort";
import { Pagination } from "../components/ProductPagination";

export const ProductListPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  const [searchParams] = useSearchParams();

  const page = Number(searchParams.get("page")) || 1;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        const filters = {
          category: searchParams.get("category") || undefined,
          brand: searchParams.get("brand") || undefined,
          search: searchParams.get("search") || undefined,
          featured:
            searchParams.get("featured") === "true"
              ? true
              : undefined,
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
  }, [searchParams, page]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">
          Danh sách sản phẩm
        </h1>
        <ProductsFilter />
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            Hiển thị {products.length} sản phẩm
          </p>
          <ProductsSort />
        </div>
        {loading && (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        )}
        {!loading && products.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            Không tìm thấy sản phẩm
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
          <Pagination
            currentPage={page}
            totalPages={totalPages}
          />
        )}

      </div>
    </Layout>
  );
};