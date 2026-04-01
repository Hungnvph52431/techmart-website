import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { productService } from "@/services/product.service";
import { Product } from "@/types";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Star, Truck, Shield, RefreshCw, ChevronRight, Check, Zap } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useCheckoutSessionStore } from "@/store/checkoutSessionStore";
import toast from "react-hot-toast";
import { ProductReviews } from '../components/ProductReviews';
import {
  CART_QUANTITY_EXCEEDED_MESSAGE,
  getProductPurchaseStockLimit,
  getRemainingProductQuantity,
} from "@/features/cart/lib/cartQuantity";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const BACKEND_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace('/api', '') ||
  'http://localhost:5001';

const getImageUrl = (url: string | null | undefined): string => {
  if (!url) return '/placeholder.jpg';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BACKEND_URL}${url}`;
};

const extractImageUrls = (images: any[]): string[] => {
  if (!images || images.length === 0) return [];
  return images.map((img) => {
    if (typeof img === 'string') return getImageUrl(img);
    if (img?.imageUrl) return getImageUrl(img.imageUrl);
    if (img?.url) return getImageUrl(img.url);
    return '/placeholder.jpg';
  });
};

// Parse specifications — hỗ trợ cả string JSON lẫn object
const parseSpecs = (specs: any): Record<string, any> | null => {
  if (!specs) return null;
  if (typeof specs === 'object' && !Array.isArray(specs)) return specs;
  if (typeof specs === 'string') {
    try { return JSON.parse(specs); } catch { return null; }
  }
  return null;
};

// Label tiếng Việt cho từng key spec
const SPEC_LABELS: Record<string, string> = {
  ram:       'RAM',
  chip:      'Chip xử lý',
  screen:    'Màn hình',
  battery:   'Pin',
  storage:   'Bộ nhớ trong',
  camera:    'Camera',
  os:        'Hệ điều hành',
  sim:       'SIM',
  weight:    'Khối lượng',
  color:     'Màu sắc',
  bluetooth: 'Bluetooth',
  wifi:      'Wi-Fi',
  nfc:       'NFC',
  charging:  'Sạc',
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export const ProductDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedImage, setSelectedImage] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [quantityDraft, setQuantityDraft] = useState<string>('1');
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [reviewSummary, setReviewSummary] = useState({ average: 0, total: 0 });

  const { addItem, items } = useCartStore();
  const { startDirectCheckout } = useCheckoutSessionStore();

  // Tìm variant đang chọn
  const variants = (product as any)?.variants ?? [];
  const selectedVariant = variants.find(
    (v: any) => (v.variantId ?? v.id) === selectedVariantId
  );

  // Tính giá hiển thị: giá gốc + chênh lệch variant
  const basePrice = Number(product?.salePrice || product?.price || 0);
  const displayPrice = selectedVariant
    ? (selectedVariant.priceAdjustment != null && !isNaN(Number(selectedVariant.priceAdjustment))
        ? basePrice + Number(selectedVariant.priceAdjustment)
        : Number(selectedVariant.price || basePrice))
    : basePrice;

  // Tính stock: variant stock ưu tiên, fallback về product stock nếu variant = 0
  const stockToUse = product
    ? getProductPurchaseStockLimit(product, selectedVariant)
    : 0;
  const availableStock = product
    ? getRemainingProductQuantity(items, product, selectedVariant)
    : 0;
  const isOutOfStock = stockToUse <= 0;
  const isInactive = product?.status === 'inactive';
  const isMaxReached = !isOutOfStock && !isInactive && availableStock <= 0;
  const isDisabled = isOutOfStock || isInactive || isMaxReached;

  useEffect(() => {
    setQuantity((currentQuantity) => {
      if (availableStock <= 0) {
        return 0;
      }

      if (currentQuantity < 1) {
        return 1;
      }

      if (currentQuantity > availableStock) {
        return availableStock;
      }

      return currentQuantity;
    });
  }, [availableStock]);

  useEffect(() => {
    setQuantityDraft(String(quantity));
  }, [quantity]);

  useEffect(() => {
    setReviewSummary({
      average: Number(product?.ratingAvg ?? 0),
      total: Number(product?.reviewCount ?? 0),
    });
  }, [product?.productId, product?.ratingAvg, product?.reviewCount]);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      try {
        setLoading(true);
        const data = await productService.getBySlug(slug);
        setProduct(data);
        setSelectedImage(0);
        // Auto-chọn variant đầu tiên nếu có
        const firstVariant = (data as any)?.variants?.[0];
        if (firstVariant) setSelectedVariantId(firstVariant.variantId ?? firstVariant.id);
      } catch (error) {
        console.error("Lỗi khi tải chi tiết sản phẩm:", error);
        toast.error("Không thể tải thông tin sản phẩm");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  const increaseQty = () => { if (quantity < availableStock) setQuantity(p => p + 1); };
  const decreaseQty = () => { if (quantity > 1) setQuantity(p => p - 1); };

  const handleQuantityDraftChange = (rawValue: string) => {
    if (!/^\d*$/.test(rawValue)) {
      return;
    }

    if (rawValue !== '' && Number(rawValue) > availableStock) {
      toast.error(CART_QUANTITY_EXCEEDED_MESSAGE);
      return;
    }

    setQuantityDraft(rawValue);
  };

  const resolveQuantityDraft = () => {
    const fallbackQuantity = availableStock > 0
      ? Math.min(Math.max(quantity, 1), availableStock)
      : 0;

    if (quantityDraft === '') {
      return fallbackQuantity;
    }

    const parsedQuantity = Number(quantityDraft);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      return fallbackQuantity;
    }

    if (parsedQuantity > availableStock) {
      toast.error(CART_QUANTITY_EXCEEDED_MESSAGE);
      return fallbackQuantity;
    }

    return availableStock > 0 ? Math.max(1, parsedQuantity) : 0;
  };

  const commitQuantityDraft = () => {
    const nextQuantity = resolveQuantityDraft();
    setQuantity(nextQuantity);
    setQuantityDraft(String(nextQuantity));
    return nextQuantity;
  };

  const handleAddToCart = () => {
    if (!product) return;
    const nextQuantity = commitQuantityDraft();
    if (nextQuantity <= 0) return;
    if (variants.length > 0 && !selectedVariantId) {
      toast.error('Vui lòng chọn phiên bản sản phẩm');
      return;
    }
    if (nextQuantity > availableStock) {
      toast.error(CART_QUANTITY_EXCEEDED_MESSAGE);
      return;
    }
    addItem(product, nextQuantity, selectedVariantId ?? undefined);
    toast.success(`Đã thêm ${nextQuantity} sản phẩm vào giỏ hàng!`);
  };

  const handleBuyNow = () => {
    if (!product) return;
    const nextQuantity = commitQuantityDraft();
    if (nextQuantity <= 0) return;
    if (variants.length > 0 && !selectedVariantId) {
      toast.error('Vui lòng chọn phiên bản sản phẩm');
      return;
    }
    if (nextQuantity > availableStock) {
      toast.error(CART_QUANTITY_EXCEEDED_MESSAGE);
      return;
    }
    startDirectCheckout(product, nextQuantity, selectedVariantId ?? undefined);
    navigate('/checkout');
  };

  if (loading) return (
    <Layout>
      <div className="container mx-auto px-4 py-24 text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="mt-4 text-[10px] font-black text-gray-400 uppercase italic tracking-widest">Đang tải cấu hình...</p>
      </div>
    </Layout>
  );

  if (!product) return (
    <Layout>
      <div className="container mx-auto px-4 py-24 text-center bg-gray-50 rounded-[32px] my-8 border-2 border-dashed border-gray-200">
        <p className="text-xl font-black text-gray-400 uppercase italic">Sản phẩm không tồn tại</p>
      </div>
    </Layout>
  );

  const imageUrls = extractImageUrls(product.images ?? []);
  const fallbackImage = getImageUrl((product as any).mainImage || (product as any).imageUrl);
  const displayImages = imageUrls.length > 0 ? imageUrls : [fallbackImage];
  const currentImageSrc = displayImages[selectedImage] ?? displayImages[0] ?? '/placeholder.jpg';
  const headerRatingAverage = reviewSummary.total > 0 ? reviewSummary.average : 0;
  const headerRatingText = headerRatingAverage.toFixed(1);

  // Parse specs
  const specs = parseSpecs((product as any).specifications);

  // Parse variant name để lấy dung lượng + màu sắc khi attributes JSON bị sai/thiếu
  // Ví dụ: "iPhone 15 Pro Max 256GB - Titan Trắng" → { storage: "256GB", color: "Titan Trắng" }
  const parseVariantName = (name: string) => {
    const storageMatch = name.match(/(\d+(?:GB|TB))/i);
    const dashIdx = name.indexOf(' - ');
    const color = dashIdx >= 0 ? name.slice(dashIdx + 3).trim() : '';
    return { storage: storageMatch?.[1] || '', color };
  };

  // Lấy color/storage từ variant, ưu tiên parse từ variantName (chính xác hơn attributes JSON)
  const getVarColor = (v: any): string => {
    const vName = v.variantName || v.name || '';
    const parsed = parseVariantName(vName);
    return parsed.color || v.attributes?.color || '';
  };
  const getVarStorage = (v: any): string => {
    const vName = v.variantName || v.name || '';
    const parsed = parseVariantName(vName);
    return parsed.storage || v.attributes?.storage || '';
  };

  // Group unique values
  const getUniqueValues = (getter: (v: any) => string): string[] => {
    const seen = new Set<string>();
    return variants
      .map(getter)
      .filter((val: string) => { if (!val || seen.has(val)) return false; seen.add(val); return true; });
  };

  const colorValues   = getUniqueValues(getVarColor);
  const storageValues = getUniqueValues(getVarStorage);

  // Tìm variant theo combo màu + dung lượng đang chọn
  const getVariantByAttrs = (color?: string, storage?: string) => {
    return variants.find((v: any) => {
      const vColor   = getVarColor(v);
      const vStorage = getVarStorage(v);
      const matchColor   = !color   || vColor   === color;
      const matchStorage = !storage || vStorage === storage;
      return matchColor && matchStorage;
    });
  };

  const selectedColor   = selectedVariant ? getVarColor(selectedVariant)   : colorValues[0];
  const selectedStorage = selectedVariant ? getVarStorage(selectedVariant) : storageValues[0];

  const handleSelectColor = (color: string) => {
    const v = getVariantByAttrs(color, selectedStorage);
    if (v) setSelectedVariantId(v.variantId ?? v.id);
  };

  const handleSelectStorage = (storage: string) => {
    const v = getVariantByAttrs(selectedColor, storage);
    if (v) setSelectedVariantId(v.variantId ?? v.id);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">

          {/* ── GALLERY ── */}
          <div className="space-y-6">
            <div className="aspect-square overflow-hidden rounded-[40px] bg-white border border-gray-100 shadow-2xl shadow-gray-200/50 group">
              <img src={currentImageSrc} alt={product.name}
                className="w-full h-full object-contain p-12 transition-transform duration-700 group-hover:scale-110"
                onError={(e) => { const el = e.target as HTMLImageElement; el.onerror = null; el.src = '/placeholder.jpg'; }} />
            </div>
            {displayImages.length > 1 && (
              <div className="grid grid-cols-5 gap-4">
                {displayImages.map((imgUrl, index) => (
                  <button key={index} onClick={() => setSelectedImage(index)}
                    className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all p-1 bg-white ${
                      selectedImage === index ? 'border-blue-600 shadow-lg scale-105' : 'border-gray-100 opacity-60 hover:opacity-100'
                    }`}>
                    <img src={imgUrl} alt={`${product.name}-${index}`} className="w-full h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.jpg'; }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── THÔNG TIN SẢN PHẨM ── */}
          <div className="flex flex-col">
            <div className="mb-4">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic flex items-center gap-1">
                TechMart Store <ChevronRight size={10} /> {product.brandName || "Premium"}
              </span>
              <h1 className="text-4xl md:text-5xl font-black text-gray-800 uppercase italic tracking-tighter mb-4 leading-none mt-2">
                {product.name}
              </h1>
            </div>

            <div className="flex items-center gap-6 mb-6">
              <div className="flex items-center bg-yellow-400 px-3 py-1 rounded-full">
                <Star className="h-4 w-4 text-white fill-current" />
                <span className="ml-1.5 text-xs font-black text-white">{headerRatingText}</span>
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {reviewSummary.total} đánh giá
              </span>
              <span className="text-gray-200">|</span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${stockToUse > 0 ? "text-green-600" : "text-red-500"}`}>
                {stockToUse > 0 ? `Sẵn hàng (${stockToUse} máy)` : "Cháy hàng"}
              </span>
            </div>

            {/* GIÁ */}
            <div className="bg-gray-50/80 border-2 border-gray-100 p-8 rounded-[40px] mb-6">
              <div className="flex items-baseline gap-4 mb-2">
                <span className="text-5xl font-black text-red-600 tracking-tighter">
                  {displayPrice.toLocaleString("vi-VN")}₫
                </span>
                {selectedVariant && selectedVariant.priceAdjustment != null && !isNaN(Number(selectedVariant.priceAdjustment)) && Number(selectedVariant.priceAdjustment) !== 0 && (
                  <span className="text-sm text-gray-400 font-bold">
                    ({Number(selectedVariant.priceAdjustment) > 0 ? '+' : ''}
                    {Number(selectedVariant.priceAdjustment).toLocaleString('vi-VN')}₫)
                  </span>
                )}
                {product.salePrice && product.price > product.salePrice && (
                  <span className="text-xl text-gray-300 line-through font-black italic">
                    {product.price.toLocaleString("vi-VN")}₫
                  </span>
                )}
              </div>
              {product.salePrice && product.price > product.salePrice && (
                <span className="bg-red-600 text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase italic tracking-widest">
                  Ưu đãi -{Math.round(((product.price - product.salePrice) / product.price) * 100)}%
                </span>
              )}
            </div>

            {/* ── CHỌN MÀU SẮC ── */}
            {colorValues.length > 0 && (
              <div className="mb-5">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  Màu sắc: <span className="text-gray-700">{selectedColor}</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {colorValues.map((color) => {
                    const isAvailable = !!getVariantByAttrs(color, selectedStorage);
                    const isSelected = selectedColor === color;
                    return (
                      <button key={color} onClick={() => handleSelectColor(color)}
                        disabled={!isAvailable}
                        className={`px-4 py-2 rounded-2xl text-sm font-black border-2 transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-100'
                            : isAvailable
                              ? 'border-gray-200 text-gray-700 hover:border-blue-300 bg-white'
                              : 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed line-through'
                        }`}>
                        {isSelected && <Check size={12} className="inline mr-1" />}
                        {color}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── CHỌN DUNG LƯỢNG ── */}
            {storageValues.length > 0 && (
              <div className="mb-6">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  Dung lượng: <span className="text-gray-700">{selectedStorage}</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {storageValues.map((storage) => {
                    const isAvailable = !!getVariantByAttrs(selectedColor, storage);
                    const isSelected = selectedStorage === storage;
                    return (
                      <button key={storage} onClick={() => handleSelectStorage(storage)}
                        disabled={!isAvailable}
                        className={`px-4 py-2.5 rounded-2xl text-sm font-black border-2 transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : isAvailable
                              ? 'border-gray-200 text-gray-700 hover:border-blue-300 bg-white'
                              : 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed line-through'
                        }`}>
                        {storage}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── SỐ LƯỢNG ── */}
            {!isOutOfStock && (
              <div className="mb-8">
                <h3 className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-4 tracking-widest">Số lượng</h3>
                <div className="flex items-center gap-6">
                  <div className="flex items-center bg-white border-4 border-gray-100 rounded-[24px] p-1.5 shadow-sm">
                    <button onClick={decreaseQty} disabled={quantity <= 1 || isDisabled}
                      className="w-12 h-12 flex items-center justify-center font-black text-xl hover:bg-gray-50 rounded-2xl disabled:opacity-20">−</button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={quantityDraft}
                      disabled={isDisabled}
                      onChange={(event) => handleQuantityDraftChange(event.target.value)}
                      onBlur={commitQuantityDraft}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.currentTarget.blur();
                        }
                      }}
                      className="w-16 bg-transparent text-center font-black text-xl text-gray-800 outline-none disabled:text-gray-400"
                      aria-label={`Số lượng mua ${product.name}`}
                    />
                    <button onClick={increaseQty} disabled={quantity >= availableStock || isDisabled}
                      className="w-12 h-12 flex items-center justify-center font-black text-xl hover:bg-gray-50 rounded-2xl disabled:opacity-20">+</button>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                      Còn có thể mua thêm: {Math.max(0, availableStock)} SP
                    </span>
                    {isMaxReached && (
                      <span className="text-[9px] font-bold text-red-500 uppercase mt-1 italic">Đã đạt tối đa trong giỏ hàng!</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 mb-8">
              <button onClick={handleAddToCart} disabled={isDisabled || quantity <= 0}
                className={`flex-1 flex items-center justify-center gap-3 py-5 rounded-[32px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl ${
                  isDisabled || quantity <= 0
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                    : "bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50 shadow-blue-100"
                }`}>
                <ShoppingCart className="h-5 w-5" />
                {isInactive ? "Ngừng bán" : isOutOfStock ? "Hết hàng" : isMaxReached ? "Đã có trong giỏ" : "Thêm vào giỏ"}
              </button>

              <button onClick={handleBuyNow} disabled={isDisabled || quantity <= 0}
                className={`flex-1 flex items-center justify-center gap-3 py-5 rounded-[32px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-2xl ${
                  isDisabled || quantity <= 0
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                    : "bg-gradient-to-r from-red-600 to-orange-500 text-white hover:opacity-90 shadow-red-200"
                }`}>
                <Zap className="h-5 w-5" />
                {isInactive ? "Ngừng bán" : isOutOfStock ? "Tạm hết hàng" : "Mua ngay"}
              </button>
            </div>

            {/* CAM KẾT */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: <Truck />, label: "Giao hỏa tốc" },
                { icon: <Shield />, label: "12T Bảo hành" },
                { icon: <RefreshCw />, label: "7 Ngày đổi trả" },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center p-5 bg-white border-2 border-gray-50 rounded-[24px] shadow-sm text-center group hover:border-blue-100 transition-all">
                  <div className="text-blue-600 mb-3 transition-transform group-hover:scale-110">{item.icon}</div>
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── MÔ TẢ & THÔNG SỐ KỸ THUẬT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 mt-24 pt-16 border-t-4 border-gray-50">
          <div className="lg:col-span-2">
            <h2 className="text-3xl font-black text-gray-800 uppercase italic tracking-tighter mb-8">Chi tiết trải nghiệm</h2>
            <div className="prose prose-blue max-w-none text-gray-500 leading-relaxed whitespace-pre-line font-bold text-sm">
              {product.description || "Nội dung đang được cập nhật..."}
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-black text-gray-800 uppercase italic tracking-tighter mb-8">Thông số kỹ thuật</h2>
            {specs && Object.keys(specs).length > 0 ? (
              <div className="bg-white rounded-[32px] border-2 border-gray-100 p-4 shadow-xl shadow-gray-50">
                <div className="space-y-2">
                  {Object.entries(specs).map(([key, value]) => (
                    <div key={key} className="flex items-start justify-between p-4 bg-gray-50/50 rounded-2xl hover:bg-blue-50 transition-colors gap-4">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter italic flex-shrink-0">
                        {SPEC_LABELS[key] ?? key}
                      </span>
                      <span className="text-xs font-black text-gray-800 text-right">
                        {/* Nếu là array (vd: storage) thì join lại */}
                        {Array.isArray(value) ? value.join(', ') : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-100">
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Dữ liệu đang được đồng bộ...</p>
              </div>
            )}
          </div>
        </div>

        <ProductReviews
          productId={product.productId}
          onProductStatsChange={(stats) =>
            setReviewSummary({
              average: Number(stats.average || 0),
              total: Number(stats.total || 0),
            })
          }
        />
      </div>
    </Layout>
  );
};
