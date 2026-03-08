import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminProductService } from '@/services/admin/product.service';
import { adminCategoryService } from '@/services/admin/category.service';
import {
  AdminCategory,
  AdminProduct,
  AdminProductStatus,
} from '@/features/admin/types/catalog';

const STATUS_OPTIONS: Array<{ label: string; value: AdminProductStatus | 'all' }> = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Nháp', value: 'draft' },
  { label: 'Đang bán', value: 'active' },
  { label: 'Tạm ẩn', value: 'inactive' },
  { label: 'Hết hàng', value: 'out_of_stock' },
  { label: 'Đặt trước', value: 'pre_order' },
  { label: 'Lưu trữ', value: 'archived' },
];

export const AdminProducts = () => {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiveLoading, setArchiveLoading] = useState<number | null>(null);
  const [filters, setFilters] = useState<{
    search: string;
    categoryId: string;
    status: AdminProductStatus | 'all';
  }>({
    search: '',
    categoryId: '',
    status: 'all',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const data = await adminCategoryService.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await adminProductService.getAll({
        search: filters.search || undefined,
        categoryId: filters.categoryId ? Number(filters.categoryId) : undefined,
        status: filters.status,
      });
      setProducts(data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (productId: number, name: string) => {
    if (!confirm(`Lưu trữ sản phẩm "${name}"?`)) {
      return;
    }

    try {
      setArchiveLoading(productId);
      await adminProductService.archive(productId);
      toast.success('Đã lưu trữ sản phẩm');
      fetchProducts();
    } catch (error: any) {
      console.error('Failed to archive product:', error);
      toast.error(error.response?.data?.message || 'Không thể lưu trữ sản phẩm');
    } finally {
      setArchiveLoading(null);
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Quản lý sản phẩm</h1>
          <p className="text-gray-500 mt-2">
            Quản lý giá, tồn kho, biến thể, trạng thái hiển thị và hình ảnh.
          </p>
        </div>
        <Link
          to="/admin/products/new"
          className="inline-flex items-center justify-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          ➕ Thêm sản phẩm mới
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          value={filters.search}
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              search: event.target.value,
            }))
          }
          placeholder="Tìm theo tên hoặc SKU"
          className="border border-gray-300 rounded-lg px-4 py-2"
        />
        <select
          value={filters.categoryId}
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              categoryId: event.target.value,
            }))
          }
          className="border border-gray-300 rounded-lg px-4 py-2"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((category) => (
            <option key={category.categoryId} value={category.categoryId}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              status: event.target.value as AdminProductStatus | 'all',
            }))
          }
          className="border border-gray-300 rounded-lg px-4 py-2"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          onClick={fetchProducts}
          className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
        >
          Làm mới
        </button>
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
                  Biến thể
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
                <tr key={product.productId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={product.mainImage || product.images?.[0]?.imageUrl || '/placeholder.jpg'}
                        alt={product.name}
                        className="w-14 h-14 object-cover rounded-lg border"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {product.categoryName || 'Chưa gán'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div>{Number(product.price).toLocaleString('vi-VN')} ₫</div>
                    {product.salePrice ? (
                      <div className="text-xs text-red-600">
                        KM: {Number(product.salePrice).toLocaleString('vi-VN')} ₫
                      </div>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">
                    {product.stockQuantity}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {product.variants?.length || 0}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 inline-flex text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/admin/products/${product.productId}/edit`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      ✏️ Sửa
                    </Link>
                    <button
                      onClick={() => handleArchive(product.productId, product.name)}
                      disabled={archiveLoading === product.productId}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      {archiveLoading === product.productId ? '⏳' : '🗃️'} Lưu trữ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Chưa có sản phẩm nào
          </div>
        ) : null}
      </div>
    </div>
  );
};
