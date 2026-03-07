import { useState, useEffect } from 'react';
import { ProductCard } from '../components/ProductCard';
import { productService } from '@/services/product.service';
import { Product } from '@/types';
import { Layout } from '@/components/layout/Layout';
import { useSearchParams } from 'react-router-dom';

export const ProductListPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const filters = {
          category: searchParams.get('category') || undefined,
          brand: searchParams.get('brand') || undefined,
          search: searchParams.get('search') || undefined,
          featured: searchParams.get('featured') === 'true' ? true : undefined,
        };
        const data = await productService.getAll(filters);
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchParams]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Sản phẩm</h1>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Không tìm thấy sản phẩm nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.productId} product={product} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};
