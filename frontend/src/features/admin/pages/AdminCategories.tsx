import { useEffect, useState } from 'react';
import { categoryService, CategoryResponse, CreateCategoryData } from '@/services/category.service';
import toast from 'react-hot-toast';

export const AdminCategories = () => {
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<CreateCategoryData>({
        name: '',
        slug: '',
        description: '',
        parentId: null,
        displayOrder: 0,
        isActive: true,
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const data = await categoryService.getAll();
            setCategories(data);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            toast.error('Không thể tải danh sách danh mục');
        } finally {
            setLoading(false);
        }
    };

    // Auto-generate slug from name
    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    };

    const handleNameChange = (name: string) => {
        setFormData(prev => ({
            ...prev,
            name,
            slug: generateSlug(name),
        }));
    };

    const resetForm = () => {
        setFormData({
            name: '',
            slug: '',
            description: '',
            parentId: null,
            displayOrder: 0,
            isActive: true,
        });
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (category: CategoryResponse) => {
        setEditingId(category.categoryId);
        setFormData({
            name: category.name,
            slug: category.slug,
            description: category.description || '',
            parentId: category.parentId || null,
            displayOrder: category.displayOrder,
            isActive: category.isActive,
        });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('Vui lòng nhập tên danh mục');
            return;
        }

        try {
            setSubmitting(true);
            if (editingId) {
                await categoryService.update(editingId, formData);
                toast.success('Cập nhật danh mục thành công');
            } else {
                await categoryService.create(formData);
                toast.success('Thêm danh mục thành công');
            }
            resetForm();
            fetchCategories();
        } catch (error: any) {
            console.error('Failed to save category:', error);
            toast.error(error.response?.data?.message || 'Không thể lưu danh mục');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Bạn có chắc muốn xóa danh mục "${name}"?\nCác danh mục con sẽ mất liên kết danh mục cha.`)) {
            return;
        }

        try {
            setDeleteLoading(id);
            await categoryService.delete(id);
            toast.success('Xóa danh mục thành công');
            fetchCategories();
        } catch (error: any) {
            console.error('Failed to delete category:', error);
            toast.error(error.response?.data?.message || 'Không thể xóa danh mục. Có thể danh mục đang có sản phẩm.');
        } finally {
            setDeleteLoading(null);
        }
    };

    // Build tree structure for display
    const getParentName = (parentId?: number) => {
        if (!parentId) return '—';
        const parent = categories.find(c => c.categoryId === parentId);
        return parent ? parent.name : '—';
    };

    // Get root categories (no parent)
    const rootCategories = categories.filter(c => !c.parentId);
    // Get child categories for a parent
    const getChildren = (parentId: number) =>
        categories.filter(c => c.parentId === parentId);

    // Build ordered list: parent followed by children
    const orderedCategories: (CategoryResponse & { level: number })[] = [];
    rootCategories.forEach(parent => {
        orderedCategories.push({ ...parent, level: 0 });
        getChildren(parent.categoryId).forEach(child => {
            orderedCategories.push({ ...child, level: 1 });
        });
    });

    // Parent options for select (only root categories)
    const parentOptions = categories.filter(c => !c.parentId);

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
                <h1 className="text-3xl font-bold text-gray-800">Quản lý danh mục</h1>
                <button
                    onClick={() => {
                        resetForm();
                        setShowForm(true);
                    }}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                    ➕ Thêm danh mục mới
                </button>
            </div>

            {/* Form thêm/sửa */}
            {showForm && (
                <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">
                        {editingId ? '✏️ Sửa danh mục' : '➕ Thêm danh mục mới'}
                    </h2>
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Tên danh mục */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tên danh mục <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Ví dụ: Điện thoại"
                                />
                            </div>

                            {/* Slug */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Slug (URL)
                                </label>
                                <input
                                    type="text"
                                    value={formData.slug}
                                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="dien-thoai"
                                />
                            </div>

                            {/* Danh mục cha */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Danh mục cha
                                </label>
                                <select
                                    value={formData.parentId || ''}
                                    onChange={(e) =>
                                        setFormData(prev => ({
                                            ...prev,
                                            parentId: e.target.value ? Number(e.target.value) : null,
                                        }))
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">— Không có (danh mục gốc) —</option>
                                    {parentOptions
                                        .filter(c => c.categoryId !== editingId)
                                        .map(c => (
                                            <option key={c.categoryId} value={c.categoryId}>
                                                {c.name}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* Thứ tự hiển thị */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Thứ tự hiển thị
                                </label>
                                <input
                                    type="number"
                                    value={formData.displayOrder}
                                    onChange={(e) =>
                                        setFormData(prev => ({ ...prev, displayOrder: Number(e.target.value) }))
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    min="0"
                                />
                            </div>

                            {/* Mô tả */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mô tả
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={2}
                                    placeholder="Mô tả ngắn về danh mục..."
                                />
                            </div>

                            {/* Trạng thái */}
                            <div className="flex items-center">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) =>
                                            setFormData(prev => ({ ...prev, isActive: e.target.checked }))
                                        }
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Hoạt động</span>
                                </label>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 mt-6">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                            >
                                {submitting ? '⏳ Đang lưu...' : editingId ? '💾 Cập nhật' : '➕ Thêm mới'}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                ❌ Hủy
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Bảng danh mục */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tên danh mục
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Slug
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Danh mục cha
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Thứ tự
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
                            {orderedCategories.map((category) => (
                                <tr key={category.categoryId} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {category.level > 0 && (
                                                <span className="text-gray-400 mr-2">└─</span>
                                            )}
                                            <span
                                                className={`text-sm font-medium ${category.level === 0
                                                        ? 'text-gray-900'
                                                        : 'text-gray-600'
                                                    }`}
                                            >
                                                {category.level === 0 ? '📁' : '📄'} {category.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                                            {category.slug}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-gray-600">
                                            {getParentName(category.parentId)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-gray-600">
                                            {category.displayOrder}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${category.isActive
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                }`}
                                        >
                                            {category.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(category)}
                                            className="text-blue-600 hover:text-blue-900 mr-4"
                                        >
                                            ✏️ Sửa
                                        </button>
                                        <button
                                            onClick={() => handleDelete(category.categoryId, category.name)}
                                            disabled={deleteLoading === category.categoryId}
                                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                        >
                                            {deleteLoading === category.categoryId ? '⏳' : '🗑️'} Xóa
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {categories.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        Chưa có danh mục nào
                    </div>
                )}
            </div>
        </div>
    );
};
