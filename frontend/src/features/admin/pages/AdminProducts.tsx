import { useEffect, useState } from 'react';
import { productService } from '@/services/product.service';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface ProductResponse {
  product_id: number;
  name: string;
  slug: string;
  brand_name: string;
  category_name: string;
  price: number;
  original_price?: number;
  stock_quantity: number;
  main_image: string;
  is_active: boolean;
}

export const AdminProducts = () => {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getProducts();
      setProducts(data as any);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa sản phẩm "${name}"?`)) {
      return;
    }

    try {
      setDeleteLoading(id);
      await productService.deleteProduct(id);
      toast.success('Xóa sản phẩm thành công');
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast.error('Không thể xóa sản phẩm');
    } finally {
      setDeleteLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">Đang tải...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Quản lý sản phẩm</h1>
        <Link
          to="/admin/products/new"
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          ➕ Thêm sản phẩm mới
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sản phẩm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Danh mục
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giá
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tồn kho
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.product_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img
                        src={product.main_image}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {product.brand_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {product.category_name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {product.price.toLocaleString('vi-VN')} ₫
                    </div>
                    {product.original_price && product.original_price > product.price && (
                      <div className="text-xs text-gray-500 line-through">
                        {product.original_price.toLocaleString('vi-VN')} ₫
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-sm font-medium ${
                        product.stock_quantity > 10
                          ? 'text-green-600'
                          : product.stock_quantity > 0
                          ? 'text-orange-600'
                          : 'text-red-600'
                      }`}
                    >
                      {product.stock_quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        product.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {product.is_active ? 'Hoạt động' : 'Tạm ngưng'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/admin/products/edit/${product.product_id}`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      ✏️ Sửa
                    </Link>
                    <button
                      onClick={() => handleDelete(product.product_id, product.name)}
                      disabled={deleteLoading === product.product_id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      {deleteLoading === product.product_id ? '⏳' : '🗑️'} Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {products.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Chưa có sản phẩm nào
          </div>
        )}
      </div>
    </div>
  );
};
