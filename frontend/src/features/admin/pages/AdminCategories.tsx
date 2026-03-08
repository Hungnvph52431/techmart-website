import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { adminCategoryService } from '@/services/admin/category.service';
import { AdminCategory } from '@/features/admin/types/catalog';

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  parentId: '',
  imageUrl: '',
  displayOrder: 0,
  isActive: true,
};

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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchCategories();
  }, []);

  const flatCategories = useMemo(() => {
    const flatten = (items: AdminCategory[], level = 0): Array<AdminCategory & { level: number }> =>
      items.flatMap((item) => [{ ...item, level }, ...flatten(item.children || [], level + 1)]);

    return flatten(categories);
  }, [categories]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await adminCategoryService.getTree();
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
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      description: form.description || undefined,
      parentId: form.parentId ? Number(form.parentId) : null,
      imageUrl: form.imageUrl || undefined,
      displayOrder: Number(form.displayOrder) || 0,
      isActive: form.isActive,
    };

    try {
      if (editingId) {
        await adminCategoryService.update(editingId, payload);
        toast.success('Cập nhật danh mục thành công');
      } else {
        await adminCategoryService.create(payload);
        toast.success('Tạo danh mục thành công');
      }
      resetForm();
      fetchCategories();
    } catch (error: any) {
      console.error('Failed to save category:', error);
      toast.error(error.response?.data?.message || 'Không thể lưu danh mục');
    }
  };

  const handleDelete = async (categoryId: number, name: string) => {
    if (!confirm(`Xóa danh mục "${name}"?`)) {
      return;
    }

    try {
      await adminCategoryService.remove(categoryId);
      toast.success('Xóa danh mục thành công');
      fetchCategories();
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      toast.error(error.response?.data?.message || 'Không thể xóa danh mục');
    }
  };

  const renderTree = (items: AdminCategory[], level = 0) =>
    items.flatMap((item) => [
      <tr key={item.categoryId} className="border-b">
        <td className="px-4 py-3">
          <div style={{ paddingLeft: `${level * 20}px` }} className="font-medium">
            {item.name}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{item.slug}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{item.displayOrder}</td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {item.isActive ? 'Hoạt động' : 'Ẩn'}
        </td>
        <td className="px-4 py-3 text-right text-sm">
          <button
            type="button"
            onClick={() => handleEdit(item)}
            className="text-blue-600 hover:text-blue-800 mr-3"
          >
            Sửa
          </button>
          <button
            type="button"
            onClick={() => handleDelete(item.categoryId, item.name)}
            className="text-red-600 hover:text-red-800"
          >
            Xóa
          </button>
        </td>
      </tr>,
      ...renderTree(item.children || [], level + 1),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Quản lý danh mục</h1>
        <p className="text-gray-500 mt-2">
          Tạo cây danh mục và kiểm soát trạng thái hiển thị cho catalog.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            {editingId ? 'Cập nhật danh mục' : 'Tạo danh mục mới'}
          </h2>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Hủy chỉnh sửa
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                name: event.target.value,
                slug: prev.slug || slugify(event.target.value),
              }))
            }
            placeholder="Tên danh mục"
            className="border border-gray-300 rounded-lg px-4 py-2"
            required
          />
          <input
            value={form.slug}
            onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
            placeholder="Slug"
            className="border border-gray-300 rounded-lg px-4 py-2"
            required
          />
          <select
            value={form.parentId}
            onChange={(event) => setForm((prev) => ({ ...prev, parentId: event.target.value }))}
            className="border border-gray-300 rounded-lg px-4 py-2"
          >
            <option value="">Danh mục gốc</option>
            {flatCategories
              .filter((category) => category.categoryId !== editingId)
              .map((category) => (
                <option key={category.categoryId} value={category.categoryId}>
                  {'— '.repeat(category.level)}
                  {category.name}
                </option>
              ))}
          </select>
          <input
            type="number"
            value={form.displayOrder}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                displayOrder: Number(event.target.value),
              }))
            }
            placeholder="Thứ tự hiển thị"
            className="border border-gray-300 rounded-lg px-4 py-2"
          />
          <input
            value={form.imageUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
            placeholder="URL ảnh"
            className="border border-gray-300 rounded-lg px-4 py-2 md:col-span-2"
          />
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                description: event.target.value,
              }))
            }
            placeholder="Mô tả"
            className="border border-gray-300 rounded-lg px-4 py-2 md:col-span-2 min-h-[96px]"
          />
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                isActive: event.target.checked,
              }))
            }
          />
          Hiển thị danh mục
        </label>

        <button
          type="submit"
          className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          {editingId ? 'Lưu thay đổi' : 'Tạo danh mục'}
        </button>
      </form>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tên danh mục
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Slug
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Thứ tự
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>{renderTree(categories)}</tbody>
          </table>
        )}
      </div>
    </div>
  );
};
