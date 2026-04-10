import { useEffect, useMemo, useState } from 'react';
import { adminCategoryService } from '@/services/admin/category.service';
import { AdminCategory } from '@/features/admin/types/catalog';
import toast from 'react-hot-toast';
import {
  ChevronRight, FolderOpen, Folder, Plus, Pencil, Trash2,
  X, Check, AlertCircle, Trash, RotateCcw,
} from 'lucide-react';

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

// ── Category Row (active tab) ─────────────────────────────────────────────────
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
          {level === 0
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
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
          item.isActive
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-slate-100 text-slate-500 border border-slate-200'
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
          <button
            onClick={() => onDelete(item.categoryId, item.name)}
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

// ── Deleted Row (trash tab) ───────────────────────────────────────────────────
const DeletedRow = ({ item, onRestore, onHardDelete, deleteLoading, restoreLoading }: {
  item: any;
  onRestore: (id: number, name: string) => void;
  onHardDelete: (id: number, name: string) => void;
  deleteLoading: number | null;
  restoreLoading: number | null;
}) => (
  <tr className="group hover:bg-red-50/30 border-b border-slate-100 transition-colors">
    <td className="px-5 py-3.5">
      <div className="flex items-center gap-2">
        <Folder size={15} className="text-red-300 shrink-0" />
        <span className="font-semibold text-sm text-slate-500 line-through">{item.name}</span>
      </div>
    </td>
    <td className="px-5 py-3.5">
      <span className="text-xs font-mono bg-slate-100 text-slate-400 px-2 py-1 rounded-md">/{item.slug}</span>
    </td>
    <td className="px-5 py-3.5">
      <span className="text-xs text-slate-400">
        {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString('vi-VN') : '—'}
      </span>
    </td>
    <td className="px-5 py-3.5">
      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onRestore(item.categoryId, item.name)}
          disabled={restoreLoading === item.categoryId}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors disabled:opacity-40">
          <RotateCcw size={12} />
          {restoreLoading === item.categoryId ? 'Đang khôi phục...' : 'Khôi phục'}
        </button>
        <button
          onClick={() => onHardDelete(item.categoryId, item.name)}
          disabled={deleteLoading === item.categoryId}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-40">
          <Trash size={12} />
          {deleteLoading === item.categoryId ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
        </button>
      </div>
    </td>
  </tr>
);

// ── Main ─────────────────────────────────────────────────────────────────────
export const AdminCategories = () => {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [deletedCategories, setDeletedCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [restoreLoading, setRestoreLoading] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<'active' | 'trash'>('active');
  const [confirmDelete, setConfirmDelete] = useState<{
    id: number; name: string; isHardDelete: boolean;
  } | null>(null);

  useEffect(() => { fetchAll(); }, []);

  const flatCategories = useMemo(() => {
    const flatten = (items: AdminCategory[], level = 0): Array<AdminCategory & { level: number }> =>
      items.flatMap((item) => [{ ...item, level }, ...flatten(item.children || [], level + 1)]);
    return flatten(categories);
  }, [categories]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      // Lấy cả active và deleted
      const [activeTree, deleted] = await Promise.all([
        adminCategoryService.getTree(),
        adminCategoryService.getDeleted(), // API mới
      ]);
      setCategories(activeTree);
      setDeletedCategories(deleted);
    } catch {
      toast.error('Không thể tải danh mục');
    } finally {
      setLoading(false);
    }
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
    const payload = {
      ...form,
      parentId: form.parentId ? Number(form.parentId) : null,
      displayOrder: Number(form.displayOrder) || 0,
    };
    try {
      setSubmitting(true);
      if (editingId) {
        await adminCategoryService.update(editingId, payload);
        toast.success('Cập nhật thành công');
      } else {
        await adminCategoryService.create(payload);
        toast.success('Tạo danh mục thành công');
      }
      resetForm(); fetchAll();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể lưu danh mục');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestore = async (categoryId: number, name: string) => {
    setRestoreLoading(categoryId);
    try {
      await adminCategoryService.restore(categoryId);
      toast.success(`Đã khôi phục danh mục "${name}"`);
      fetchAll();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể khôi phục danh mục');
    } finally {
      setRestoreLoading(null);
    }
  };

  // Xóa lần 1: soft delete → chuyển về thùng rác
  const handleSoftDelete = (categoryId: number, name: string) => {
    setConfirmDelete({ id: categoryId, name, isHardDelete: false });
  };

  // Xóa lần 2: hard delete vĩnh viễn
  const handleHardDelete = (categoryId: number, name: string) => {
    setConfirmDelete({ id: categoryId, name, isHardDelete: true });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const { id, name } = confirmDelete;
    setConfirmDelete(null);
    setDeleteLoading(id);
    try {
      await adminCategoryService.remove(id);
      if (confirmDelete.isHardDelete) {
        toast.success(`Đã xóa vĩnh viễn "${name}"`);
      } else {
        toast.success(`Đã chuyển "${name}" vào thùng rác`);
      }
      fetchAll();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể xóa danh mục này');
    } finally {
      setDeleteLoading(null);
    }
  };

  const parentPreview = useMemo(() => {
    if (!form.parentId) return null;
    return getBreadcrumb(categories, Number(form.parentId)).join(' › ');
  }, [form.parentId, categories]);

  return (
    <div className="space-y-6">
      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                confirmDelete.isHardDelete ? 'bg-red-100' : 'bg-amber-100'
              }`}>
                {confirmDelete.isHardDelete
                  ? <Trash size={18} className="text-red-600" />
                  : <Trash2 size={18} className="text-amber-600" />}
              </div>
              <h3 className="font-bold text-slate-800">
                {confirmDelete.isHardDelete ? 'Xóa vĩnh viễn' : 'Chuyển vào thùng rác'}
              </h3>
            </div>
            <p className="text-sm text-slate-600 mb-1">
              Bạn có chắc muốn {confirmDelete.isHardDelete ? 'xóa vĩnh viễn' : 'xóa'} danh mục{' '}
              <strong>"{confirmDelete.name}"</strong>?
            </p>
            <p className="text-xs text-slate-400 mb-5">
              {confirmDelete.isHardDelete
                ? '⚠️ Hành động này không thể hoàn tác.'
                : 'Danh mục sẽ bị ẩn. Sản phẩm vẫn giữ nguyên, có thể khôi phục lại.'}
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                Hủy
              </button>
              <button onClick={executeDelete}
                className={`px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors ${
                  confirmDelete.isHardDelete ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'
                }`}>
                {confirmDelete.isHardDelete ? 'Xóa vĩnh viễn' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Danh mục sản phẩm</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý cây phân cấp danh mục hiển thị trên cửa hàng</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-800">{flatCategories.length}</div>
            <div className="text-xs text-slate-400">Đang hoạt động</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-red-500">{deletedCategories.length}</div>
            <div className="text-xs text-slate-400">Thùng rác</div>
          </div>
          {!isEditing && tab === 'active' && (
            <button onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm">
              <Plus size={16} /> Thêm danh mục
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            tab === 'active' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}>
          📁 Đang hoạt động ({flatCategories.length})
        </button>
        <button
          onClick={() => setTab('trash')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            tab === 'trash' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}>
          <Trash size={14} />
          Thùng rác ({deletedCategories.length})
        </button>
      </div>

      {/* Form (chỉ hiện ở tab active) */}
      {isEditing && tab === 'active' && (
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
            <button onClick={resetForm} className="text-blue-200 hover:text-white transition-colors">
              <X size={18} />
            </button>
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
                <select value={form.parentId}
                  onChange={(e) => setForm(p => ({ ...p, parentId: e.target.value }))}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-blue-400 focus:outline-none bg-white">
                  <option value="">📁 Danh mục gốc (không có cha)</option>
                  {flatCategories.filter((c) => c.categoryId !== editingId && c.level === 0).map((c) => (
                    <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                  ))}
                </select>
                {parentPreview && (
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <ChevronRight size={10} /> Vị trí: {parentPreview}
                  </p>
                )}
              </div>
            </div>

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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Đang tải danh mục...</p>
          </div>
        ) : tab === 'active' ? (
          categories.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-center px-6">
              <FolderOpen size={40} className="text-slate-200" />
              <p className="text-slate-400 font-semibold">Chưa có danh mục nào</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Tên danh mục</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Slug</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Trạng thái</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wide">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <CategoryRow key={cat.categoryId} item={cat} level={0}
                    onEdit={handleEdit} onDelete={handleSoftDelete} deleteLoading={deleteLoading} />
                ))}
              </tbody>
            </table>
          )
        ) : (
          // Tab Thùng rác
          deletedCategories.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-center px-6">
              <Trash size={40} className="text-slate-200" />
              <p className="text-slate-400 font-semibold">Thùng rác trống</p>
              <p className="text-slate-300 text-sm">Các danh mục đã xóa sẽ xuất hiện ở đây</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-red-50 border-b border-red-100">
                  <th className="px-5 py-3 text-left text-xs font-bold text-red-400 uppercase tracking-wide">Tên danh mục</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-red-400 uppercase tracking-wide">Slug</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-red-400 uppercase tracking-wide">Ngày xóa</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-red-400 uppercase tracking-wide">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {deletedCategories.map((cat) => (
                  <DeletedRow key={cat.categoryId} item={cat}
                    onRestore={handleRestore}
                    onHardDelete={handleHardDelete}
                    deleteLoading={deleteLoading}
                    restoreLoading={restoreLoading} />
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* Ghi chú */}
      <div className="flex items-start gap-2 text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
        <p>
          <strong className="text-amber-700">Lưu ý khi xóa:</strong>{' '}
          Xóa lần 1 sẽ ẩn danh mục khỏi cửa hàng, sản phẩm vẫn được giữ nguyên. Có thể <strong>Khôi phục</strong> để lấy lại toàn bộ.
          Vào tab <strong>Thùng rác</strong> để xóa vĩnh viễn (sản phẩm mới chuyển sang "Không xác định").
        </p>
      </div>
    </div>
  );
};  