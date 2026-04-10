import { useEffect, useState } from "react";
import { productService } from "@/services/product.service";
import { Product } from "@/types";
import { ProductCard } from "./ProductCard";

interface Props {
  categoryId: number;
}

export const RelatedProducts = ({ categoryId }: Props) => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await productService.getAll({ categoryId: Number(categoryId) }) as any;
        
        const list: Product[] = Array.isArray(data)
          ? data
          : (data?.data || data?.products || []);

        setProducts(list.slice(0, 5));
      } catch (error) {
        console.error("Lỗi khi tải sản phẩm liên quan:", error);
      }
    };

    if (categoryId) loadProducts();
  }, [categoryId]);

  return (
    <div className="mt-16">
      <h2 className="mb-6 text-2xl font-bold">Sản phẩm liên quan</h2>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {products.map((product) => (
          <ProductCard key={product.productId} product={product} />
        ))}
      </div>

      {products.length === 0 && (
        <p className="text-sm text-gray-500">Không có sản phẩm liên quan nào.</p>
      )}
    </div>
  );
};