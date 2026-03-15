import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PlusCircle, Search, RefreshCw, Edit, Trash2 } from 'lucide-react';
import { productService } from '@/services/product.service'; // Dùng service thống nhất
import { adminCategoryService } from '@/services/admin/category.service'; // Để lấy danh sách lọc
import { Product, Category } from '@/types'; // Import các type chuẩn đã gộp

// --- CẤU HÌNH TRẠNG THÁI ---
const STATUS_OPTIONS = [
  { label: 'Tất cả trạng thái', value: 'all' },
  { label: 'Đang bán', value: 'active' },
  { label: 'Tạm ẩn', value: 'inactive' },
  { label: 'Hết hàng', value: 'out_of_stock' },
  { label: 'Đặt trước', value: 'pre_order' },
];

export const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // --- BỘ LỌC (FILTERS) ---
  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
    status: 'all',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [filters]); // Tự động tải lại khi đổi bộ lọc

  const fetchCategories = async () => {
    try {
      const data = await adminCategoryService.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Lỗi tải danh mục:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // SỬA TẠI ĐÂY: Đổi getProducts thành getAll
      const data = await productService.getAll({
        search: filters.search || undefined,
        categoryId: filters.categoryId ? Number(filters.categoryId) : undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
      });
      setProducts(data);
    } catch (error) {
      toast.error('Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: number, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa sản phẩm "${name}"? Thao tác này không thể hoàn tác.`)) {
      return;
    }

    try {
      setActionLoading(productId);
      await productService.deleteProduct(productId); //
      toast.success('Đã xóa sản phẩm thành công');
      fetchProducts();
    } catch (error) {
      toast.error('Không thể xóa sản phẩm này');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-800 uppercase italic tracking-tight">Kho hàng TechMart</h1>
          <p className="text-gray-500 text-sm font-medium mt-1">Quản lý giá, tồn kho và trạng thái hiển thị của iPhone, Samsung...</p>
        </div>
        <Link
          to="/admin/products/new"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
        >
          <PlusCircle size={20} /> Thêm sản phẩm
        </Link>
      </div>

      {/* THANH CÔNG CỤ LỌC */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <input
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Tìm theo tên hoặc SKU..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
        </div>

        <select
          value={filters.categoryId}
          onChange={(e) => setFilters(prev => ({ ...prev, categoryId: e.target.value }))}
          className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((cat) => (
            <option key={cat.categoryId} value={cat.categoryId}>{cat.name}</option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <button
          onClick={fetchProducts}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      {/* BẢNG DANH SÁCH */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4 text-left">Sản phẩm</th>
                <th className="px-6 py-4 text-left">Danh mục</th>
                <th className="px-6 py-4 text-left">Giá niêm yết</th>
                <th className="px-6 py-4 text-left">Tồn kho</th>
                <th className="px-6 py-4 text-left">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((product) => (
                <tr key={product.productId} className="hover:bg-blue-50/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={product.mainImage || '/placeholder.jpg'}
                        alt={product.name}
                        className="w-14 h-14 object-cover rounded-xl border border-gray-100 shadow-sm"
                      />
                      <div>
                        <div className="text-sm font-bold text-gray-900">{product.name}</div>
                        <div className="text-[10px] font-black text-blue-600 font-mono uppercase">SKU: {product.sku || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                      {product.categoryName || 'Chưa gán'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-black text-gray-800">{Number(product.price).toLocaleString('vi-VN')}₫</div>
                    {product.salePrice && (
                      <div className="text-[10px] text-red-500 font-bold uppercase">Sale: {Number(product.salePrice).toLocaleString('vi-VN')}₫</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-black ${product.stockQuantity < 10 ? 'text-red-500' : 'text-green-600'}`}>
                      {product.stockQuantity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-600">
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/admin/products/${product.productId}/edit`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Sửa sản phẩm"
                      >
                        <Edit size={18} />
                      </Link>
                      <button
                        onClick={() => handleDelete(product.productId, product.name)}
                        disabled={actionLoading === product.productId}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                        title="Xóa sản phẩm"
                      >
                        {actionLoading === product.productId ? <RefreshCw size={18} className="animate-spin" /> : <Trash2 size={18} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {products.length === 0 && (
          <div className="text-center py-20">
            <div className="text-gray-200 text-6xl mb-4 opacity-30">📦</div>
            <p className="text-gray-400 font-bold italic">Kho hàng đang trống hoặc không tìm thấy kết quả!</p>
          </div>
        )}
      </div>
    </div>
  );
};