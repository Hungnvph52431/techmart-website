import { useEffect, useState } from "react";
// Đảm bảo đúng đường dẫn đến service và types của Khanh
import { productService } from "@/services/product.service";
import { Product } from "@/types";
import { ProductCard } from "./ProductCard";

// 1. Phải có interface Props này để hết lỗi "Cannot find name 'Props'"
interface Props {
  category: string;
}

export const RelatedProducts = ({ category }: Props) => {
  // 2. useState và Product đã được import ở trên nên sẽ hết lỗi
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        // 3. Dùng categorySlug để khớp với logic Backend chúng ta vừa sửa
        const data = await productService.getAll({ categorySlug: category });
        
        // Vì data trả về là mảng Product[] trực tiếp nên slice luôn
        if (Array.isArray(data)) {
          setProducts(data.slice(0, 4));
        }
      } catch (error) {
        console.error("Lỗi khi tải sản phẩm liên quan:", error);
      }
    };

    loadProducts();
  }, [category]);

  return (
    <div className="mt-16">
      <h2 className="mb-6 text-2xl font-bold">Sản phẩm liên quan</h2>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {products.map((product) => (
          // 4. ProductCard đã được import nên sẽ hết lỗi
          <ProductCard key={product.productId} product={product} />
        ))}
      </div>

      {products.length === 0 && (
        <p className="text-sm text-gray-500">Không có sản phẩm liên quan nào.</p>
      )}
    </div>
  );
};