import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PlusCircle, Search, RefreshCw, Edit, Trash2 } from 'lucide-react';
import { productService } from '@/services/product.service'; 
import { adminCategoryService } from '@/services/admin/category.service'; 
import { Product, Category } from '@/types'; 

// ✅ Helper: chuyển path ảnh local thành URL đầy đủ
const BACKEND_URL = (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5001';
const getImageUrl = (url?: string): string => {
  if (!url) return '/placeholder.jpg';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${BACKEND_URL}${url}`;
};

// --- CẤU HÌNH TRẠNG THÁI (Giữ từ bản Khanh) ---
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
  }, [filters]); 

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
    console.log("🚀 Đang gọi API lấy sản phẩm...");
    const response = await productService.getAll({
      search: filters.search || undefined,
      categoryId: filters.categoryId ? Number(filters.categoryId) : undefined,
      status: filters.status !== 'all' ? filters.status : undefined,
    }) as any;

    // PHẢI TRUY XUẤT VÀO .data ĐỂ LẤY MẢNG SẢN PHẨM
    if (response && response.data) {
      setProducts(response.data); // Chỉ gán mảng sản phẩm thực tế
    } else {
      setProducts(Array.isArray(response) ? response : []);
    }
  } catch (error) {
    console.error("Lỗi fetch:", error);
    toast.error('Không thể tải danh sách sản phẩm');
  } finally {
    console.log("✅ Đã gọi xong API.");
    setLoading(false);
  }
};

  const handleDelete = async (productId: number, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa sản phẩm "${name}"? Thao tác này không thể hoàn tác.`)) {
      return;
    }

    try {
      setActionLoading(productId);
      await productService.deleteProduct(productId); 
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
      {/* HEADER (Style Khanh) */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-800 uppercase italic tracking-tight">Kho hàng TechMart</h1>
          <p className="text-gray-500 text-xs font-bold uppercase mt-1 tracking-widest opacity-60">Quản lý giá, tồn kho và hiển thị</p>
        </div>
        <Link
          to="/admin/products/new"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
        >
          <PlusCircle size={18} /> Thêm sản phẩm
        </Link>
      </div>

      {/* THANH CÔNG CỤ LỌC */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <input
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Tìm theo tên hoặc SKU..."
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <Search className="absolute left-3 top-3.5 text-gray-400" size={16} />
        </div>

        <select
          value={filters.categoryId}
          onChange={(e) => setFilters(prev => ({ ...prev, categoryId: e.target.value }))}
          className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((cat) => (
            <option key={cat.categoryId} value={cat.categoryId}>{cat.name}</option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <button
          onClick={fetchProducts}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 hover:border-blue-100 transition-all"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      {/* BẢNG DANH SÁCH (Gộp logic 2 bản) */}
      <div className="bg-white rounded-[32px] shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-5 text-left">Sản phẩm</th>
                <th className="px-6 py-5 text-left">Danh mục</th>
                <th className="px-6 py-5 text-left">Giá niêm yết</th>
                <th className="px-6 py-5 text-left">Tồn kho</th>
                <th className="px-6 py-5 text-left">Trạng thái</th>
                <th className="px-6 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((product) => (
                <tr key={product.productId} className="hover:bg-blue-50/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {/* Image fallback từ bản Tuấn Anh */}
                     <img
  src={getImageUrl(product.mainImage)}
  alt={product.name}
  className="w-14 h-14 object-contain bg-gray-100 rounded-2xl border border-gray-100 shadow-sm"
  onError={(e) => { 
    const el = e.target as HTMLImageElement;
    el.onerror = null; 
    el.src = '/placeholder.jpg'; 
  }}
/>
                      <div>
                        <div className="text-sm font-black text-gray-800 uppercase italic leading-tight">{product.name}</div>
                        <div className="text-[10px] font-black text-blue-600 font-mono mt-0.5">SKU: {product.sku || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg uppercase">
                      {product.categoryName || 'Chưa gán'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-black text-gray-800 tracking-tighter">{(Number(product.price) || 0).toLocaleString('vi-VN')}₫</div>
                    {product.salePrice && Number(product.salePrice) < Number(product.price) && (
                      <div className="text-[9px] text-red-500 font-black uppercase italic tracking-tighter mt-0.5">
                        Sale: {Number(product.salePrice).toLocaleString('vi-VN')}₫
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {/* Cảnh báo tồn kho 3 màu từ bản Tuấn Anh */}
                    <span className={`text-xs font-black ${
                      product.stockQuantity > 10 ? 'text-green-600' : 
                      product.stockQuantity > 0 ? 'text-orange-500' : 'text-red-600'
                    }`}>
                      {product.stockQuantity} SP
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                      product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {product.status === 'active' ? '✓ Đang bán' : '✗ ' + product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/admin/products/edit/${product.productId}`}
                        className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Sửa sản phẩm"
                      >
                        <Edit size={16} />
                      </Link>
                      <button
                        onClick={() => handleDelete(product.productId, product.name)}
                        disabled={actionLoading === product.productId}
                        className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30"
                        title="Xóa sản phẩm"
                      >
                        {actionLoading === product.productId ? 
                          <RefreshCw size={16} className="animate-spin" /> : 
                          <Trash2 size={16} />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {products.length === 0 && (
          <div className="text-center py-24 bg-gray-50/30">
            <div className="text-gray-100 text-8xl mb-4 font-black italic opacity-20">EMPTY</div>
            <p className="text-gray-400 text-xs font-black uppercase tracking-widest">Kho hàng TechMart đang trống hoặc không tìm thấy kết quả!</p>
          </div>
        )}
      </div>
    </div>
  );
};