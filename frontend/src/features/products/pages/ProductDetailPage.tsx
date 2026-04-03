import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { productService } from "@/services/product.service";
import { Product } from "@/types";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Star,
  Truck,
  Shield,
  RefreshCw,
  ChevronRight,
  Check,
  Zap,
  Minus,
  Plus,
  Package,
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useCheckoutSessionStore } from "@/store/checkoutSessionStore";
import toast from "react-hot-toast";
import { ProductReviews } from "../components/ProductReviews";
import {
  CART_QUANTITY_EXCEEDED_MESSAGE,
  getProductPurchaseStockLimit,
  getRemainingProductQuantity,
} from "@/features/cart/lib/cartQuantity";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const BACKEND_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace("/api", "") ||
  "http://localhost:5001";

const getImageUrl = (url: string | null | undefined): string => {
  if (!url) return "/placeholder.jpg";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BACKEND_URL}${url}`;
};

const extractImageUrls = (images: any[]): string[] => {
  if (!images || images.length === 0) return [];
  return images.map((img) => {
    if (typeof img === "string") return getImageUrl(img);
    if (img?.imageUrl) return getImageUrl(img.imageUrl);
    if (img?.url) return getImageUrl(img.url);
    return "/placeholder.jpg";
  });
};

const parseSpecs = (specs: any): Record<string, any> | null => {
  if (!specs) return null;
  if (typeof specs === "object" && !Array.isArray(specs)) return specs;
  if (typeof specs === "string") {
    try {
      return JSON.parse(specs);
    } catch {
      return null;
    }
  }
  return null;
};

const SPEC_LABELS: Record<string, string> = {
  ram: "RAM",
  chip: "Chip xử lý",
  screen: "Màn hình",
  battery: "Pin",
  storage: "Bộ nhớ trong",
  camera: "Camera",
  os: "Hệ điều hành",
  sim: "SIM",
  weight: "Khối lượng",
  color: "Màu sắc",
  bluetooth: "Bluetooth",
  wifi: "Wi-Fi",
  nfc: "NFC",
  charging: "Sạc",
};

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
const SkeletonPulse = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-100 rounded-xl ${className ?? ""}`} />
);

// ─── Main ─────────────────────────────────────────────────────────────────────
export const ProductDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedImage, setSelectedImage] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [quantityDraft, setQuantityDraft] = useState<string>("1");
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    null,
  );
  const [reviewSummary, setReviewSummary] = useState({ average: 0, total: 0 });
  const [imgError, setImgError] = useState(false);

  const { addItem, items } = useCartStore();
  const { startDirectCheckout } = useCheckoutSessionStore();

  const variants = (product as any)?.variants ?? [];
  const selectedVariant = variants.find(
    (v: any) => (v.variantId ?? v.id) === selectedVariantId,
  );

  const basePrice = Number(product?.salePrice || product?.price || 0);
  const displayPrice = selectedVariant
    ? selectedVariant.priceAdjustment != null &&
      !isNaN(Number(selectedVariant.priceAdjustment))
      ? basePrice + Number(selectedVariant.priceAdjustment)
      : Number(selectedVariant.price || basePrice)
    : basePrice;

  const stockToUse = product
    ? getProductPurchaseStockLimit(product, selectedVariant)
    : 0;
  const availableStock = product
    ? getRemainingProductQuantity(items, product, selectedVariant)
    : 0;
  const isOutOfStock = stockToUse <= 0;
  const isInactive = product?.status === "inactive";
  const isMaxReached = !isOutOfStock && !isInactive && availableStock <= 0;
  const isDisabled = isOutOfStock || isInactive || isMaxReached;

  const discountPercent =
    product?.salePrice && product.price > product.salePrice
      ? Math.round(((product.price - product.salePrice) / product.price) * 100)
      : 0;

  useEffect(() => {
    setQuantity((cur) => {
      if (availableStock <= 0) return 0;
      if (cur < 1) return 1;
      if (cur > availableStock) return availableStock;
      return cur;
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
        const firstVariant = (data as any)?.variants?.[0];
        if (firstVariant)
          setSelectedVariantId(firstVariant.variantId ?? firstVariant.id);
      } catch (error) {
        console.error("Lỗi khi tải chi tiết sản phẩm:", error);
        toast.error("Không thể tải thông tin sản phẩm");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  const increaseQty = () => {
    if (quantity < availableStock) setQuantity((p) => p + 1);
  };
  const decreaseQty = () => {
    if (quantity > 1) setQuantity((p) => p - 1);
  };

  const handleQuantityDraftChange = (raw: string) => {
    if (!/^\d*$/.test(raw)) return;
    if (raw !== "" && Number(raw) > availableStock) {
      toast.error(CART_QUANTITY_EXCEEDED_MESSAGE);
      return;
    }
    setQuantityDraft(raw);
  };

  const resolveQuantityDraft = () => {
    const fallback =
      availableStock > 0 ? Math.min(Math.max(quantity, 1), availableStock) : 0;
    if (quantityDraft === "") return fallback;
    const parsed = Number(quantityDraft);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    if (parsed > availableStock) {
      toast.error(CART_QUANTITY_EXCEEDED_MESSAGE);
      return fallback;
    }
    return availableStock > 0 ? Math.max(1, parsed) : 0;
  };

  const commitQuantityDraft = () => {
    const next = resolveQuantityDraft();
    setQuantity(next);
    setQuantityDraft(String(next));
    return next;
  };

  const handleAddToCart = () => {
    if (!product) return;
    const next = commitQuantityDraft();
    if (next <= 0) return;
    if (variants.length > 0 && !selectedVariantId) {
      toast.error("Vui lòng chọn phiên bản sản phẩm");
      return;
    }
    if (next > availableStock) {
      toast.error(CART_QUANTITY_EXCEEDED_MESSAGE);
      return;
    }
    addItem(product, next, selectedVariantId ?? undefined);
    toast.success(`Đã thêm ${next} sản phẩm vào giỏ hàng!`);
  };

  const handleBuyNow = () => {
    if (!product) return;
    const next = commitQuantityDraft();
    if (next <= 0) return;
    if (variants.length > 0 && !selectedVariantId) {
      toast.error("Vui lòng chọn phiên bản sản phẩm");
      return;
    }
    if (next > availableStock) {
      toast.error(CART_QUANTITY_EXCEEDED_MESSAGE);
      return;
    }
    startDirectCheckout(product, next, selectedVariantId ?? undefined);
    navigate("/checkout");
  };

  // ── Variant parsing helpers ──
  const parseVariantName = (name: string) => {
    const storageMatch = name.match(/(\d+(?:GB|TB))/i);
    const dashIdx = name.indexOf(" - ");
    const color = dashIdx >= 0 ? name.slice(dashIdx + 3).trim() : "";
    return { storage: storageMatch?.[1] || "", color };
  };

  const getVarColor = (v: any): string => {
    const parsed = parseVariantName(v.variantName || v.name || "");
    return parsed.color || v.attributes?.color || "";
  };
  const getVarStorage = (v: any): string => {
    const parsed = parseVariantName(v.variantName || v.name || "");
    return parsed.storage || v.attributes?.storage || "";
  };

  const getUniqueValues = (getter: (v: any) => string): string[] => {
    const seen = new Set<string>();
    return variants.map(getter).filter((val: string) => {
      if (!val || seen.has(val)) return false;
      seen.add(val);
      return true;
    });
  };

  const colorValues = getUniqueValues(getVarColor);
  const storageValues = getUniqueValues(getVarStorage);

  const getVariantByAttrs = (color?: string, storage?: string) =>
    variants.find((v: any) => {
      const matchColor = !color || getVarColor(v) === color;
      const matchStorage = !storage || getVarStorage(v) === storage;
      return matchColor && matchStorage;
    });

  const selectedColor = selectedVariant
    ? getVarColor(selectedVariant)
    : colorValues[0];
  const selectedStorage = selectedVariant
    ? getVarStorage(selectedVariant)
    : storageValues[0];

  const handleSelectColor = (color: string) => {
    const v = getVariantByAttrs(color, selectedStorage);
    if (v) setSelectedVariantId(v.variantId ?? v.id);
  };
  const handleSelectStorage = (storage: string) => {
    const v = getVariantByAttrs(selectedColor, storage);
    if (v) setSelectedVariantId(v.variantId ?? v.id);
  };

  // ── Loading state ──
  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-10 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-4">
              <SkeletonPulse className="aspect-square rounded-2xl" />
              <div className="grid grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonPulse key={i} className="aspect-square rounded-xl" />
                ))}
              </div>
            </div>
            <div className="space-y-4 pt-2">
              <SkeletonPulse className="h-5 w-40" />
              <SkeletonPulse className="h-10 w-full" />
              <SkeletonPulse className="h-8 w-48" />
              <SkeletonPulse className="h-24 w-full rounded-2xl" />
              <SkeletonPulse className="h-12 w-full rounded-2xl" />
              <SkeletonPulse className="h-12 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 max-w-6xl">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="w-16 h-16 text-gray-200 mb-4" />
            <p className="text-lg font-semibold text-gray-400">
              Sản phẩm không tồn tại
            </p>
            <button
              onClick={() => navigate(-1)}
              className="mt-6 px-6 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Quay lại
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const imageUrls = extractImageUrls(product.images ?? []);
  const fallbackImage = getImageUrl(
    (product as any).mainImage || (product as any).imageUrl,
  );
  const displayImages = imageUrls.length > 0 ? imageUrls : [fallbackImage];
  const currentImageSrc =
    displayImages[selectedImage] ?? displayImages[0] ?? "/placeholder.jpg";
  const headerRatingAverage =
    reviewSummary.total > 0 ? reviewSummary.average : 0;
  const specs = parseSpecs((product as any).specifications);

  return (
    <Layout>
      <div className="bg-white min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* ── Breadcrumb ── */}
          <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-8 font-medium">
            <span className="hover:text-gray-600 cursor-pointer transition-colors">
              Trang chủ
            </span>
            <ChevronRight size={12} />
            <span className="hover:text-gray-600 cursor-pointer transition-colors">
              {product.brandName || "Sản phẩm"}
            </span>
            <ChevronRight size={12} />
            <span className="text-gray-700 line-clamp-1">{product.name}</span>
          </nav>

          {/* ── Main Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-12 items-start">
            {/* ── Gallery ── */}
            <div className="space-y-3 sticky top-4">
              {/* Main image */}
              <div className="relative overflow-hidden rounded-2xl bg-gray-50 border border-gray-100">
                <div className="aspect-square p-8 flex items-center justify-center">
                  <img
                    src={imgError ? "/placeholder.jpg" : currentImageSrc}
                    alt={product.name}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-contain transition-all duration-300 hover:scale-105"
                  />
                </div>
                {/* Discount badge */}
                {discountPercent > 0 && (
                  <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                    -{discountPercent}%
                  </div>
                )}
                {/* Stock status badge */}
                <div
                  className={`absolute top-4 right-4 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                    stockToUse > 0
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      : "bg-red-50 text-red-500 border border-red-100"
                  }`}
                >
                  {stockToUse > 0 ? "Còn hàng" : "Hết hàng"}
                </div>
              </div>

              {/* Thumbnails */}
              {displayImages.length > 1 && (
                <div className="grid grid-cols-5 gap-2.5">
                  {displayImages.map((imgUrl, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedImage(index);
                        setImgError(false);
                      }}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 bg-gray-50 ${
                        selectedImage === index
                          ? "border-blue-500 ring-2 ring-blue-100"
                          : "border-gray-100 hover:border-gray-300"
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-contain p-1.5"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "/placeholder.jpg";
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Product Info ── */}
            <div className="flex flex-col gap-5">
              {/* Brand & Title */}
              <div>
                {product.brandName && (
                  <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md mb-3">
                    {product.brandName}
                  </span>
                )}
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug tracking-tight">
                  {product.name}
                </h1>
              </div>

              {/* Rating & Stock row */}
              <div className="flex items-center gap-4 flex-wrap">
                {reviewSummary.total > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={
                            i < Math.round(headerRatingAverage)
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-200 fill-gray-200"
                          }
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      {headerRatingAverage.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-400">
                      ({reviewSummary.total} đánh giá)
                    </span>
                  </div>
                )}
                <span className="h-4 w-px bg-gray-200 hidden sm:block" />
                <span className="text-sm text-gray-500">
                  Còn{" "}
                  <span className="font-semibold text-gray-800">
                    {stockToUse}
                  </span>{" "}
                  sản phẩm
                </span>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100" />

              {/* Price */}
              <div className="flex items-end gap-3">
                <span className="text-3xl md:text-4xl font-bold text-red-600 tracking-tight">
                  {displayPrice.toLocaleString("vi-VN")}₫
                </span>
                {product.salePrice && product.price > product.salePrice && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base text-gray-400 line-through font-medium">
                      {product.price.toLocaleString("vi-VN")}₫
                    </span>
                  </div>
                )}
                {selectedVariant &&
                  selectedVariant.priceAdjustment != null &&
                  !isNaN(Number(selectedVariant.priceAdjustment)) &&
                  Number(selectedVariant.priceAdjustment) !== 0 && (
                    <span className="text-sm text-gray-400 mb-1">
                      ({Number(selectedVariant.priceAdjustment) > 0 ? "+" : ""}
                      {Number(selectedVariant.priceAdjustment).toLocaleString(
                        "vi-VN",
                      )}
                      ₫)
                    </span>
                  )}
              </div>

              {/* ── Color Selector ── */}
              {colorValues.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2.5">
                    Màu sắc:{" "}
                    <span className="font-semibold text-gray-900">
                      {selectedColor}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {colorValues.map((color) => {
                      const isAvailable = !!getVariantByAttrs(
                        color,
                        selectedStorage,
                      );
                      const isSelected = selectedColor === color;
                      return (
                        <button
                          key={color}
                          onClick={() => handleSelectColor(color)}
                          disabled={!isAvailable}
                          className={`relative px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-150 ${
                            isSelected
                              ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                              : isAvailable
                                ? "border-gray-200 text-gray-700 hover:border-gray-300 bg-white hover:bg-gray-50"
                                : "border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed line-through"
                          }`}
                        >
                          {isSelected && (
                            <Check
                              size={12}
                              className="inline mr-1.5 text-blue-600"
                              strokeWidth={3}
                            />
                          )}
                          {color}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Storage Selector ── */}
              {storageValues.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2.5">
                    Dung lượng:{" "}
                    <span className="font-semibold text-gray-900">
                      {selectedStorage}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {storageValues.map((storage) => {
                      const isAvailable = !!getVariantByAttrs(
                        selectedColor,
                        storage,
                      );
                      const isSelected = selectedStorage === storage;
                      return (
                        <button
                          key={storage}
                          onClick={() => handleSelectStorage(storage)}
                          disabled={!isAvailable}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-150 ${
                            isSelected
                              ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                              : isAvailable
                                ? "border-gray-200 text-gray-700 hover:border-gray-300 bg-white hover:bg-gray-50"
                                : "border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed line-through"
                          }`}
                        >
                          {storage}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Quantity ── */}
              {!isOutOfStock && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2.5">
                    Số lượng
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
                      <button
                        onClick={decreaseQty}
                        disabled={quantity <= 1 || isDisabled}
                        className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus size={14} strokeWidth={2.5} />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={quantityDraft}
                        disabled={isDisabled}
                        onChange={(e) =>
                          handleQuantityDraftChange(e.target.value)
                        }
                        onBlur={commitQuantityDraft}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                        className="w-14 text-center text-sm font-semibold text-gray-800 outline-none bg-transparent border-x border-gray-200 h-10 disabled:text-gray-400"
                        aria-label={`Số lượng mua ${product.name}`}
                      />
                      <button
                        onClick={increaseQty}
                        disabled={quantity >= availableStock || isDisabled}
                        className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">
                        Có thể mua thêm:{" "}
                        <span className="font-semibold text-gray-600">
                          {Math.max(0, availableStock)}
                        </span>
                      </p>
                      {isMaxReached && (
                        <p className="text-xs text-red-500 mt-0.5">
                          Đã đạt tối đa trong giỏ hàng
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Action Buttons ── */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={handleAddToCart}
                  disabled={isDisabled || quantity <= 0}
                  className={`flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl text-sm font-semibold border transition-all duration-150 ${
                    isDisabled || quantity <= 0
                      ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                      : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 active:scale-[0.98]"
                  }`}
                >
                  <ShoppingCart size={16} />
                  {isInactive
                    ? "Ngừng bán"
                    : isOutOfStock
                      ? "Hết hàng"
                      : isMaxReached
                        ? "Đã có trong giỏ"
                        : "Thêm vào giỏ"}
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={isDisabled || quantity <= 0}
                  className={`flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    isDisabled || quantity <= 0
                      ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-sm shadow-blue-200"
                  }`}
                >
                  <Zap size={16} />
                  {isInactive
                    ? "Ngừng bán"
                    : isOutOfStock
                      ? "Hết hàng"
                      : "Mua ngay"}
                </button>
              </div>

              {/* ── Policies ── */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  {
                    icon: <Truck size={18} />,
                    title: "Giao hỏa tốc",
                    sub: "2–4 giờ nội thành",
                  },
                  {
                    icon: <Shield size={18} />,
                    title: "Bảo hành",
                    sub: "12 tháng chính hãng",
                  },
                  {
                    icon: <RefreshCw size={18} />,
                    title: "Đổi trả",
                    sub: "7 ngày miễn phí",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center text-center p-3.5 rounded-xl bg-gray-50 border border-gray-100 gap-2"
                  >
                    <div className="text-blue-600">{item.icon}</div>
                    <div>
                      <p className="text-xs font-semibold text-gray-700">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {item.sub}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Description & Specs ── */}
          <div className="mt-16 pt-10 border-t border-gray-100">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12">
              {/* Description */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Mô tả sản phẩm
                </h2>
                <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed whitespace-pre-line">
                  {product.description || "Nội dung đang được cập nhật..."}
                </div>
              </div>

              {/* Specs */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Thông số kỹ thuật
                </h2>
                {specs && Object.keys(specs).length > 0 ? (
                  <div className="rounded-2xl border border-gray-100 overflow-hidden">
                    {Object.entries(specs).map(([key, value], index) => (
                      <div
                        key={key}
                        className={`flex items-start justify-between px-4 py-3 gap-4 ${
                          index % 2 === 0 ? "bg-gray-50" : "bg-white"
                        }`}
                      >
                        <span className="text-xs font-medium text-gray-500 flex-shrink-0 w-28">
                          {SPEC_LABELS[key] ?? key}
                        </span>
                        <span className="text-xs font-semibold text-gray-800 text-right">
                          {Array.isArray(value)
                            ? value.join(", ")
                            : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-gray-100 py-12 text-center">
                    <p className="text-sm text-gray-400">
                      Dữ liệu đang được cập nhật
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Reviews ── */}
          <div className="mt-16 pt-10 border-t border-gray-100">
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
        </div>
      </div>
    </Layout>
  );
};
