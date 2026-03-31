import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PlusCircle, Search, RefreshCw, Edit, Trash2, AlertTriangle, XCircle } from 'lucide-react';
import { productService } from '@/services/product.service';
import { adminProductService } from '@/services/admin/product.service';
import { adminCategoryService } from '@/services/admin/category.service'; 
import { Category } from '@/types';
import { AdminProduct } from '@/features/admin/types/catalog'; 

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
  { label: 'Ngừng bán', value: 'inactive' },
  { label: 'Hết hàng', value: 'out_of_stock' },
  { label: 'Đặt trước', value: 'pre_order' },
];

export const AdminProducts = () => {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // --- CONFIRM DIALOG ---
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    confirmStyle: string;
    onConfirm: () => void;
  } | null>(null);

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
    const response = await adminProductService.getAll({
      search: filters.search || undefined,
      categoryId: filters.categoryId ? Number(filters.categoryId) : undefined,
      status: filters.status !== 'all' ? filters.status : undefined,
    });
    setProducts(Array.isArray(response) ? response : []);
  } catch (error) {
    console.error("Lỗi fetch:", error);
    toast.error('Không thể tải danh sách sản phẩm');
  } finally {
    console.log("✅ Đã gọi xong API.");
    setLoading(false);
  }
};

  const executeDelete = async (product: AdminProduct) => {
    try {
      setActionLoading(product.productId);
      const resp = await productService.deleteProduct(product.productId) as any;
      if (resp?.action === 'deactivated') {
        toast.success(`"${product.name}" đã chuyển sang Ngừng bán`);
      } else {
        toast.success(`Đã xóa vĩnh viễn "${product.name}"`);
      }
      fetchProducts();
    } catch (error: any) {
      const resp = error?.response;
      if (resp?.status === 409 && resp?.data?.code === 'PRODUCT_IN_USE') {
        // Sản phẩm đang được sử dụng → hỏi chuyển ngừng bán
        setConfirmDialog({
          show: true,
          title: 'Không thể xóa sản phẩm',
          message: `${resp.data.message}\n\nBạn có muốn chuyển sang "Ngừng bán" thay vì xóa?`,
          confirmLabel: 'Ngừng bán',
          confirmStyle: 'bg-orange-600 hover:bg-orange-700',
          onConfirm: async () => {
            try {
              await adminProductService.archive(product.productId);
              toast.success('Đã chuyển sản phẩm sang Ngừng bán');
              fetchProducts();
            } catch {
              toast.error('Không thể chuyển trạng thái sản phẩm');
            }
          },
        });
      } else {
        toast.error('Không thể xóa sản phẩm này');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = (product: AdminProduct) => {
    const isInactive = product.status === 'inactive';

    if (isInactive) {
      // Đã ngừng bán → confirm xóa vĩnh viễn
      setConfirmDialog({
        show: true,
        title: 'Xóa vĩnh viễn sản phẩm',
        message: `Sản phẩm "${product.name}" đã ngừng bán.\n\nHành động này sẽ XÓA VĨNH VIỄN khỏi hệ thống và không thể hoàn tác!`,
        confirmLabel: 'Xóa vĩnh viễn',
        confirmStyle: 'bg-red-600 hover:bg-red-700',
        onConfirm: () => executeDelete(product),
      });
    } else {
      // Đang bán → chuyển ngừng bán (không cần confirm)
      executeDelete(product);
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
          {(() => {
            const parentCats = categories.filter(c => !c.parentId);
            const childCats = categories.filter(c => c.parentId);
            return parentCats.map(parent => {
              const children = childCats.filter(c => c.parentId === parent.categoryId);
              if (children.length === 0) {
                return (
                  <optgroup key={parent.categoryId} label={`📁 ${parent.name}`}>
                    <option disabled style={{ color: '#999', fontStyle: 'italic' }}>
                      -- Chưa có danh mục con --
                    </option>
                  </optgroup>
                );
              }
              return (
                <optgroup key={parent.categoryId} label={`📁 ${parent.name}`}>
                  {children.map(child => (
                    <option key={child.categoryId} value={child.categoryId}>{child.name}</option>
                  ))}
                </optgroup>
              );
            });
          })()}
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
              {products.map((product) => {
                const isInactive = product.status === 'inactive';
                return (
                <tr key={product.productId} className={`transition-colors ${isInactive ? 'bg-gray-50/80 opacity-60' : 'hover:bg-blue-50/20'}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                     <img
  src={getImageUrl(product.mainImage)}
  alt={product.name}
  className={`w-14 h-14 object-contain rounded-2xl border shadow-sm ${isInactive ? 'bg-gray-200 border-gray-200 grayscale' : 'bg-gray-100 border-gray-100'}`}
  onError={(e) => {
    const el = e.target as HTMLImageElement;
    el.onerror = null;
    el.src = '/placeholder.jpg';
  }}
/>
                      <div>
                        <div className={`text-sm font-black uppercase italic leading-tight ${isInactive ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{product.name}</div>
                        <div className={`text-[10px] font-black font-mono mt-0.5 ${isInactive ? 'text-gray-400' : 'text-blue-600'}`}>SKU: {product.sku || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg uppercase">
                      {product.categoryName || 'Chưa gán'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`text-sm font-black tracking-tighter ${isInactive ? 'text-gray-400' : 'text-gray-800'}`}>{(Number(product.price) || 0).toLocaleString('vi-VN')}₫</div>
                    {product.salePrice && Number(product.salePrice) < Number(product.price) && (
                      <div className={`text-[9px] font-black uppercase italic tracking-tighter mt-0.5 ${isInactive ? 'text-gray-400' : 'text-red-500'}`}>
                        Sale: {Number(product.salePrice).toLocaleString('vi-VN')}₫
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-black ${
                      isInactive ? 'text-gray-400' :
                      product.stockQuantity > 10 ? 'text-green-600' :
                      product.stockQuantity > 0 ? 'text-orange-500' : 'text-red-600'
                    }`}>
                      {product.stockQuantity} SP
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                      product.status === 'active' ? 'bg-green-100 text-green-700' :
                      isInactive ? 'bg-red-100 text-red-600 border border-red-200' :
                      product.status === 'out_of_stock' ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {product.status === 'active' ? '✓ Đang bán' :
                       isInactive ? '⛔ Ngừng bán' :
                       product.status === 'out_of_stock' ? '✗ Hết hàng' :
                       product.status === 'pre_order' ? '⏳ Đặt trước' :
                       product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/admin/products/edit/${product.productId}`}
                        className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title={isInactive ? 'Sửa để mở bán lại' : 'Sửa sản phẩm'}
                      >
                        <Edit size={16} />
                      </Link>
                      <button
                        onClick={() => handleDelete(product)}
                        disabled={actionLoading === product.productId}
                        className={`p-2.5 rounded-xl transition-all disabled:opacity-30 ${
                          isInactive
                            ? 'text-red-700 hover:bg-red-100 bg-red-50'
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                        title={isInactive ? 'Xóa vĩnh viễn' : 'Ngừng bán'}
                      >
                        {actionLoading === product.productId ?
                          <RefreshCw size={16} className="animate-spin" /> :
                          <Trash2 size={16} />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
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

      {/* CONFIRM DIALOG MODAL */}
      {confirmDialog?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDialog(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95">
            <button
              onClick={() => setConfirmDialog(null)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <XCircle size={20} />
            </button>

            <div className="flex items-start gap-4 mb-5">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 uppercase italic">{confirmDialog.title}</h3>
                <p className="text-sm text-gray-600 mt-2 whitespace-pre-line leading-relaxed">{confirmDialog.message}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white rounded-xl transition-colors shadow-lg ${confirmDialog.confirmStyle}`}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};