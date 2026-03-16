import { useEffect, useMemo, useState } from 'react';
import { adminCategoryService } from '@/services/admin/category.service';
import { AdminCategory } from '@/features/admin/types/catalog';
import toast from 'react-hot-toast';

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  parentId: '',
  imageUrl: '',
  displayOrder: 0,
  isActive: true,
};

// Hàm tạo Slug chuẩn (Gộp từ cả 2 bản)
const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const AdminCategories = () => {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null); //
  const [isEditing, setIsEditing] = useState(false); //
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Chuyển đổi cây danh mục thành danh sách phẳng để đổ vào Select
  const flatCategories = useMemo(() => {
    const flatten = (items: AdminCategory[], level = 0): Array<AdminCategory & { level: number }> =>
      items.flatMap((item) => [{ ...item, level }, ...flatten(item.children || [], level + 1)]);

    return flatten(categories);
  }, [categories]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await adminCategoryService.getTree(); // Ưu tiên lấy dạng cây
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast.error('Không thể tải danh mục');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsEditing(false);
  };

  const handleEdit = (category: AdminCategory) => {
    setEditingId(category.categoryId);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      parentId: category.parentId ? String(category.parentId) : '',
      imageUrl: category.imageUrl || '',
      displayOrder: category.displayOrder,
      isActive: category.isActive,
    });
    setIsEditing(true); // Mở form khi bấm sửa
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name || !form.slug) {
      toast.error('Vui lòng nhập tên và slug');
      return;
    }

    const payload = {
      ...form,
      parentId: form.parentId ? Number(form.parentId) : null,
      displayOrder: Number(form.displayOrder) || 0,
    };

    try {
      if (editingId) {
        await adminCategoryService.update(editingId, payload);
        toast.success('Cập nhật thành công');
      } else {
        await adminCategoryService.create(payload);
        toast.success('Tạo danh mục thành công');
      }
      resetForm();
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể lưu danh mục');
    }
  };

  const handleDelete = async (categoryId: number, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa danh mục "${name}"?`)) return;

    try {
      setDeleteLoading(categoryId); // Hiện icon loading tại đúng dòng đang xóa
      await adminCategoryService.remove(categoryId);
      toast.success('Xóa danh mục thành công');
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể xóa danh mục');
    } finally {
      setDeleteLoading(null);
    }
  };

  // Hàm đệ quy hiển thị cây danh mục (Logic "Xịn" của Khanh)
  const renderTree = (items: AdminCategory[], level = 0): JSX.Element[] =>
  items.flatMap((item) => [
    <tr key={item.categoryId} className="hover:bg-gray-50 border-b transition-colors">
      <td className="px-6 py-4">
        <div style={{ paddingLeft: `${level * 24}px` }} className="flex items-center gap-2">
          {level > 0 && <span className="text-gray-300">└─</span>}
          <span className={`font-bold uppercase italic text-xs ${level === 0 ? 'text-blue-600' : 'text-gray-600'}`}>
            {item.name}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 text-xs font-mono text-gray-400">{item.slug}</td>
      <td className="px-6 py-4 text-center">
        <span className="bg-gray-100 px-2 py-1 rounded text-[10px] font-black">{item.displayOrder}</span>
      </td>
      <td className="px-6 py-4">
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
          item.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {item.isActive ? 'Hoạt động' : 'Đang ẩn'}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end gap-3">
          <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 font-black text-[10px] uppercase tracking-widest">
            Sửa
          </button>
          <button 
            onClick={() => handleDelete(item.categoryId, item.name)} 
            disabled={deleteLoading === item.categoryId}
            className="text-red-600 hover:text-red-800 font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
          >
            {deleteLoading === item.categoryId ? 'Đang xóa...' : 'Xóa'}
          </button>
        </div>
      </td>
    </tr>,
    // TypeScript giờ đã biết chắc chắn phần này cũng trả về JSX.Element[]
    ...renderTree(item.children || [], level + 1),
  ]);

  return (
    <div className="space-y-8 p-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-800 uppercase italic tracking-tighter">Danh mục sản phẩm</h1>
          <p className="text-gray-400 text-xs font-bold uppercase mt-1 tracking-widest">Quản lý cấu trúc cây và hiển thị Storefront</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)} 
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all"
          >
            + Thêm danh mục
          </button>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className="bg-white rounded-[32px] shadow-2xl shadow-gray-100 border-2 border-gray-50 p-8 space-y-6 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between border-b border-gray-50 pb-4">
            <h2 className="text-xl font-black text-gray-800 uppercase italic">
              {editingId ? 'Cập nhật danh mục' : 'Tạo danh mục mới'}
            </h2>
            <button type="button" onClick={resetForm} className="text-[10px] font-black uppercase text-gray-400 hover:text-red-600 tracking-widest">Đóng</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Tên danh mục</label>
              <input
                value={form.name}
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value, slug: slugify(e.target.value) }))}
                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 focus:border-blue-500 outline-none font-bold"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Slug (Đường dẫn)</label>
              <input
                value={form.slug}
                onChange={(e) => setForm(p => ({ ...p, slug: e.target.value }))}
                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 focus:border-blue-500 outline-none font-mono text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Danh mục cha</label>
              <select
                value={form.parentId}
                onChange={(e) => setForm(p => ({ ...p, parentId: e.target.value }))}
                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 focus:border-blue-500 outline-none font-bold text-sm"
              >
                <option value="">Danh mục gốc (Root)</option>
                {flatCategories
                  .filter((c) => c.categoryId !== editingId)
                  .map((c) => (
                    <option key={c.categoryId} value={c.categoryId}>
                      {'— '.repeat(c.level)} {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Thứ tự ưu tiên</label>
              <input
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm(p => ({ ...p, displayOrder: Number(e.target.value) }))}
                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 focus:border-blue-500 outline-none font-bold"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))}
              className="w-5 h-5 rounded-lg"
            />
            <label htmlFor="isActive" className="text-xs font-black uppercase text-gray-600 tracking-tight">Kích hoạt hiển thị trên Website</label>
          </div>

          <div className="flex gap-4 pt-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">
              {editingId ? 'Lưu thay đổi' : 'Xác nhận tạo'}
            </button>
            <button type="button" onClick={resetForm} className="px-8 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all">
              Hủy
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-[32px] shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-4" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Đang đồng bộ dữ liệu...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Cấu trúc danh mục</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Slug</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Thứ tự</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Trạng thái</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {categories.length > 0 ? renderTree(categories) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <p className="text-gray-300 font-black uppercase italic tracking-tighter text-xl">Chưa có danh mục nào được tạo</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};