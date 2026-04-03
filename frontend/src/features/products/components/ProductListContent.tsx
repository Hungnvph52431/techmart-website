// frontend/src/features/products/components/ProductListContent.tsx

import { useEffect, useState } from "react";
import { Product } from "@/types";
import { productService } from "@/services/product.service";
import { ProductCard } from "./ProductCard";
import { useSearchParams } from "react-router-dom";
import { ProductsSort } from "./ProductSort";
import { Pagination } from "./ProductPagination";

export const ProductListContent = () => {
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
          categorySlug: searchParams.get("category")?.toLowerCase() || undefined,
          brandSlug:    searchParams.get("brand")?.toLowerCase()    || undefined,
          search:       searchParams.get("search")                  || undefined,
          sort:         searchParams.get("sort")                    || undefined,
          ram:          searchParams.get("ram")                     || undefined,
          storage:      searchParams.get("storage")                 || undefined,
          chip:         searchParams.get("chip")                    || undefined,
          minPrice:     searchParams.get("minPrice")                || undefined,
          maxPrice:     searchParams.get("maxPrice")                || undefined,
          page,
          limit: 12,
        };

        const data = await productService.getAll(filters) as any;

        if (Array.isArray(data)) {
          setProducts(data);
          setTotalPages(1);
        } else {
          setProducts(data?.data || data?.products || []);
          setTotalPages(data?.totalPages || 1);
        }
      } catch (error) {
        console.error("Lỗi tải danh sách sản phẩm:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchParams, page]);

  return (
    <>
      {/* Sort + đếm kết quả */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          Tìm thấy{" "}
          <span className="text-blue-600 font-black">{products.length}</span>{" "}
          siêu phẩm phù hợp
        </p>
        <ProductsSort />
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-center py-24">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-[10px] font-black text-gray-400 uppercase italic tracking-widest">
            Đang quét kho hàng...
          </p>
        </div>

      ) : products.length === 0 ? (
        <div className="text-center py-24 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
          <div className="text-6xl mb-4 opacity-20 italic font-black">EMPTY</div>
          <p className="text-gray-400 font-black uppercase italic text-xs tracking-widest">
            Hết hàng hoặc không tìm thấy máy nào!
          </p>
        </div>

      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
            {products.map((product) => (
              <ProductCard key={product.productId} product={product} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center pt-12 border-t border-gray-100">
              <Pagination currentPage={page} totalPages={totalPages} />
            </div>
          )}
        </>
      )}
    </>
  );
};