import { useEffect, useState } from "react";
import { productService } from "@/services/product.service";
import { Product } from "@/types";
import { ProductCard } from "./ProductCard";


interface Props {
  category: string;
}

export const RelatedProducts = ({ category }: Props) => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadProducts = async () => {
      const data = await productService.getAll({ category });
      setProducts(data.products.slice(0, 4));
    };

    loadProducts();
  }, [category]);

  return (
    <div className="mt-16">

      <h2 className="text-2xl font-bold mb-6">
        Related Products
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

        {products.map((product) => (
          <ProductCard key={product.productId} product={product} />
        ))}

      </div>

    </div>
  );
};