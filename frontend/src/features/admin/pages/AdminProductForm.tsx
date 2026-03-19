import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { productService } from '@/services/product.service';
import { categoryService, Category } from '@/services/category.service';
import toast from 'react-hot-toast';

interface ProductFormData {
    name: string;
    slug: string;
    sku: string;
    categoryId: number | '';
    price: number | '';
    salePrice: number | '';
    stockQuantity: number | '';
    description: string;
    mainImage: string;
    status: 'active' | 'inactive' | 'out_of_stock' | 'pre_order';
    isFeatured: boolean;
    isNew: boolean;
    isBestseller: boolean;
}

const defaultFormData: ProductFormData = {
    name: '',
    slug: '',
    sku: '',
    categoryId: '',
    price: '',
    salePrice: '',
    stockQuantity: '',
    description: '',
    mainImage: '',
    status: 'active',
    isFeatured: false,
    isNew: false,
    isBestseller: false,
};

export const AdminProductForm = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;

    const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchCategories();
        if (isEditMode) {
            fetchProduct();
        }
    }, [id]);

    const fetchCategories = async () => {
        try {
            const data = await categoryService.getAll();
            setCategories(data);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            toast.error('Không thể tải danh mục');
        }
    };

    const fetchProduct = async () => {
        try {
            setLoading(true);
            const product = await productService.getById(id!);
            const p = product as any;
            setFormData({
                name: p.name || '',
                slug: p.slug || '',
                sku: p.sku || '',
                categoryId: p.category_id || p.categoryId || '',
                price: p.price || '',
                salePrice: p.sale_price || p.salePrice || '',
                stockQuantity: p.stock_quantity || p.stockQuantity || '',
                description: p.description || '',
                mainImage: p.main_image || p.mainImage || '',
                status: p.status || 'active',
                isFeatured: p.is_featured ?? p.isFeatured ?? false,
                isNew: p.is_new ?? p.isNew ?? false,
                isBestseller: p.is_bestseller ?? p.isBestseller ?? false,
            });
        } catch (error) {
            console.error('Failed to fetch product:', error);
            toast.error('Không thể tải thông tin sản phẩm');
            navigate('/admin/products');
        } finally {
            setLoading(false);
        }
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setFormData({
            ...formData,
            name,
            slug: generateSlug(name),
        });
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData({
                ...formData,
                [name]: (e.target as HTMLInputElement).checked,
            });
        } else if (type === 'number') {
            setFormData({
                ...formData,
                [name]: value === '' ? '' : Number(value),
            });
        } else {
            setFormData({
                ...formData,
                [name]: value,
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.slug || !formData.sku || !formData.categoryId || !formData.price) {
            toast.error('Vui lòng nhập đầy đủ: tên, slug, SKU, danh mục, giá');
            return;
        }

        const payload: any = {
            name: formData.name,
            slug: formData.slug,
            sku: formData.sku,
            categoryId: Number(formData.categoryId),
            price: Number(formData.price),
            salePrice: formData.salePrice ? Number(formData.salePrice) : undefined,
            stockQuantity: formData.stockQuantity ? Number(formData.stockQuantity) : 0,
            description: formData.description || undefined,
            mainImage: formData.mainImage || undefined,
            status: formData.status,
            isFeatured: formData.isFeatured,
            isNew: formData.isNew,
            isBestseller: formData.isBestseller,
        };

        try {
            setSubmitting(true);

            if (isEditMode) {
                await productService.updateProduct(Number(id), payload);
                toast.success('Cập nhật sản phẩm thành công');
            } else {
                await productService.createProduct(payload);
                toast.success('Tạo sản phẩm thành công');
            }

            navigate('/admin/products');
        } catch (error: any) {
            console.error('Failed to save product:', error);
            const message = error?.response?.data?.message || 'Không thể lưu sản phẩm';
            toast.error(message);
        } finally {
            setSubmitting(false);
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
                <h1 className="text-3xl font-bold text-gray-800">
                    {isEditMode ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
                </h1>
                <button
                    onClick={() => navigate('/admin/products')}
                    className="px-6 py-3 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors"
                >
                    ← Quay lại
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Row 1: Name + SKU */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tên sản phẩm <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleNameChange}
                                required
                                placeholder="Nhập tên sản phẩm"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                SKU <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="sku"
                                value={formData.sku}
                                onChange={handleChange}
                                required
                                placeholder="VD: IP15PM-001"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Row 2: Slug + Category */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Slug <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="slug"
                                value={formData.slug}
                                onChange={handleChange}
                                required
                                placeholder="tu-dong-tao-tu-ten"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Danh mục <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="categoryId"
                                value={formData.categoryId}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">-- Chọn danh mục --</option>
                                {categories.map((cat) => (
                                    <option key={cat.categoryId} value={cat.categoryId}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Row 3: Price + Sale Price + Stock */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Giá (₫) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                required
                                min={0}
                                placeholder="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Giá khuyến mãi (₫)
                            </label>
                            <input
                                type="number"
                                name="salePrice"
                                value={formData.salePrice}
                                onChange={handleChange}
                                min={0}
                                placeholder="Để trống nếu không KM"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Số lượng tồn kho
                            </label>
                            <input
                                type="number"
                                name="stockQuantity"
                                value={formData.stockQuantity}
                                onChange={handleChange}
                                min={0}
                                placeholder="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Row 4: Main Image + Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ảnh chính (URL)
                            </label>
                            <input
                                type="text"
                                name="mainImage"
                                value={formData.mainImage}
                                onChange={handleChange}
                                placeholder="https://example.com/image.jpg"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Trạng thái
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="active">Hoạt động</option>
                                <option value="inactive">Tạm ngưng</option>
                                <option value="out_of_stock">Hết hàng</option>
                                <option value="pre_order">Đặt trước</option>
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mô tả sản phẩm
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={4}
                            placeholder="Nhập mô tả chi tiết sản phẩm..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Checkboxes */}
                    <div className="flex flex-wrap gap-8">
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                name="isFeatured"
                                checked={formData.isFeatured}
                                onChange={handleChange}
                                className="w-5 h-5 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">⭐ Sản phẩm nổi bật</span>
                        </label>
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                name="isNew"
                                checked={formData.isNew}
                                onChange={handleChange}
                                className="w-5 h-5 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">🆕 Sản phẩm mới</span>
                        </label>
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                name="isBestseller"
                                checked={formData.isBestseller}
                                onChange={handleChange}
                                className="w-5 h-5 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">🔥 Bán chạy nhất</span>
                        </label>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4 pt-4 border-t">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            {submitting
                                ? '⏳ Đang lưu...'
                                : isEditMode
                                    ? '💾 Cập nhật sản phẩm'
                                    : '➕ Tạo sản phẩm'}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/admin/products')}
                            className="px-6 py-3 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors font-medium"
                        >
                            Huỷ
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
