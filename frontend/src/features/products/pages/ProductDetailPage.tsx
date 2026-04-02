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
  Zap,
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
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

// Parse specifications — hỗ trợ cả string JSON lẫn object
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

// Label tiếng Việt cho từng key spec
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

  const { addItem, items } = useCartStore();

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

  // Auto clamp quantity khi stock thay đổi
  useEffect(() => {
    setQuantity((current) => {
      if (availableStock <= 0) return 0;
      if (current < 1) return 1;
      return Math.min(current, availableStock);
    });
  }, [availableStock]);

  useEffect(() => {
    setQuantityDraft(String(quantity));
  }, [quantity]);

  // Fetch product
  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      try {
        setLoading(true);
        const data = await productService.getBySlug(slug);
        setProduct(data);
        setSelectedImage(0);

        const firstVariant = (data as any)?.variants?.[0];
        if (firstVariant) {
          setSelectedVariantId(firstVariant.variantId ?? firstVariant.id);
        }
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

  // Quantity draft handler (chỉ cho phép số)
  const handleQuantityDraftChange = (rawValue: string) => {
    if (!/^\d*$/.test(rawValue)) return;
    if (rawValue !== "" && Number(rawValue) > availableStock) {
      toast.error(CART_QUANTITY_EXCEEDED_MESSAGE);
      return;
    }
    setQuantityDraft(rawValue);
  };

  const resolveQuantityDraft = () => {
    const fallback =
      availableStock > 0 ? Math.min(Math.max(quantity, 1), availableStock) : 0;
    if (quantityDraft === "") return fallback;

    const parsed = Number(quantityDraft);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > availableStock) {
      if (parsed > availableStock) toast.error(CART_QUANTITY_EXCEEDED_MESSAGE);
      return fallback;
    }
    return availableStock > 0 ? Math.max(1, parsed) : 0;
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
      toast.error("Vui lòng chọn phiên bản sản phẩm");
      return;
    }
    addItem(product, nextQuantity, selectedVariantId ?? undefined);
    toast.success(`Đã thêm ${nextQuantity} ${product.name} vào giỏ hàng!`);
  };

  const handleBuyNow = () => {
    if (!product) return;
    const nextQuantity = commitQuantityDraft();
    if (nextQuantity <= 0) return;
    if (variants.length > 0 && !selectedVariantId) {
      toast.error("Vui lòng chọn phiên bản sản phẩm");
      return;
    }
    addItem(product, nextQuantity, selectedVariantId ?? undefined);
    navigate("/checkout");
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="mt-6 text-xs font-black tracking-[3px] text-gray-400 uppercase">
              Đang tải thông tin sản phẩm...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-32 text-center">
          <div className="mx-auto max-w-md rounded-3xl bg-gray-50 p-12 border border-gray-100">
            <p className="text-2xl font-black text-gray-300">
              Sản phẩm không tồn tại
            </p>
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

  const specs = parseSpecs((product as any).specifications);

  // Variant helpers (giữ nguyên logic của bạn)
  const parseVariantName = (name: string) => {
    const storageMatch = name.match(/(\d+(?:GB|TB))/i);
    const dashIdx = name.indexOf(" - ");
    const color = dashIdx >= 0 ? name.slice(dashIdx + 3).trim() : "";
    return { storage: storageMatch?.[1] || "", color };
  };

  const getVarColor = (v: any): string =>
    parseVariantName(v.variantName || v.name || "").color ||
    v.attributes?.color ||
    "";
  const getVarStorage = (v: any): string =>
    parseVariantName(v.variantName || v.name || "").storage ||
    v.attributes?.storage ||
    "";

  const getUniqueValues = (getter: (v: any) => string): string[] => {
    const seen = new Set<string>();
    return variants
      .map(getter)
      .filter((val) => val && !seen.has(val) && seen.add(val));
  };

  const colorValues = getUniqueValues(getVarColor);
  const storageValues = getUniqueValues(getVarStorage);

  const getVariantByAttrs = (color?: string, storage?: string) =>
    variants.find((v: any) => {
      const vColor = getVarColor(v);
      const vStorage = getVarStorage(v);
      return (!color || vColor === color) && (!storage || vStorage === storage);
    });

  const selectedColor = selectedVariant
    ? getVarColor(selectedVariant)
    : colorValues[0] || "";
  const selectedStorage = selectedVariant
    ? getVarStorage(selectedVariant)
    : storageValues[0] || "";

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
      <div className="container mx-auto px-6 py-12 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-20">
          {/* ==================== GALLERY ==================== */}
          <div className="lg:col-span-7 space-y-8">
            <div className="aspect-square overflow-hidden rounded-3xl bg-white shadow-xl shadow-gray-200/70 border border-gray-100 group relative">
              <img
                src={currentImageSrc}
                alt={product.name}
                className="w-full h-full object-contain p-8 transition-all duration-700 group-hover:scale-105"
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  el.onerror = null;
                  el.src = "/placeholder.jpg";
                }}
              />
            </div>

            {displayImages.length > 1 && (
              <div className="grid grid-cols-5 gap-4">
                {displayImages.map((imgUrl, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square rounded-2xl overflow-hidden border-2 bg-white transition-all hover:shadow-md ${
                      selectedImage === index
                        ? "border-blue-600 shadow-xl scale-[1.04]"
                        : "border-transparent opacity-75 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`${product.name} ${index}`}
                      className="w-full h-full object-contain p-3"
                      onError={(e) =>
                        ((e.target as HTMLImageElement).src =
                          "/placeholder.jpg")
                      }
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ==================== PRODUCT INFO ==================== */}
          <div className="lg:col-span-5 flex flex-col">
            <div>
              <div className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest">
                TechMart Store <ChevronRight size={14} />
                <span className="text-gray-500">
                  {product.brandName || "Premium Collection"}
                </span>
              </div>

              <h1 className="mt-3 text-4xl md:text-5xl font-black text-gray-900 leading-none tracking-tighter">
                {product.name}
              </h1>
            </div>

            {/* Rating & Stock */}
            <div className="mt-6 flex items-center gap-6 text-sm">
              <div className="flex items-center bg-amber-400 px-4 py-1 rounded-full shadow-sm">
                <Star className="h-4 w-4 text-white fill-current" />
                <span className="ml-1 font-black text-white">
                  {product.ratingAvg || "5.0"}
                </span>
              </div>
              <span className="text-gray-500 font-medium">
                {product.reviewCount || 0} đánh giá
              </span>
              <div
                className={`ml-auto font-black text-xs uppercase tracking-widest px-4 py-1 rounded-full ${
                  stockToUse > 0
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {stockToUse > 0 ? `Còn ${stockToUse} máy` : "Hết hàng"}
              </div>
            </div>

            {/* Price Box */}
            <div className="mt-8 bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-3xl p-8 shadow-inner">
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-black tracking-tighter text-red-600">
                  {displayPrice.toLocaleString("vi-VN")}₫
                </span>
                {product.salePrice && product.price > product.salePrice && (
                  <span className="text-xl text-gray-400 line-through">
                    {product.price.toLocaleString("vi-VN")}₫
                  </span>
                )}
              </div>

              {selectedVariant?.priceAdjustment &&
                Number(selectedVariant.priceAdjustment) !== 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    {Number(selectedVariant.priceAdjustment) > 0 ? "+" : ""}
                    {Number(selectedVariant.priceAdjustment).toLocaleString(
                      "vi-VN",
                    )}
                    ₫
                  </p>
                )}

              {product.salePrice && product.price > product.salePrice && (
                <div className="mt-3 inline-block bg-red-600 text-white text-xs font-black px-5 py-1.5 rounded-2xl tracking-widest">
                  TIẾT KIỆM{" "}
                  {Math.round(
                    ((product.price - product.salePrice) / product.price) * 100,
                  )}
                  %
                </div>
              )}
            </div>

            {/* Color Selection */}
            {colorValues.length > 0 && (
              <div className="mt-10">
                <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">
                  MÀU SẮC •{" "}
                  <span className="text-gray-700">{selectedColor}</span>
                </p>
                <div className="flex flex-wrap gap-3">
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
                        className={`px-6 py-3 rounded-2xl border-2 text-sm font-black transition-all active:scale-95 ${
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white shadow-lg"
                            : isAvailable
                              ? "border-gray-200 hover:border-blue-300 bg-white"
                              : "border-gray-100 text-gray-300 line-through cursor-not-allowed"
                        }`}
                      >
                        {color}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Storage Selection */}
            {storageValues.length > 0 && (
              <div className="mt-8">
                <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">
                  DUNG LƯỢNG •{" "}
                  <span className="text-gray-700">{selectedStorage}</span>
                </p>
                <div className="flex flex-wrap gap-3">
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
                        className={`px-7 py-3.5 rounded-2xl border-2 text-sm font-black transition-all active:scale-95 ${
                          isSelected
                            ? "border-blue-600 bg-blue-50 text-blue-700 shadow"
                            : isAvailable
                              ? "border-gray-200 hover:border-blue-300 bg-white"
                              : "border-gray-100 text-gray-300 line-through cursor-not-allowed"
                        }`}
                      >
                        {storage}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            {!isOutOfStock && (
              <div className="mt-10">
                <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">
                  SỐ LƯỢNG
                </p>
                <div className="flex items-center gap-8">
                  <div className="flex items-center bg-white border-2 border-gray-200 rounded-3xl p-2 shadow-sm">
                    <button
                      onClick={decreaseQty}
                      disabled={quantity <= 1 || isDisabled}
                      className="w-14 h-14 flex items-center justify-center text-3xl font-light hover:bg-gray-50 rounded-2xl disabled:opacity-40 transition-colors"
                    >
                      −
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
                      onKeyDown={(e) =>
                        e.key === "Enter" && e.currentTarget.blur()
                      }
                      className="w-20 bg-transparent text-center text-2xl font-black outline-none"
                    />
                    <button
                      onClick={increaseQty}
                      disabled={quantity >= availableStock || isDisabled}
                      className="w-14 h-14 flex items-center justify-center text-3xl font-light hover:bg-gray-50 rounded-2xl disabled:opacity-40 transition-colors"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-xs leading-tight">
                    <span className="font-medium text-gray-500">Còn lại:</span>
                    <br />
                    <span className="font-black text-lg text-gray-900">
                      {Math.max(0, availableStock)}
                    </span>{" "}
                    sản phẩm
                  </div>
                </div>
                {isMaxReached && (
                  <p className="mt-3 text-red-500 text-xs font-bold">
                    Đã đạt giới hạn trong giỏ hàng
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleAddToCart}
                disabled={isDisabled || quantity <= 0}
                className={`flex-1 py-6 rounded-3xl font-black text-lg tracking-widest uppercase flex items-center justify-center gap-3 transition-all active:scale-[0.985] shadow-xl ${
                  isDisabled || quantity <= 0
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
                }`}
              >
                <ShoppingCart className="h-6 w-6" />
                Thêm vào giỏ
              </button>

              <button
                onClick={handleBuyNow}
                disabled={isDisabled || quantity <= 0}
                className={`flex-1 py-6 rounded-3xl font-black text-lg tracking-widest uppercase flex items-center justify-center gap-3 transition-all active:scale-[0.985] shadow-2xl ${
                  isDisabled || quantity <= 0
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-red-600 via-orange-500 to-red-600 text-white hover:brightness-105"
                }`}
              >
                <Zap className="h-6 w-6" />
                Mua ngay
              </button>
            </div>

            {/* Trust Badges */}
            <div className="mt-12 grid grid-cols-3 gap-6">
              {[
                { icon: <Truck className="h-8 w-8" />, label: "Giao nhanh" },
                {
                  icon: <Shield className="h-8 w-8" />,
                  label: "Bảo hành 12 tháng",
                },
                {
                  icon: <RefreshCw className="h-8 w-8" />,
                  label: "Đổi trả 7 ngày",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center text-center bg-white border border-gray-100 rounded-3xl py-6 px-4 hover:border-blue-100 transition-colors"
                >
                  <div className="text-blue-600 mb-4">{item.icon}</div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Description & Specs */}
        <div className="mt-24 grid grid-cols-1 lg:grid-cols-12 gap-16 border-t border-gray-100 pt-20">
          <div className="lg:col-span-7">
            <h2 className="text-3xl font-black tracking-tighter">
              Chi tiết trải nghiệm
            </h2>
            <div className="prose prose-lg mt-8 text-gray-600 leading-relaxed">
              {product.description ||
                "Thông tin chi tiết đang được cập nhật..."}
            </div>
          </div>

          <div className="lg:col-span-5">
            <h2 className="text-3xl font-black tracking-tighter mb-8">
              Thông số kỹ thuật
            </h2>
            {specs && Object.keys(specs).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(specs).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between py-5 px-7 bg-white border border-gray-100 rounded-3xl hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-500">
                      {SPEC_LABELS[key] ?? key}
                    </span>
                    <span className="font-semibold text-right">
                      {Array.isArray(value) ? value.join(", ") : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic">
                Thông số kỹ thuật đang được cập nhật...
              </p>
            )}
          </div>
        </div>

        <ProductReviews productId={product.productId} />
      </div>
    </Layout>
  );
};
