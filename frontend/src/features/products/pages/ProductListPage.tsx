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

  // Lấy trang hiện tại từ URL
  const page = Number(searchParams.get("page")) || 1;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        // Chuẩn bị tham số lọc khớp với Backend
        const filters = {
          categorySlug: searchParams.get("category") || undefined,
          brandSlug: searchParams.get("brand") || undefined,
          search: searchParams.get("search") || undefined,
          isFeatured: searchParams.get("featured") === "true" ? true : undefined,
          sort: searchParams.get("sort") || undefined, // Thêm sort nếu có
          page,
          limit: 12, // Tăng số lượng sản phẩm mỗi trang cho cân đối
        };

        const data = await productService.getAll(filters) as any;

        // Xử lý an toàn cho định dạng trả về của API
        if (Array.isArray(data)) {
          setProducts(data);
          setTotalPages(1);
        } else {
          setProducts(data?.products || []);
          setTotalPages(data?.totalPages || 1);
        }
      } catch (error) {
        console.error("Lỗi tải danh sách sản phẩm:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchParams, page]); // Tự động tải lại khi đổi trang hoặc đổi bộ lọc

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h1 className="text-3xl font-black text-gray-800 uppercase italic tracking-tight">
            Danh sách sản phẩm
          </h1>
          <ProductsSort />
        </div>
        
        {/* Bộ lọc theo hãng và tìm kiếm */}
        <div className="mb-8">
          <ProductsFilter />
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm font-medium text-gray-500">
            Tìm thấy <span className="text-blue-600 font-bold">{products.length}</span> sản phẩm phù hợp
          </p>
        </div>
        
        {loading ? (
          <div className="text-center py-24">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-400 font-bold italic uppercase text-xs tracking-widest">Đang quét kho hàng...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">
            <div className="text-6xl mb-4 opacity-20">📱</div>
            <p className="text-gray-500 font-bold italic text-lg">Hết hàng hoặc không tìm thấy sản phẩm nào!</p>
          </div>
        ) : (
          <>
            {/* Grid sản phẩm responsive */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
              {products.map((product) => (
                <ProductCard
                  key={product.productId} // Sử dụng productId chuẩn
                  product={product}
                />
              ))}
            </div>
            
            {/* Thanh điều hướng trang */}
            {totalPages > 1 && (
              <div className="flex justify-center pt-8 border-t border-gray-100">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                />
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};