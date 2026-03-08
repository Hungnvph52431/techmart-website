import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminCategoryService } from '@/services/admin/category.service';
import { adminAttributeService } from '@/services/admin/attribute.service';
import { adminProductService } from '@/services/admin/product.service';
import {
  AdminAttribute,
  AdminAttributeValue,
  AdminCategory,
  AdminProduct,
  AdminProductImage,
  AdminProductVariant,
  CategoryAttributeAssignment,
  SaveAdminProductPayload,
} from '@/features/admin/types/catalog';

const emptyProduct: SaveAdminProductPayload['product'] = {
  name: '',
  slug: '',
  sku: '',
  categoryId: 0,
  price: 0,
  salePrice: undefined,
  costPrice: undefined,
  description: '',
  specifications: {},
  mainImage: '',
  stockQuantity: 0,
  isFeatured: false,
  isNew: false,
  isBestseller: false,
  status: 'draft',
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const createEmptyImage = (): AdminProductImage => ({
  imageUrl: '',
  altText: '',
  displayOrder: 0,
  isPrimary: true,
});

const createEmptyVariant = (): AdminProductVariant => ({
  variantName: '',
  sku: '',
  attributes: {},
  priceAdjustment: 0,
  stockQuantity: 0,
  imageUrl: '',
  isActive: true,
});

type MergedAttribute = AdminAttribute & {
  assignment: CategoryAttributeAssignment;
};

const toTextValue = (value?: AdminAttributeValue) =>
  Array.isArray(value) ? value.join(', ') : value || '';

const toArrayValue = (value?: AdminAttributeValue) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const toggleArrayValue = (items: string[], nextValue: string, checked: boolean) => {
  const values = new Set(items.map((item) => item.trim()).filter(Boolean));

  if (checked) {
    values.add(nextValue);
  } else {
    values.delete(nextValue);
  }

  return Array.from(values);
};

const normalizeOptionalText = (value?: string) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const normalizeAttributeMap = (values: Record<string, AdminAttributeValue>) =>
  Object.entries(values).reduce<Record<string, AdminAttributeValue>>((acc, [key, value]) => {
    if (Array.isArray(value)) {
      const normalized = value.map((item) => item.trim()).filter(Boolean);

      if (normalized.length > 0) {
        acc[key] = normalized;
      }

      return acc;
    }

    const normalized = value.trim();
    if (normalized) {
      acc[key] = normalized;
    }

    return acc;
  }, {});

export const AdminProductFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [attributes, setAttributes] = useState<AdminAttribute[]>([]);
  const [assignments, setAssignments] = useState<CategoryAttributeAssignment[]>([]);
  const [product, setProduct] = useState<SaveAdminProductPayload['product']>(emptyProduct);
  const [images, setImages] = useState<AdminProductImage[]>([createEmptyImage()]);
  const [variants, setVariants] = useState<AdminProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    bootstrap();
  }, [id]);

  useEffect(() => {
    if (!product.categoryId) {
      setAssignments([]);
      return;
    }

    fetchAssignments(product.categoryId);
  }, [product.categoryId]);

  const mergedAttributes = useMemo<MergedAttribute[]>(() => {
    const assignmentMap = assignments.reduce<Record<number, CategoryAttributeAssignment>>(
      (acc, item) => {
        acc[item.attributeId] = item;
        return acc;
      },
      {}
    );

    return attributes
      .filter((attribute) => assignmentMap[attribute.attributeId])
      .map((attribute) => ({
        ...attribute,
        assignment: assignmentMap[attribute.attributeId],
      }))
      .sort((left, right) => left.assignment.displayOrder - right.assignment.displayOrder);
  }, [assignments, attributes]);

  const productAttributes = mergedAttributes.filter((attribute) => attribute.scope === 'product');
  const variantAttributes = mergedAttributes.filter(
    (attribute) => attribute.scope === 'variant' || attribute.assignment.isVariantAxis
  );

  const bootstrap = async () => {
    try {
      setLoading(true);

      if (!isEditing) {
        setProduct({ ...emptyProduct });
        setImages([createEmptyImage()]);
        setVariants([]);
        setAssignments([]);
      }

      const [categoryData, attributeData] = await Promise.all([
        adminCategoryService.getAll(),
        adminAttributeService.getAll(),
      ]);

      setCategories(categoryData);
      setAttributes(attributeData);

      if (isEditing && id) {
        const data = await adminProductService.getById(Number(id));
        hydrateForm(data);
      }
    } catch (error) {
      console.error('Failed to bootstrap product form:', error);
      toast.error('Không thể tải dữ liệu form sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async (categoryId: number) => {
    try {
      const data = await adminAttributeService.getCategoryAssignments(categoryId);
      setAssignments(data);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    }
  };

  const hydrateForm = (data: AdminProduct) => {
    setProduct({
      name: data.name,
      slug: data.slug,
      sku: data.sku,
      categoryId: data.categoryId,
      brandId: data.brandId,
      price: data.price,
      salePrice: data.salePrice,
      costPrice: data.costPrice,
      description: data.description || '',
      specifications: data.specifications || {},
      mainImage: data.mainImage || '',
      stockQuantity: data.stockQuantity,
      isFeatured: data.isFeatured,
      isNew: data.isNew,
      isBestseller: data.isBestseller,
      status: data.status,
      metaTitle: data.metaTitle || '',
      metaDescription: data.metaDescription || '',
      metaKeywords: data.metaKeywords || '',
    });

    setImages(
      data.images?.length
        ? data.images
        : [{ ...createEmptyImage(), imageUrl: data.mainImage || '' }]
    );
    setVariants(data.variants || []);
  };

  const updateSpecification = (code: string, value: AdminAttributeValue) => {
    setProduct((prev) => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [code]: value,
      },
    }));
  };

  const updateImage = (
    index: number,
    field: keyof AdminProductImage,
    value: string | boolean | number
  ) => {
    setImages((prev) =>
      prev.map((image, imageIndex) => {
        if (field === 'isPrimary') {
          return {
            ...image,
            isPrimary: imageIndex === index,
          };
        }

        return imageIndex === index ? { ...image, [field]: value } : image;
      })
    );
  };

  const updateVariant = (
    index: number,
    field: keyof AdminProductVariant,
    value: string | number | boolean | Record<string, AdminAttributeValue>
  ) => {
    setVariants((prev) =>
      prev.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [field]: value } : variant
      )
    );
  };

  const updateVariantAttribute = (index: number, code: string, value: AdminAttributeValue) => {
    setVariants((prev) =>
      prev.map((variant, variantIndex) =>
        variantIndex === index
          ? {
              ...variant,
              attributes: {
                ...variant.attributes,
                [code]: value,
              },
            }
          : variant
      )
    );
  };

  const ensureOnePrimaryImage = (items: AdminProductImage[]) => {
    if (items.length === 0) {
      return [];
    }

    if (items.some((image) => image.isPrimary)) {
      return items;
    }

    return items.map((image, index) => ({
      ...image,
      isPrimary: index === 0,
    }));
  };

  const renderAttributeField = ({
    attribute,
    value,
    onChange,
    fieldKey,
    containerClassName = '',
  }: {
    attribute: MergedAttribute;
    value?: AdminAttributeValue;
    onChange: (value: AdminAttributeValue) => void;
    fieldKey: string;
    containerClassName?: string;
  }) => {
    const activeOptions = attribute.options.filter((option) => option.isActive);
    const textValue = toTextValue(value);

    if (attribute.inputType === 'multi_select') {
      const selectedValues = toArrayValue(value);

      return (
        <div
          key={fieldKey}
          className={`rounded-lg border border-gray-300 px-4 py-3 space-y-3 ${containerClassName}`.trim()}
        >
          <div className="text-sm font-medium text-gray-700">{attribute.name}</div>
          <div className="flex flex-wrap gap-3">
            {activeOptions.map((option) => (
              <label
                key={`${fieldKey}-${option.value}`}
                className="inline-flex items-center gap-2 text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  onChange={(event) =>
                    onChange(toggleArrayValue(selectedValues, option.value, event.target.checked))
                  }
                />
                {option.label}
              </label>
            ))}
            {activeOptions.length === 0 ? (
              <span className="text-sm text-gray-400">Chưa cấu hình lựa chọn</span>
            ) : null}
          </div>
        </div>
      );
    }

    if (attribute.inputType === 'select' || attribute.inputType === 'color') {
      return (
        <select
          key={fieldKey}
          value={textValue}
          onChange={(event) => onChange(event.target.value)}
          className={`border border-gray-300 rounded-lg px-4 py-2 ${containerClassName}`.trim()}
        >
          <option value="">Chọn {attribute.name}</option>
          {activeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (attribute.inputType === 'boolean') {
      return (
        <select
          key={fieldKey}
          value={textValue}
          onChange={(event) => onChange(event.target.value)}
          className={`border border-gray-300 rounded-lg px-4 py-2 ${containerClassName}`.trim()}
        >
          <option value="">Chọn {attribute.name}</option>
          <option value="true">Có</option>
          <option value="false">Không</option>
        </select>
      );
    }

    if (attribute.inputType === 'textarea') {
      return (
        <textarea
          key={fieldKey}
          value={textValue}
          onChange={(event) => onChange(event.target.value)}
          placeholder={attribute.name}
          className={`border border-gray-300 rounded-lg px-4 py-2 min-h-[120px] ${containerClassName}`.trim()}
        />
      );
    }

    return (
      <input
        key={fieldKey}
        type={attribute.inputType === 'number' ? 'number' : 'text'}
        value={textValue}
        onChange={(event) => onChange(event.target.value)}
        placeholder={attribute.name}
        className={`border border-gray-300 rounded-lg px-4 py-2 ${containerClassName}`.trim()}
      />
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const normalizedName = product.name.trim();
    const normalizedSku = product.sku.trim();
    const normalizedSlug = (product.slug || slugify(normalizedName)).trim();

    if (!normalizedName || !normalizedSku || !product.categoryId) {
      toast.error('Tên sản phẩm, SKU và danh mục là bắt buộc');
      return;
    }

    const normalizedImages = ensureOnePrimaryImage(
      images
        .map((image, index) => ({
          ...image,
          imageUrl: image.imageUrl.trim(),
          altText: normalizeOptionalText(image.altText),
          displayOrder: index,
        }))
        .filter((image) => image.imageUrl)
    );

    const normalizedVariants = variants
      .map((variant) => ({
        ...variant,
        variantName: variant.variantName.trim(),
        sku: variant.sku.trim(),
        attributes: normalizeAttributeMap(variant.attributes || {}),
        priceAdjustment: Number(variant.priceAdjustment || 0),
        stockQuantity: Number(variant.stockQuantity || 0),
        imageUrl: normalizeOptionalText(variant.imageUrl),
      }));
    const filteredVariants = normalizedVariants.filter(
      (variant) => variant.variantName && variant.sku
    );

    const payload: SaveAdminProductPayload = {
      product: {
        ...product,
        name: normalizedName,
        slug: normalizedSlug,
        sku: normalizedSku,
        categoryId: Number(product.categoryId),
        brandId: product.brandId || undefined,
        price: Number(product.price),
        salePrice:
          product.salePrice !== undefined ? Number(product.salePrice) : undefined,
        costPrice:
          product.costPrice !== undefined ? Number(product.costPrice) : undefined,
        description: normalizeOptionalText(product.description),
        specifications: normalizeAttributeMap(product.specifications || {}),
        stockQuantity:
          filteredVariants.length > 0
            ? filteredVariants
                .filter((variant) => variant.isActive)
                .reduce((sum, variant) => sum + variant.stockQuantity, 0)
            : Number(product.stockQuantity || 0),
        mainImage:
          normalizedImages.find((image) => image.isPrimary)?.imageUrl ||
          normalizedImages[0]?.imageUrl ||
          '',
        metaTitle: normalizeOptionalText(product.metaTitle),
        metaDescription: normalizeOptionalText(product.metaDescription),
        metaKeywords: normalizeOptionalText(product.metaKeywords),
      },
      images: normalizedImages,
      variants: filteredVariants,
    };

    try {
      setSaving(true);

      if (isEditing && id) {
        await adminProductService.update(Number(id), payload);
        toast.success('Cập nhật sản phẩm thành công');
      } else {
        await adminProductService.create(payload);
        toast.success('Tạo sản phẩm thành công');
      }

      navigate('/admin/products');
    } catch (error: any) {
      console.error('Failed to save product:', error);
      toast.error(error.response?.data?.message || 'Không thể lưu sản phẩm');
    } finally {
      setSaving(false);
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
          <h1 className="text-3xl font-bold text-gray-800">
            {isEditing ? 'Cập nhật sản phẩm' : 'Tạo sản phẩm mới'}
          </h1>
          <p className="text-gray-500 mt-2">
            Quản lý thông tin cơ bản, giá, tồn kho, hình ảnh và biến thể.
          </p>
        </div>
        <Link to="/admin/products" className="text-gray-600 hover:text-gray-800">
          ← Quay lại danh sách
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Thông tin cơ bản</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              value={product.name}
              onChange={(event) =>
                setProduct((prev) => ({
                  ...prev,
                  name: event.target.value,
                  slug: prev.slug || slugify(event.target.value),
                }))
              }
              placeholder="Tên sản phẩm"
              className="border border-gray-300 rounded-lg px-4 py-2 md:col-span-2"
              required
            />
            <input
              value={product.slug}
              onChange={(event) => setProduct((prev) => ({ ...prev, slug: event.target.value }))}
              placeholder="Slug"
              className="border border-gray-300 rounded-lg px-4 py-2"
              required
            />
            <input
              value={product.sku}
              onChange={(event) => setProduct((prev) => ({ ...prev, sku: event.target.value }))}
              placeholder="SKU"
              className="border border-gray-300 rounded-lg px-4 py-2"
              required
            />
            <select
              value={product.categoryId || ''}
              onChange={(event) =>
                setProduct((prev) => ({
                  ...prev,
                  categoryId: Number(event.target.value),
                }))
              }
              className="border border-gray-300 rounded-lg px-4 py-2"
              required
            >
              <option value="">Chọn danh mục</option>
              {categories.map((category) => (
                <option key={category.categoryId} value={category.categoryId}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={product.status}
              onChange={(event) =>
                setProduct((prev) => ({
                  ...prev,
                  status: event.target.value as SaveAdminProductPayload['product']['status'],
                }))
              }
              className="border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="draft">Nháp</option>
              <option value="active">Đang bán</option>
              <option value="inactive">Tạm ẩn</option>
              <option value="out_of_stock">Hết hàng</option>
              <option value="pre_order">Đặt trước</option>
              <option value="archived">Lưu trữ</option>
            </select>
            <textarea
              value={product.description}
              onChange={(event) =>
                setProduct((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Mô tả sản phẩm"
              className="border border-gray-300 rounded-lg px-4 py-2 md:col-span-3 min-h-[120px]"
            />
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-700">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(product.isFeatured)}
                onChange={(event) =>
                  setProduct((prev) => ({ ...prev, isFeatured: event.target.checked }))
                }
              />
              Nổi bật
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(product.isNew)}
                onChange={(event) =>
                  setProduct((prev) => ({ ...prev, isNew: event.target.checked }))
                }
              />
              Mới
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(product.isBestseller)}
                onChange={(event) =>
                  setProduct((prev) => ({ ...prev, isBestseller: event.target.checked }))
                }
              />
              Bán chạy
            </label>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Giá và tồn kho</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="number"
              min="0"
              value={product.price}
              onChange={(event) =>
                setProduct((prev) => ({ ...prev, price: Number(event.target.value) }))
              }
              placeholder="Giá niêm yết"
              className="border border-gray-300 rounded-lg px-4 py-2"
              required
            />
            <input
              type="number"
              min="0"
              value={product.salePrice ?? ''}
              onChange={(event) =>
                setProduct((prev) => ({
                  ...prev,
                  salePrice: event.target.value ? Number(event.target.value) : undefined,
                }))
              }
              placeholder="Giá khuyến mãi"
              className="border border-gray-300 rounded-lg px-4 py-2"
            />
            <input
              type="number"
              min="0"
              value={product.costPrice ?? ''}
              onChange={(event) =>
                setProduct((prev) => ({
                  ...prev,
                  costPrice: event.target.value ? Number(event.target.value) : undefined,
                }))
              }
              placeholder="Giá vốn"
              className="border border-gray-300 rounded-lg px-4 py-2"
            />
            <input
              type="number"
              min="0"
              value={
                variants.length > 0
                  ? variants
                      .filter((item) => item.isActive)
                      .reduce((sum, item) => sum + item.stockQuantity, 0)
                  : product.stockQuantity || 0
              }
              onChange={(event) =>
                setProduct((prev) => ({
                  ...prev,
                  stockQuantity: Number(event.target.value),
                }))
              }
              placeholder="Tồn kho"
              className="border border-gray-300 rounded-lg px-4 py-2"
              disabled={variants.length > 0}
            />
          </div>
          {variants.length > 0 ? (
            <p className="text-sm text-gray-500">
              Tồn kho tổng đang được cộng tự động từ các biến thể đang kích hoạt.
            </p>
          ) : null}
        </section>

        <section className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Hình ảnh</h2>
            <button
              type="button"
              onClick={() =>
                setImages((prev) => [
                  ...prev,
                  {
                    imageUrl: '',
                    altText: '',
                    displayOrder: prev.length,
                    isPrimary: prev.length === 0,
                  },
                ])
              }
              className="text-sm text-blue-600"
            >
              + Thêm ảnh
            </button>
          </div>

          {images.map((image, index) => (
            <div key={`image-${index}`} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <input
                value={image.imageUrl}
                onChange={(event) => updateImage(index, 'imageUrl', event.target.value)}
                placeholder="URL ảnh"
                className="border border-gray-300 rounded-lg px-4 py-2 md:col-span-2"
              />
              <input
                value={image.altText || ''}
                onChange={(event) => updateImage(index, 'altText', event.target.value)}
                placeholder="Alt text"
                className="border border-gray-300 rounded-lg px-4 py-2"
              />
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="primary-image"
                    checked={image.isPrimary}
                    onChange={() => updateImage(index, 'isPrimary', true)}
                  />
                  Ảnh chính
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setImages((prev) =>
                      prev.length === 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                  className="text-sm text-red-600"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </section>

        {productAttributes.length > 0 ? (
          <section className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Thuộc tính sản phẩm</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productAttributes.map((attribute) =>
                renderAttributeField({
                  attribute,
                  value: product.specifications[attribute.code],
                  onChange: (value) => updateSpecification(attribute.code, value),
                  fieldKey: `product-attribute-${attribute.attributeId}`,
                  containerClassName:
                    attribute.inputType === 'multi_select' || attribute.inputType === 'textarea'
                      ? 'md:col-span-2'
                      : '',
                })
              )}
            </div>
          </section>
        ) : null}

        <section className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">SEO và metadata</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              value={product.metaTitle || ''}
              onChange={(event) =>
                setProduct((prev) => ({ ...prev, metaTitle: event.target.value }))
              }
              placeholder="Meta title"
              className="border border-gray-300 rounded-lg px-4 py-2 md:col-span-2"
            />
            <textarea
              value={product.metaDescription || ''}
              onChange={(event) =>
                setProduct((prev) => ({ ...prev, metaDescription: event.target.value }))
              }
              placeholder="Meta description"
              className="border border-gray-300 rounded-lg px-4 py-2 min-h-[96px] md:col-span-2"
            />
            <input
              value={product.metaKeywords || ''}
              onChange={(event) =>
                setProduct((prev) => ({ ...prev, metaKeywords: event.target.value }))
              }
              placeholder="Meta keywords, phân tách bằng dấu phẩy"
              className="border border-gray-300 rounded-lg px-4 py-2 md:col-span-2"
            />
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Biến thể</h2>
              <p className="text-sm text-gray-500">
                Thêm thủ công từng biến thể cùng giá chênh lệch và tồn kho riêng.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setVariants((prev) => [...prev, createEmptyVariant()])}
              className="text-sm text-blue-600"
            >
              + Thêm biến thể
            </button>
          </div>

          {variants.length === 0 ? (
            <p className="text-sm text-gray-500">
              Chưa có biến thể. Khi không dùng biến thể, tồn kho lấy từ sản phẩm chính.
            </p>
          ) : null}

          {variants.map((variant, index) => (
            <div key={`variant-${index}`} className="border rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  value={variant.variantName}
                  onChange={(event) => updateVariant(index, 'variantName', event.target.value)}
                  placeholder="Tên biến thể"
                  className="border border-gray-300 rounded-lg px-4 py-2"
                />
                <input
                  value={variant.sku}
                  onChange={(event) => updateVariant(index, 'sku', event.target.value)}
                  placeholder="SKU biến thể"
                  className="border border-gray-300 rounded-lg px-4 py-2"
                />
                <input
                  type="number"
                  value={variant.priceAdjustment}
                  onChange={(event) =>
                    updateVariant(index, 'priceAdjustment', Number(event.target.value))
                  }
                  placeholder="Giá chênh lệch"
                  className="border border-gray-300 rounded-lg px-4 py-2"
                />
                <input
                  type="number"
                  min="0"
                  value={variant.stockQuantity}
                  onChange={(event) =>
                    updateVariant(index, 'stockQuantity', Number(event.target.value))
                  }
                  placeholder="Tồn kho"
                  className="border border-gray-300 rounded-lg px-4 py-2"
                />
                <input
                  value={variant.imageUrl || ''}
                  onChange={(event) => updateVariant(index, 'imageUrl', event.target.value)}
                  placeholder="URL ảnh biến thể"
                  className="border border-gray-300 rounded-lg px-4 py-2 md:col-span-3"
                />
                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={variant.isActive}
                      onChange={(event) => updateVariant(index, 'isActive', event.target.checked)}
                    />
                    Kích hoạt
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setVariants((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
                    }
                    className="text-sm text-red-600"
                  >
                    Xóa
                  </button>
                </div>
              </div>

              {variantAttributes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {variantAttributes.map((attribute) =>
                    renderAttributeField({
                      attribute,
                      value: variant.attributes?.[attribute.code],
                      onChange: (value) => updateVariantAttribute(index, attribute.code, value),
                      fieldKey: `variant-${index}-attribute-${attribute.attributeId}`,
                      containerClassName:
                        attribute.inputType === 'multi_select' ||
                        attribute.inputType === 'textarea'
                          ? 'md:col-span-3'
                          : '',
                    })
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
          </button>
        </div>
      </form>
    </div>
  );
};
