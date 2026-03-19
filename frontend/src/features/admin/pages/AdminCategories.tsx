import { useEffect, useMemo, useState } from 'react';
import { adminCategoryService } from '@/services/admin/category.service';
import { AdminCategory } from '@/features/admin/types/catalog';
import toast from 'react-hot-toast';
import { ChevronRight, FolderOpen, Folder, Plus, Pencil, Trash2, X, Check, AlertCircle } from 'lucide-react';

const emptyForm = {
  name: '', slug: '', description: '', parentId: '',
  imageUrl: '', displayOrder: 0, isActive: true,
};

const slugify = (value: string) =>
  value.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const getBreadcrumb = (categories: AdminCategory[], targetId: number): string[] => {
  const map = new Map<number, AdminCategory>();
  const flatten = (items: AdminCategory[]) =>
    items.forEach((c) => { map.set(c.categoryId, c); flatten(c.children || []); });
  flatten(categories);
  const path: string[] = [];
  let current = map.get(targetId);
  while (current) { path.unshift(current.name); current = current.parentId ? map.get(current.parentId) : undefined; }
  return path;
};

const CategoryRow = ({ item, level, onEdit, onDelete, deleteLoading }: {
  item: AdminCategory; level: number;
  onEdit: (c: AdminCategory) => void;
  onDelete: (id: number, name: string) => void;
  deleteLoading: number | null;
}) => (
  <>
    <tr className="group hover:bg-slate-50 border-b border-slate-100 transition-colors">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 20}px` }}>
          {level > 0 && <ChevronRight size={12} className="text-slate-300" />}
          {(item.children || []).length > 0
            ? <FolderOpen size={15} className="text-amber-400 shrink-0" />
            : <Folder size={15} className="text-slate-300 shrink-0" />}
          <span className={`font-semibold text-sm ${level === 0 ? 'text-slate-800' : 'text-slate-600'}`}>
            {item.name}
          </span>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded-md">/{item.slug}</span>
      </td>
      <td className="px-5 py-3.5 text-center">
        <span className="text-xs font-bold text-slate-400">{item.displayOrder}</span>
      </td>
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
          item.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${item.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {item.isActive ? 'Hiển thị' : 'Đang ẩn'}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(item)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Pencil size={12} /> Sửa
          </button>
          <button onClick={() => onDelete(item.categoryId, item.name)}
            disabled={deleteLoading === item.categoryId}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40">
            <Trash2 size={12} />
            {deleteLoading === item.categoryId ? 'Đang xóa...' : 'Xóa'}
          </button>
        </div>
      </td>
    </tr>
    {(item.children || []).map((child) => (
      <CategoryRow key={child.categoryId} item={child} level={level + 1}
        onEdit={onEdit} onDelete={onDelete} deleteLoading={deleteLoading} />
    ))}
  </>
);

export const AdminCategories = () => {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const flatCategories = useMemo(() => {
    const flatten = (items: AdminCategory[], level = 0): Array<AdminCategory & { level: number }> =>
      items.flatMap((item) => [{ ...item, level }, ...flatten(item.children || [], level + 1)]);
    return flatten(categories);
  }, [categories]);

  const fetchCategories = async () => {
    try { setLoading(true); setCategories(await adminCategoryService.getTree()); }
    catch { toast.error('Không thể tải danh mục'); }
    finally { setLoading(false); }
  };

  const resetForm = () => { setEditingId(null); setForm(emptyForm); setIsEditing(false); };

  const handleEdit = (category: AdminCategory) => {
    setEditingId(category.categoryId);
    setForm({
      name: category.name, slug: category.slug,
      description: category.description || '',
      parentId: category.parentId ? String(category.parentId) : '',
      imageUrl: category.imageUrl || '',
      displayOrder: category.displayOrder, isActive: category.isActive,
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug) { toast.error('Vui lòng nhập tên và slug'); return; }
    const payload = { ...form, parentId: form.parentId ? Number(form.parentId) : null, displayOrder: Number(form.displayOrder) || 0 };
    try {
      setSubmitting(true);
      if (editingId) { await adminCategoryService.update(editingId, payload); toast.success('Cập nhật thành công'); }
      else { await adminCategoryService.create(payload); toast.success('Tạo danh mục thành công'); }
      resetForm(); fetchCategories();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Không thể lưu danh mục'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (categoryId: number, name: string) => {
    if (!confirm(`Xóa danh mục "${name}"?\n\nKhông thể xóa nếu còn danh mục con hoặc sản phẩm bên trong.`)) return;
    try {
      setDeleteLoading(categoryId);
      await adminCategoryService.remove(categoryId);
      toast.success(`Đã xóa "${name}"`); fetchCategories();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Không thể xóa danh mục này'); }
    finally { setDeleteLoading(null); }
  };

  const parentPreview = useMemo(() => {
    if (!form.parentId) return null;
    return getBreadcrumb(categories, Number(form.parentId)).join(' › ');
  }, [form.parentId, categories]);

  const totalCount = flatCategories.length;
  const activeCount = flatCategories.filter((c) => c.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Danh mục sản phẩm</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý cây phân cấp danh mục hiển thị trên cửa hàng</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-800">{totalCount}</div>
            <div className="text-xs text-slate-400">Tổng cộng</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
            <div className="text-xs text-slate-400">Đang hiển thị</div>
          </div>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm">
              <Plus size={16} /> Thêm danh mục
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      {isEditing && (
        <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 bg-blue-600">
            <div>
              <h2 className="text-base font-bold text-white">
                {editingId ? '✏️ Chỉnh sửa danh mục' : '➕ Tạo danh mục mới'}
              </h2>
              {editingId && (
                <p className="text-blue-200 text-xs mt-0.5">{getBreadcrumb(categories, editingId).join(' › ')}</p>
              )}
            </div>
            <button onClick={resetForm} className="text-blue-200 hover:text-white transition-colors"><X size={18} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Tên danh mục <span className="text-red-500">*</span>
                </label>
                <input value={form.name}
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value, slug: slugify(e.target.value) }))}
                  placeholder="VD: Điện thoại iPhone"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-blue-400 focus:outline-none"
                  required />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Slug (URL) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">/</span>
                  <input value={form.slug}
                    onChange={(e) => setForm(p => ({ ...p, slug: e.target.value }))}
                    placeholder="dien-thoai-iphone"
                    className="w-full border-2 border-slate-200 rounded-xl pl-6 pr-4 py-2.5 text-sm font-mono focus:border-blue-400 focus:outline-none"
                    required />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Danh mục cha</label>
                <select value={form.parentId} onChange={(e) => setForm(p => ({ ...p, parentId: e.target.value }))}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-blue-400 focus:outline-none bg-white">
                  <option value="">📁 Danh mục gốc (không có cha)</option>
                  {flatCategories.filter((c) => c.categoryId !== editingId).map((c) => (
                    <option key={c.categoryId} value={c.categoryId}>
                      {'　'.repeat(c.level)}{c.level > 0 ? '└ ' : ''}{c.name}
                    </option>
                  ))}
                </select>
                {parentPreview && (
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <ChevronRight size={10} /> Vị trí: {parentPreview}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Thứ tự hiển thị</label>
                <input type="number" min={0} value={form.displayOrder}
                  onChange={(e) => setForm(p => ({ ...p, displayOrder: Number(e.target.value) }))}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-blue-400 focus:outline-none" />
                <p className="text-xs text-slate-400">Số nhỏ hơn hiển thị trước</p>
              </div>
            </div>

            {/* Toggle kích hoạt */}
            <div onClick={() => setForm(p => ({ ...p, isActive: !p.isActive }))}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer select-none transition-all ${
                form.isActive ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
              }`}>
              <div className={`w-10 h-6 rounded-full relative transition-colors ${form.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isActive ? 'right-1' : 'left-1'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {form.isActive ? '✅ Hiển thị trên cửa hàng' : '🚫 Đang ẩn khỏi cửa hàng'}
                </p>
                <p className="text-xs text-slate-400">
                  {form.isActive ? 'Khách hàng có thể thấy danh mục này' : 'Danh mục tạm thời không hiển thị'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={submitting}
                className="flex items-center gap-2 flex-1 justify-center bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all">
                <Check size={16} />
                {submitting ? 'Đang lưu...' : (editingId ? 'Lưu thay đổi' : 'Tạo danh mục')}
              </button>
              <button type="button" onClick={resetForm}
                className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bảng */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Đang tải danh mục...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-center px-6">
            <FolderOpen size={40} className="text-slate-200" />
            <p className="text-slate-400 font-semibold">Chưa có danh mục nào</p>
            <p className="text-slate-300 text-sm">Bấm "Thêm danh mục" để bắt đầu tổ chức sản phẩm</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Tên danh mục</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Slug</th>
                <th className="px-5 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wide">Thứ tự</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Trạng thái</th>
                <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wide">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <CategoryRow key={cat.categoryId} item={cat} level={0}
                  onEdit={handleEdit} onDelete={handleDelete} deleteLoading={deleteLoading} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Ghi chú */}
      <div className="flex items-start gap-2 text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
        <p><strong className="text-amber-700">Lưu ý khi xóa:</strong> Không thể xóa danh mục còn chứa danh mục con hoặc sản phẩm. Hãy di chuyển nội dung bên trong trước.</p>
      </div>
    </div>
  );
};