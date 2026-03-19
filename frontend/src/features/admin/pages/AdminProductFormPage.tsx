import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { adminCategoryService } from '@/services/admin/category.service';
import { adminAttributeService } from '@/services/admin/attribute.service';
import { adminProductService } from '@/services/admin/product.service';
import api from '@/services/api';
import {
  AdminAttribute, AdminCategory, CategoryAttributeAssignment, SaveAdminProductPayload,
} from '@/features/admin/types/catalog';
import {
  Plus, Trash2, Upload, Link2, ImageIcon, ChevronLeft,
  AlertCircle, CheckCircle2, Loader2,
} from 'lucide-react';

// ─── Zod Schema ──────────────────────────────────────────────────────────────
const imageSchema = z.object({
  imageUrl: z.string().min(1, 'URL ảnh không được để trống'),
  altText: z.string().optional(),
  displayOrder: z.number(),
  isPrimary: z.boolean(),
});

const variantSchema = z.object({
  variantName: z.string().min(1, 'Tên biến thể không được để trống'),
  sku: z.string().min(1, 'SKU biến thể không được để trống'),
  // FIX LỖI 1: z.record() trong Zod v4 cần 2 tham số: z.record(z.string(), z.any())
  attributes: z.record(z.string(), z.any()).optional().default({}),
  priceAdjustment: z.number().default(0),
  stockQuantity: z.number().min(0, 'Tồn kho không được âm').default(0),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
});

const productSchema = z.object({
  name: z.string().min(3, 'Tên sản phẩm tối thiểu 3 ký tự'),
  slug: z.string().min(1, 'Slug không được để trống').regex(/^[a-z0-9-]+$/, 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang'),
  sku: z.string().min(1, 'SKU không được để trống'),
  // FIX LỖI 2: Zod v4 bỏ invalid_type_error, dùng message hoặc error thay thế
  categoryId: z.number().min(1, 'Vui lòng chọn danh mục'),
  brandId: z.number().optional(),
  status: z.enum(['draft', 'active', 'inactive', 'out_of_stock', 'pre_order', 'archived']),
  description: z.string().optional(),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  // FIX LỖI 3: Zod v4 bỏ invalid_type_error, dùng message thay thế
  price: z.number().min(1000, 'Giá tối thiểu 1,000₫'),
  salePrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  stockQuantity: z.number().min(0, 'Tồn kho không được âm').default(0),
  mainImage: z.string().optional(),
  images: z.array(imageSchema).min(1, 'Cần ít nhất 1 ảnh sản phẩm'),
  variants: z.array(variantSchema).optional().default([]),
  // FIX LỖI 4: z.record() cần 2 tham số trong Zod v4
  specifications: z.record(z.string(), z.any()).optional().default({}),
})
// REFINE 1: Giá khuyến mãi phải nhỏ hơn giá niêm yết
.refine((data) => {
  if (data.salePrice && data.salePrice >= data.price) return false;
  return true;
}, { message: 'Giá khuyến mãi phải nhỏ hơn giá niêm yết', path: ['salePrice'] })
.superRefine((data, ctx) => {
  const variants = data.variants ?? [];
  if (variants.length < 2) return;

  // Lấy tất cả attribute keys xuất hiện trong variants
  const allKeys = new Set<string>();
  variants.forEach(v => Object.keys(v.attributes ?? {}).forEach(k => allKeys.add(k)));
  if (allKeys.size === 0) return;

  // Phân loại: "groupKeys" = có thể trùng (màu sắc), "uniqueKeys" = không được trùng (dung lượng, storage...)
  // Rule: nếu chỉ có 1 loại attribute → không được trùng
  //       nếu có 2+ loại → group theo attr đầu, check trùng attr còn lại trong cùng group
  const keyArr = Array.from(allKeys);

  // Heuristic: key chứa 'mau', 'color', 'colour' → là groupKey (có thể trùng)
  // Các key còn lại (dung_luong, storage, size...) → uniqueKey trong group
  const colorKeyPatterns = ['mau', 'color', 'colour'];
  const groupKeys = keyArr.filter(k => colorKeyPatterns.some(p => k.toLowerCase().includes(p)));
  const uniqueKeys = keyArr.filter(k => !groupKeys.includes(k));

  if (uniqueKeys.length === 0) return; // Không có gì để check

  // seen: key = "groupValue|uniqueValue" → first index
  const seen = new Map<string, number>();

  variants.forEach((v, index) => {
    const attrs = v.attributes ?? {};
    // Lấy giá trị group (màu) - nếu không có thì để trống
    const groupVal = groupKeys.map(k => attrs[k] ?? '').join(',');
    // Lấy giá trị unique (dung lượng) - tất cả uniqueKeys phải unique trong cùng group
    const uniqueVal = uniqueKeys.map(k => attrs[k] ?? '').join(',');

    if (!uniqueVal.replace(/,/g, '')) return; // Chưa chọn gì

    const key = `${groupVal}|||${uniqueVal}`;

    if (seen.has(key)) {
      const firstIdx = seen.get(key)!;
      const groupLabel = groupVal || 'Không có màu';
      const uniqueLabel = uniqueVal;

      // Đánh dấu lỗi tại cả uniqueKeys của biến thể bị trùng
      uniqueKeys.forEach(uk => {
        ctx.addIssue({
          code: 'custom',
          path: ['variants', index, 'attributes', uk],
          message: groupVal
            ? `"${groupLabel}" đã có "${uniqueLabel}" ở biến thể ${firstIdx + 1}`
            : `"${uniqueLabel}" đã tồn tại ở biến thể ${firstIdx + 1}`,
        });
        ctx.addIssue({
          code: 'custom',
          path: ['variants', firstIdx, 'attributes', uk],
          message: groupVal
            ? `"${groupLabel}" đã có "${uniqueLabel}" ở biến thể ${index + 1}`
            : `"${uniqueLabel}" đã tồn tại ở biến thể ${index + 1}`,
        });
      });
    } else {
      seen.set(key, index);
    }
  });
});

type ProductFormValues = z.infer<typeof productSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const slugify = (value: string) =>
  value.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const BACKEND_URL = (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5001';
const getImageUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
};

// ─── Image Input ─────────────────────────────────────────────────────────────
const ImageInput = ({
  value, onChange, isPrimary, onSetPrimary, onRemove, index,
}: {
  value: string;
  onChange: (url: string) => void;
  isPrimary: boolean;
  onSetPrimary: () => void;
  onRemove: () => void;
  index: number;
}) => {
  const [mode, setMode] = useState<'url' | 'upload'>('url');
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      setUploading(true);
      const res = await api.post('/admin/products/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(res.data.imageUrl);
      toast.success('Upload ảnh thành công');
    } catch {
      toast.error('Upload ảnh thất bại');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`border-2 rounded-2xl p-4 transition-all ${isPrimary ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isPrimary ? (
            <span className="text-xs font-bold bg-blue-600 text-white px-2.5 py-1 rounded-full">Ảnh chính</span>
          ) : (
            <button type="button" onClick={onSetPrimary}
              className="text-xs font-semibold text-slate-500 hover:text-blue-600 px-2.5 py-1 rounded-full border border-slate-200 hover:border-blue-300 transition-colors">
              Đặt làm ảnh chính
            </button>
          )}
          <span className="text-xs text-slate-400">Ảnh {index + 1}</span>
        </div>
        <button type="button" onClick={onRemove}
          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
          <Trash2 size={14} />
        </button>
      </div>

      {value && (
        <div className="mb-3 aspect-square w-full max-w-[120px] mx-auto rounded-xl overflow-hidden border border-slate-200 bg-white">
          <img src={getImageUrl(value)} alt="" className="w-full h-full object-contain p-2"
            onError={(e) => { const el = e.target as HTMLImageElement; el.onerror = null; el.src = '/placeholder.jpg'; }} />
        </div>
      )}

      <div className="flex rounded-xl border border-slate-200 overflow-hidden mb-3">
        {(['url', 'upload'] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
              mode === m ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}>
            {m === 'url' ? <><Link2 size={12} /> Nhập URL</> : <><Upload size={12} /> Upload file</>}
          </button>
        ))}
      </div>

      {mode === 'url' ? (
        <input value={value} onChange={(e) => onChange(e.target.value)}
          placeholder="https://... hoặc dán URL ảnh vào đây"
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-blue-400 focus:outline-none" />
      ) : (
        <label className={`flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed rounded-xl py-4 cursor-pointer transition-colors ${
          uploading ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
        }`}>
          {uploading
            ? <><Loader2 size={18} className="text-blue-500 animate-spin" /><span className="text-xs text-blue-500 font-medium">Đang upload...</span></>
            : <><ImageIcon size={18} className="text-slate-400" /><span className="text-xs text-slate-500 font-medium">Chọn ảnh (JPG, PNG, WEBP — tối đa 5MB)</span></>}
          <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFileUpload} disabled={uploading} />
        </label>
      )}
    </div>
  );
};

// ─── Field Error ─────────────────────────────────────────────────────────────
const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
      <AlertCircle size={11} /> {message}
    </p>
  ) : null;

// ─── Section ─────────────────────────────────────────────────────────────────
const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-100">
      <h2 className="text-base font-bold text-slate-800">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    <div className="p-6 space-y-4">{children}</div>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
export const AdminProductFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [attributes, setAttributes] = useState<AdminAttribute[]>([]);
  const [assignments, setAssignments] = useState<CategoryAttributeAssignment[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  // FIX LỖI 5: Thêm generic type <ProductFormValues> vào useForm
  const {
    register, control, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: '', slug: '', sku: '', categoryId: 0, status: 'draft',
      description: '', price: 0, stockQuantity: 0,
      isFeatured: false, isNew: false, isBestseller: false,
      images: [{ imageUrl: '', altText: '', displayOrder: 0, isPrimary: true }],
      variants: [], specifications: {},
    },
  });

  const { fields: imageFields, append: appendImage, remove: removeImage } = useFieldArray({ control, name: 'images' });
  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({ control, name: 'variants' });

  const watchedName = watch('name');
  const watchedCategoryId = watch('categoryId');
  const watchedVariants = watch('variants') ?? [];

  useEffect(() => {
    if (!isEditing && watchedName) {
      setValue('slug', slugify(watchedName), { shouldValidate: false });
    }
  }, [watchedName, isEditing, setValue]);

  useEffect(() => {
    if (watchedCategoryId) {
      adminAttributeService.getCategoryAssignments(watchedCategoryId).then(setAssignments).catch(() => {});
    } else {
      setAssignments([]);
    }
  }, [watchedCategoryId]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setPageLoading(true);
        const [catData, attrData] = await Promise.all([adminCategoryService.getAll(), adminAttributeService.getAll()]);
        setCategories(catData);
        setAttributes(attrData);

        if (isEditing && id) {
          const data = await adminProductService.getById(Number(id));
          console.log('📦 Admin getById response:', data); // debug

          // ── Thông tin cơ bản ──
          setValue('name',         data.name ?? '');
          setValue('slug',         data.slug ?? '');
          setValue('sku',          data.sku ?? '');
          setValue('categoryId',   Number(data.category_id ?? data.categoryId ?? 0));
          setValue('brandId',      data.brand_id ?? data.brandId ?? undefined);
          setValue('status',       data.status ?? 'draft');
          setValue('description',  data.description ?? '');

          // ── Giá & tồn kho ──
          setValue('price',         Number(data.price ?? 0));
          setValue('salePrice',     data.sale_price   ? Number(data.sale_price)   : data.salePrice   ? Number(data.salePrice)   : undefined);
          setValue('costPrice',     data.cost_price   ? Number(data.cost_price)   : data.costPrice   ? Number(data.costPrice)   : undefined);
          setValue('stockQuantity', Number(data.stock_quantity ?? data.stockQuantity ?? 0));

          // ── Nhãn sản phẩm ──
          setValue('isFeatured',   Boolean(data.is_featured   ?? data.isFeatured   ?? false));
          setValue('isNew',        Boolean(data.is_new        ?? data.isNew        ?? false));
          setValue('isBestseller', Boolean(data.is_bestseller ?? data.isBestseller ?? false));

          // ── Thông số kỹ thuật (specifications) ──
          const specs = (() => {
            try {
              const s = data.specifications;
              return typeof s === 'string' ? JSON.parse(s) : (s ?? {});
            } catch { return {}; }
          })();
          setValue('specifications', specs);

          // ── Hình ảnh ──
          const imgs: ProductFormValues['images'] = (() => {
            if (data.images?.length) {
              return data.images.map((img: any, i: number) => ({
                imageUrl:     img.imageUrl     ?? img.image_url  ?? '',
                altText:      img.altText      ?? img.alt_text   ?? '',
                displayOrder: img.displayOrder ?? img.display_order ?? i,
                isPrimary:    Boolean(img.isPrimary ?? img.is_primary ?? i === 0),
              }));
            }
            // Fallback: dùng mainImage nếu chưa có gallery
            const mainImg = data.mainImage ?? data.main_image ?? '';
            return [{ imageUrl: mainImg, altText: '', displayOrder: 0, isPrimary: true }];
          })();
          setValue('images', imgs);

          // ── Biến thể (variants) ──
          const variants = (data.variants ?? []).map((v: any) => ({
            variantId:      v.variantId      ?? v.variant_id,
            variantName:    v.variantName    ?? v.variant_name    ?? '',
            sku:            v.sku            ?? '',
            attributes: (() => {
              try {
                const a = v.attributes;
                return typeof a === 'string' ? JSON.parse(a) : (a ?? {});
              } catch { return {}; }
            })(),
            priceAdjustment: Number(v.priceAdjustment ?? v.price_adjustment ?? 0),
            stockQuantity:   Number(v.stockQuantity   ?? v.stock_quantity   ?? 0),
            imageUrl:        v.imageUrl ?? v.image_url ?? '',
            isActive:        Boolean(v.isActive ?? v.is_active ?? true),
          }));
          setValue('variants', variants);
        }
      } catch {
        toast.error('Không thể tải dữ liệu form');
      } finally {
        setPageLoading(false);
      }
    };
    bootstrap();
  }, [id, isEditing, setValue]);

  const mergedAttributes = useMemo(() => {
    const map = assignments.reduce<Record<number, CategoryAttributeAssignment>>(
      (acc, a) => { acc[a.attributeId] = a; return acc; }, {}
    );
    return attributes
      .filter((a) => map[a.attributeId])
      .map((a) => ({ ...a, assignment: map[a.attributeId] }))
      .sort((a, b) => a.assignment.displayOrder - b.assignment.displayOrder);
  }, [assignments, attributes]);

  const productAttributes = mergedAttributes.filter((a) => a.scope === 'product');
  const variantAttributes = mergedAttributes.filter((a) => a.scope === 'variant' || a.assignment.isVariantAxis);

  // Real-time duplicate variant detection
  const getDuplicateWarning = (variantIndex: number, attrCode: string): string | null => {
    if (watchedVariants.length < 2) return null;
    const currentVariant = watchedVariants[variantIndex];
    if (!currentVariant?.attributes) return null;

    const colorKeyPatterns = ['mau', 'color', 'colour'];
    const allCodes = variantAttributes.map(a => a.code);
    const groupCodes = allCodes.filter(c => colorKeyPatterns.some(p => c.toLowerCase().includes(p)));
    const uniqueCodes = allCodes.filter(c => !groupCodes.includes(c));
    if (uniqueCodes.length === 0) return null;

    const curGroup = groupCodes.map(k => currentVariant.attributes?.[k] ?? '').join(',');
    const curUnique = uniqueCodes.map(k => currentVariant.attributes?.[k] ?? '').join(',');
    if (!curUnique.replace(/,/g, '')) return null;

    for (let i = 0; i < watchedVariants.length; i++) {
      if (i === variantIndex) continue;
      const other = watchedVariants[i];
      if (!other?.attributes) continue;
      const otherGroup = groupCodes.map(k => other.attributes?.[k] ?? '').join(',');
      const otherUnique = uniqueCodes.map(k => other.attributes?.[k] ?? '').join(',');
      if (curGroup === otherGroup && curUnique === otherUnique) {
        return `Trùng với biến thể ${i + 1}`;
      }
    }
    return null;
  };

  // FIX LỖI 6: Cast payload để tránh lỗi type mismatch với SaveAdminProductPayload
  const onSubmit = async (data: ProductFormValues) => {
    const primaryImg = data.images.find((i) => i.isPrimary) ?? data.images[0];
    const payload = {
      product: {
        ...data,
        mainImage: primaryImg?.imageUrl ?? '',
        categoryId: Number(data.categoryId),
        price: Number(data.price),
        salePrice: data.salePrice ? Number(data.salePrice) : undefined,
        costPrice: data.costPrice ? Number(data.costPrice) : undefined,
        stockQuantity: data.variants?.filter((v) => v.isActive).reduce((s: number, v) => s + v.stockQuantity, 0) || Number(data.stockQuantity),
        specifications: (data.specifications ?? {}) as Record<string, any>,
      },
      images: data.images.map((img, i) => ({ ...img, displayOrder: i })),
      // FIX LỖI 7: Cast variants attributes sang Record<string, any>
      variants: (data.variants ?? []).map(v => ({
        ...v,
        attributes: (v.attributes ?? {}) as Record<string, any>,
      })),
    } as unknown as SaveAdminProductPayload;

    try {
      if (isEditing && id) {
        await adminProductService.update(Number(id), payload);
        toast.success('Cập nhật sản phẩm thành công');
      } else {
        await adminProductService.create(payload);
        toast.success('Tạo sản phẩm thành công');
      }
      navigate('/admin/products');
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      // ✅ Chuyển các thông báo lỗi phổ biến sang tiếng Việt
      if (msg?.toLowerCase().includes('duplicate') && msg?.toLowerCase().includes('slug')) {
        toast.error('Slug này đã tồn tại, vui lòng dùng slug khác');
      } else if (msg?.toLowerCase().includes('duplicate') && msg?.toLowerCase().includes('sku')) {
        toast.error('Mã SKU này đã tồn tại, vui lòng dùng SKU khác');
      } else if (msg?.toLowerCase().includes('duplicate')) {
        toast.error('Dữ liệu bị trùng lặp, vui lòng kiểm tra lại');
      } else {
        toast.error(msg || 'Không thể lưu sản phẩm');
      }
    }
  };

  const onError = () => toast.error('Vui lòng kiểm tra lại các trường bị lỗi', { icon: '⚠️' });

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <span className="text-slate-500 font-medium">Đang tải...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/admin/products" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-2 transition-colors">
            <ChevronLeft size={16} /> Quay lại danh sách
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">
            {isEditing ? '✏️ Chỉnh sửa sản phẩm' : '➕ Tạo sản phẩm mới'}
          </h1>
        </div>
        <button type="button" onClick={handleSubmit(onSubmit, onError)} disabled={isSubmitting}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm shadow-blue-200">
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          {isSubmitting ? 'Đang lưu...' : (isEditing ? 'Lưu thay đổi' : 'Tạo sản phẩm')}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">

        {/* ── Thông tin cơ bản ── */}
        <Section title="Thông tin cơ bản">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tên sản phẩm *</label>
              <input {...register('name')} placeholder="VD: iPhone 15 Pro Max 256GB"
                className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none transition-colors ${errors.name ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-blue-400'}`} />
              <FieldError message={errors.name?.message} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Slug *</label>
              <input {...register('slug')} placeholder="iphone-15-pro-max-256gb"
                className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none transition-colors ${errors.slug ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-blue-400'}`} />
              <FieldError message={errors.slug?.message} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">SKU *</label>
              <input {...register('sku')} placeholder="IP15PM-256-TI"
                className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none transition-colors ${errors.sku ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-blue-400'}`} />
              <FieldError message={errors.sku?.message} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Danh mục *</label>
              <Controller name="categoryId" control={control}
                render={({ field }) => (
                  <select value={field.value || ''} onChange={(e) => field.onChange(Number(e.target.value))}
                    className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-white focus:outline-none transition-colors ${errors.categoryId ? 'border-red-300' : 'border-slate-200 focus:border-blue-400'}`}>
                    <option value="">Chọn danh mục</option>
                    {categories.map((c: AdminCategory & { category_id?: number }) => {
                      const cid = c.category_id ?? c.categoryId;
                      return <option key={cid} value={cid}>{c.name}</option>;
                    })}
                  </select>
                )} />
              <FieldError message={errors.categoryId?.message} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Trạng thái</label>
              <select {...register('status')}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium bg-white focus:border-blue-400 focus:outline-none">
                <option value="draft">📝 Nháp</option>
                <option value="active">✅ Đang bán</option>
                <option value="inactive">👁️ Tạm ẩn</option>
                <option value="out_of_stock">📦 Hết hàng</option>
                <option value="pre_order">⏳ Đặt trước</option>
                <option value="archived">🗄️ Lưu trữ</option>
              </select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Mô tả sản phẩm</label>
              <textarea {...register('description')} rows={4} placeholder="Mô tả chi tiết về sản phẩm..."
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none resize-none" />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            {(['isFeatured', 'isNew', 'isBestseller'] as const).map((key) => {
              const labels: Record<string, string> = { isFeatured: '⭐ Nổi bật', isNew: '🆕 Hàng mới', isBestseller: '🔥 Bán chạy' };
              return (
                <Controller key={key} name={key} control={control}
                  render={({ field }) => (
                    <label className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer select-none transition-all text-sm font-semibold ${
                      field.value ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}>
                      <input type="checkbox" className="hidden" checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} />
                      {labels[key]}
                    </label>
                  )} />
              );
            })}
          </div>
        </Section>

        {/* ── Giá & tồn kho ── */}
        <Section title="Giá và tồn kho">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {([
              { name: 'price', label: 'Giá niêm yết *' },
              { name: 'salePrice', label: 'Giá khuyến mãi' },
              { name: 'costPrice', label: 'Giá vốn (nội bộ)' },
              { name: 'stockQuantity', label: 'Tồn kho' },
            ] as const).map(({ name, label }) => (
              <div key={name} className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</label>
                <Controller name={name} control={control}
                  render={({ field }) => (
                    <input type="number" min="0"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                      placeholder="0"
                      disabled={name === 'stockQuantity' && watchedVariants.length > 0}
                      className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-400 ${
                        errors[name] ? 'border-red-300' : 'border-slate-200 focus:border-blue-400'
                      }`} />
                  )} />
                <FieldError message={errors[name]?.message} />
              </div>
            ))}
          </div>
          {watchedVariants.length > 0 && (
            <p className="text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg">
              Tồn kho đang được tính tự động từ tổng các biến thể đang kích hoạt.
            </p>
          )}
          {errors.salePrice && <FieldError message={errors.salePrice.message} />}
        </Section>

        {/* ── Hình ảnh ── */}
        <Section title="Hình ảnh sản phẩm" subtitle="Hỗ trợ upload file hoặc nhập URL. Ảnh đầu tiên được đặt làm ảnh chính.">
          {typeof errors.images?.message === 'string' && <FieldError message={errors.images.message} />}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {imageFields.map((field, index) => (
              <div key={field.id} className="space-y-1">
                <Controller name={`images.${index}.imageUrl`} control={control}
                  render={({ field: f }) => (
                    <ImageInput
                      value={f.value}
                      onChange={f.onChange}
                      isPrimary={watch(`images.${index}.isPrimary`)}
                      onSetPrimary={() => imageFields.forEach((_, i) => setValue(`images.${i}.isPrimary`, i === index))}
                      onRemove={() => { if (imageFields.length > 1) removeImage(index); }}
                      index={index}
                    />
                  )} />
                <FieldError message={errors.images?.[index]?.imageUrl?.message} />
              </div>
            ))}

            <button type="button"
              onClick={() => appendImage({ imageUrl: '', altText: '', displayOrder: imageFields.length, isPrimary: false })}
              className="aspect-square border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-blue-300 hover:bg-blue-50/30 transition-colors min-h-[160px]">
              <Plus size={20} className="text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Thêm ảnh</span>
            </button>
          </div>
        </Section>

        {/* ── Thuộc tính sản phẩm ── */}
        {productAttributes.length > 0 && (
          <Section title="Thông số kỹ thuật" subtitle="Dựa trên danh mục đã chọn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productAttributes.map((attr) => (
                <div key={attr.attributeId} className={`space-y-1 ${['multi_select', 'textarea'].includes(attr.inputType) ? 'md:col-span-2' : ''}`}>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    {attr.name} {attr.assignment.isRequired && <span className="text-red-500">*</span>}
                  </label>
                  <Controller name={`specifications.${attr.code}` as `specifications.${string}`} control={control}
                    render={({ field: f }) => {
                      if (attr.inputType === 'select' || attr.inputType === 'color') return (
                        <select value={(f.value as string) || ''} onChange={(e) => f.onChange(e.target.value)}
                          className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:border-blue-400 focus:outline-none">
                          <option value="">Chọn {attr.name}</option>
                          {attr.options.filter((o) => o.isActive).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      );
                      if (attr.inputType === 'textarea') return (
                        <textarea value={(f.value as string) || ''} onChange={(e) => f.onChange(e.target.value)}
                          placeholder={attr.name} rows={3}
                          className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none resize-none" />
                      );
                      return (
                        <input type={attr.inputType === 'number' ? 'number' : 'text'} value={(f.value as string) || ''} onChange={(e) => f.onChange(e.target.value)}
                          placeholder={attr.name}
                          className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none" />
                      );
                    }} />
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Biến thể ── */}
        <Section title="Biến thể sản phẩm" subtitle="Thêm các phiên bản khác nhau (màu sắc, dung lượng...)">
          {variantFields.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <p className="text-sm text-slate-400 font-medium mb-3">Chưa có biến thể. Khi không dùng biến thể, tồn kho lấy từ sản phẩm chính.</p>
              <button type="button"
                onClick={() => appendVariant({ variantName: '', sku: '', attributes: {}, priceAdjustment: 0, stockQuantity: 0, imageUrl: '', isActive: true })}
                className="flex items-center gap-2 mx-auto bg-white border-2 border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-semibold text-sm hover:border-blue-300 hover:text-blue-600 transition-colors">
                <Plus size={14} /> Thêm biến thể đầu tiên
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {variantFields.map((field, index) => (
                <div key={field.id} className="border-2 border-slate-100 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-600">Biến thể {index + 1}</span>
                    <button type="button" onClick={() => removeVariant(index)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">Tên biến thể *</label>
                      <input {...register(`variants.${index}.variantName`)} placeholder="VD: 128GB Đen"
                        className={`w-full border-2 rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors ${errors.variants?.[index]?.variantName ? 'border-red-300' : 'border-slate-200 focus:border-blue-400'}`} />
                      <FieldError message={errors.variants?.[index]?.variantName?.message} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">SKU biến thể *</label>
                      <input {...register(`variants.${index}.sku`)} placeholder="VD: IP15-128-BLK"
                        className={`w-full border-2 rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors ${errors.variants?.[index]?.sku ? 'border-red-300' : 'border-slate-200 focus:border-blue-400'}`} />
                      <FieldError message={errors.variants?.[index]?.sku?.message} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">Giá chênh lệch (₫)</label>
                      <Controller name={`variants.${index}.priceAdjustment`} control={control}
                        render={({ field: f }) => (
                          <input type="number" value={f.value} onChange={(e) => f.onChange(Number(e.target.value))}
                            placeholder="0 = giá gốc, +2000000 = đắt hơn 2tr"
                            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                        )} />
                      <p className="text-[10px] text-slate-400">So với giá niêm yết sản phẩm</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">Tồn kho *</label>
                      <Controller name={`variants.${index}.stockQuantity`} control={control}
                        render={({ field: f }) => (
                          <input type="number" min="0" value={f.value} onChange={(e) => f.onChange(Number(e.target.value))}
                            placeholder="Số lượng trong kho"
                            className={`w-full border-2 rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors ${errors.variants?.[index]?.stockQuantity ? 'border-red-300' : 'border-slate-200 focus:border-blue-400'}`} />
                        )} />
                      <FieldError message={errors.variants?.[index]?.stockQuantity?.message} />
                    </div>
                  </div>

                  {variantAttributes.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {variantAttributes.map((attr) => (
                        <div key={attr.attributeId} className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500">{attr.name}</label>
                          <Controller name={`variants.${index}.attributes.${attr.code}` as `variants.${number}.attributes.${string}`} control={control}
                            render={({ field: f }) => {
                              // Lấy lỗi duplicate từ Zod hoặc real-time
                              const attrError = (errors.variants?.[index] as any)?.attributes?.[attr.code]?.message;
                              const dupWarning = getDuplicateWarning(index, attr.code);
                              const errorMsg = attrError || dupWarning;
                              const hasError = Boolean(errorMsg);
                              if (attr.inputType === 'select' || attr.inputType === 'color') return (
                                <>
                                  <select value={(f.value as string) || ''} onChange={(e) => f.onChange(e.target.value)}
                                    className={`w-full border-2 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none transition-colors ${hasError ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:border-blue-400'}`}>
                                    <option value="">Chọn {attr.name}</option>
                                    {attr.options.filter((o) => o.isActive).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                  </select>
                                  {hasError && <p className="text-xs text-red-500 font-semibold flex items-center gap-1">⚠ {errorMsg}</p>}
                                </>
                              );
                              return (
                                <>
                                  <input value={(f.value as string) || ''} onChange={(e) => f.onChange(e.target.value)} placeholder={attr.name}
                                    className={`w-full border-2 rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors ${hasError ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:border-blue-400'}`} />
                                  {hasError && <p className="text-xs text-red-500 font-semibold flex items-center gap-1">⚠ {errorMsg}</p>}
                                </>
                              );
                            }} />
                        </div>
                      ))}
                    </div>
                  )}

                  <Controller name={`variants.${index}.isActive`} control={control}
                    render={({ field: f }) => (
                      <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                        <div onClick={() => f.onChange(!f.value)}
                          className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${f.value ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${f.value ? 'right-0.5' : 'left-0.5'}`} />
                        </div>
                        <span className="text-sm font-medium text-slate-600">{f.value ? 'Đang kích hoạt' : 'Đang tắt'}</span>
                      </label>
                    )} />
                </div>
              ))}

              <button type="button"
                onClick={() => appendVariant({ variantName: '', sku: '', attributes: {}, priceAdjustment: 0, stockQuantity: 0, imageUrl: '', isActive: true })}
                className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors">
                <Plus size={14} /> Thêm biến thể
              </button>
            </div>
          )}
        </Section>


        {/* Submit */}
        <div className="flex justify-end pb-8">
          <button type="submit" disabled={isSubmitting}
            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-200">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {isSubmitting ? 'Đang lưu...' : (isEditing ? 'Lưu thay đổi' : 'Tạo sản phẩm')}
          </button>
        </div>
      </form>
    </div>
  );
};