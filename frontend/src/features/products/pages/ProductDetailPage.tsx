import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { productService } from "@/services/product.service";
import { Product } from "@/types";
import { ShoppingCart, Star, Truck, Shield, RefreshCw, ChevronRight } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import toast from "react-hot-toast";

export const ProductDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedImage, setSelectedImage] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);

  // Logic kiểm soát tồn kho từ bản Tuấn Anh
  const { addItem, items } = useCartStore();
  const currentCartItem = items.find(item => item.product.productId === product?.productId);
  const cartQuantity = currentCartItem ? currentCartItem.quantity : 0;
  const availableStock = product ? product.stockQuantity - cartQuantity : 0;

  const isOutOfStock = product ? product.stockQuantity <= 0 : false;
  const isMaxReached = !isOutOfStock && availableStock <= 0;
  const isDisabled = isOutOfStock || isMaxReached;

  // Tự động điều chỉnh số lượng nếu vượt quá kho
  useEffect(() => {
    if (quantity > availableStock && availableStock > 0) {
      setQuantity(availableStock);
    } else if (availableStock <= 0 && !isOutOfStock) {
      setQuantity(0);
    }
  }, [availableStock, quantity, isOutOfStock]);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      try {
        setLoading(true);
        const data = await productService.getBySlug(slug);
        setProduct(data);
      } catch (error) {
        console.error("Lỗi khi tải chi tiết sản phẩm:", error);
        toast.error("Không thể tải thông tin sản phẩm");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  const handleAddToCart = () => {
    if (!product || quantity <= 0) return;
    addItem(product, quantity);
    toast.success(`Đã thêm ${quantity} sản phẩm vào giỏ hàng!`);
  };

  const increaseQty = () => {
    if (quantity < availableStock) setQuantity(prev => prev + 1);
  };

  const decreaseQty = () => {
    if (quantity > 1) setQuantity(prev => prev - 1);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-[10px] font-black text-gray-400 uppercase italic tracking-widest">Đang tải cấu hình...</p>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center bg-gray-50 rounded-[32px] my-8 border-2 border-dashed border-gray-200">
          <p className="text-xl font-black text-gray-400 uppercase italic italic">Sản phẩm không tồn tại</p>
        </div>
      </Layout>
    );
  }

const images = (product.images ?? []) as unknown as string[];
const currentImageSrc = images[0] || (product as any).mainImage || "/placeholder.jpg";


  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          
          {/* --- 1. KHỐI HÌNH ẢNH (GALLERY) --- */}
          <div className="space-y-6">
            <div className="aspect-square overflow-hidden rounded-[40px] bg-white border border-gray-100 shadow-2xl shadow-gray-200/50 group">
              <img
                  src={currentImageSrc}
                  alt={product.name}
                  className="w-full h-full object-contain p-12 transition-transform duration-700 group-hover:scale-110"
                />
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-4">
  {images.map((img, index) => (
    <button
      key={index}
      onClick={() => setSelectedImage(index)}
      className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all p-1 bg-white ${
        selectedImage === index ? "border-blue-600 shadow-lg scale-105" : "border-gray-100 opacity-60 hover:opacity-100"
      }`}
    >
      <img src={img as unknown as string} alt={`${product.name}-${index}`} className="w-full h-full object-contain" />
    </button>
  ))}
</div>
            )}
          </div>

          {/* --- 2. KHỐI THÔNG TIN SẢN PHẨM --- */}
          <div className="flex flex-col">
            <div className="mb-4">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic flex items-center gap-1">
                TechMart Store <ChevronRight size={10} /> {product.brandName || "Premium"}
              </span>
              <h1 className="text-5xl font-black text-gray-800 uppercase italic tracking-tighter mb-4 leading-none mt-2">
                {product.name}
              </h1>
            </div>
            
            <div className="flex items-center gap-6 mb-8">
              <div className="flex items-center bg-yellow-400 px-3 py-1 rounded-full">
                <Star className="h-4 w-4 text-white fill-current" />
                <span className="ml-1.5 text-xs font-black text-white">{product.ratingAvg || "5.0"}</span>
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {product.reviewCount || 0} Đánh giá người dùng
              </span>
              <span className="text-gray-200">|</span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${product.stockQuantity > 0 ? "text-green-600" : "text-red-500"}`}>
                {product.stockQuantity > 0 ? `Sẵn hàng (${product.stockQuantity} máy)` : "Cháy hàng"}
              </span>
            </div>

            <div className="bg-gray-50/80 border-2 border-gray-100 p-10 rounded-[48px] mb-8 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-baseline gap-4 mb-2">
                  <span className="text-5xl font-black text-red-600 tracking-tighter">
                    {Number(product.salePrice || product.price).toLocaleString("vi-VN")}₫
                  </span>
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
            </div>

            {/* --- 3. ĐIỀU KHIỂN SỐ LƯỢNG & MUA HÀNG --- */}
            {!isOutOfStock && (
              <div className="mb-10">
                <h3 className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-4 tracking-widest">Cấu hình số lượng</h3>
                <div className="flex items-center gap-6">
                  <div className="flex items-center bg-white border-4 border-gray-100 rounded-[24px] p-1.5 shadow-sm">
                    <button 
                      onClick={decreaseQty} 
                      disabled={quantity <= 1 || isDisabled}
                      className="w-12 h-12 flex items-center justify-center font-black text-xl hover:bg-gray-50 rounded-2xl transition-colors disabled:opacity-20"
                    >-</button>
                    <span className="w-16 text-center font-black text-xl text-gray-800">{quantity}</span>
                    <button 
                      onClick={increaseQty} 
                      disabled={quantity >= availableStock || isDisabled}
                      className="w-12 h-12 flex items-center justify-center font-black text-xl hover:bg-gray-50 rounded-2xl transition-colors disabled:opacity-20"
                    >+</button>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                      Giới hạn mua thêm: {Math.max(0, availableStock)} SP
                    </span>
                    {isMaxReached && (
                      <span className="text-[9px] font-bold text-red-500 uppercase mt-1 italic">Đã đạt tối đa trong giỏ hàng!</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleAddToCart}
              disabled={isDisabled || quantity <= 0}
              className={`w-full flex items-center justify-center gap-4 py-6 rounded-[32px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-2xl mb-10 ${
                isDisabled || quantity <= 0
                ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
              }`}
            >
              <ShoppingCart className="h-6 w-6" />
              {isOutOfStock ? "Tạm hết hàng" : isMaxReached ? "Sản phẩm đã có trong giỏ" : "Chốt đơn ngay"}
            </button>

            {/* --- 4. CAM KẾT TECHMART --- */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: <Truck />, label: "Giao hỏa tốc" },
                { icon: <Shield />, label: "12T Bảo hành" },
                { icon: <RefreshCw />, label: "7 Ngày đổi trả" }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center p-5 bg-white border-2 border-gray-50 rounded-[24px] shadow-sm text-center group hover:border-blue-100 transition-all">
                  <div className="text-blue-600 mb-3 transition-transform group-hover:scale-110">{item.icon}</div>
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- 5. MÔ TẢ & THÔNG SỐ (Dưới trang) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 mt-24 pt-16 border-t-4 border-gray-50">
          <div className="lg:col-span-2">
            <h2 className="text-3xl font-black text-gray-800 uppercase italic tracking-tighter mb-8">Chi tiết trải nghiệm</h2>
            <div className="prose prose-blue max-w-none text-gray-500 leading-relaxed whitespace-pre-line font-bold text-sm">
              {product.description || "Nội dung đang được cập nhật..."}
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-black text-gray-800 uppercase italic tracking-tighter mb-8">Thông số kỹ thuật</h2>
            {product.specifications ? (
              <div className="bg-white rounded-[32px] border-2 border-gray-100 p-4 shadow-xl shadow-gray-50">
                <div className="space-y-2">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl hover:bg-blue-50 transition-colors">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter italic">{key}</span>
                      <span className="text-xs font-black text-gray-800 uppercase">{String(value)}</span>
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
      </div>
    </Layout>
  );
};