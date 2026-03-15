import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { productService } from "@/services/product.service";
import { Product } from "@/types";
import { ShoppingCart, Star, Truck, Shield, RefreshCw } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import toast from "react-hot-toast";

export const ProductDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedImage, setSelectedImage] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);

  const { addItem } = useCartStore();

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

  // FIX LỖI 6133: Gán các hàm này vào các nút bấm bên dưới
  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, quantity);
    toast.success("Đã thêm vào giỏ hàng!");
  };

  const increaseQty = () => {
    if (!product) return;
    setQuantity((prev) => Math.min(product.stockQuantity || 0, prev + 1));
  };

  const decreaseQty = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-gray-500 font-bold uppercase italic text-xs tracking-widest">Đang tải cấu hình...</p>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center bg-gray-50 rounded-[32px] my-8 border-2 border-dashed border-gray-200">
          <p className="text-xl font-bold text-gray-400 italic">Sản phẩm không tồn tại</p>
        </div>
      </Layout>
    );
  }

  const images = product.images ?? [];
  const currentImageSrc = images[selectedImage]?.imageUrl || product.mainImage || "/placeholder.jpg";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* --- KHỐI HÌNH ẢNH --- */}
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden rounded-[32px] bg-white border border-gray-100 shadow-xl shadow-gray-100/50 group">
              <img
                src={currentImageSrc}
                alt={product.name}
                className="w-full h-full object-contain p-8 transition-transform duration-500 group-hover:scale-110"
              />
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-3">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all p-1 bg-white ${
                      selectedImage === index ? "border-blue-600 shadow-md" : "border-gray-100 hover:border-blue-300"
                    }`}
                  >
                    <img src={img.imageUrl} alt={`${product.name}-${index}`} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* --- KHỐI THÔNG TIN --- */}
          <div className="flex flex-col">
            <h1 className="text-4xl font-black text-gray-800 uppercase italic tracking-tight mb-2 leading-tight">
              {product.name}
            </h1>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="ml-1.5 text-sm font-black text-yellow-700">{(product as any).rating || "5.0"}</span>
              </div>
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                {(product as any).reviewCount || 0} đánh giá
              </span>
              <span className="text-gray-200">|</span>
              <span className={`text-xs font-black uppercase ${product.stockQuantity > 0 ? "text-green-600" : "text-red-500"}`}>
                {product.stockQuantity > 0 ? `Còn ${product.stockQuantity} máy` : "Hết hàng"}
              </span>
            </div>

            <div className="bg-gray-50/50 border border-gray-100 p-8 rounded-[32px] mb-8">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-4xl font-black text-red-600 tracking-tighter">
                  {(product.salePrice || product.price).toLocaleString("vi-VN")}₫
                </span>
                {product.salePrice && product.price > product.salePrice && (
                  <span className="text-lg text-gray-400 line-through font-bold">
                    {product.price.toLocaleString("vi-VN")}₫
                  </span>
                )}
              </div>
              
              {product.salePrice && product.price > product.salePrice && (
                <div className="inline-block bg-red-600 text-white px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest">
                  Tiết kiệm {Math.round(((product.price - product.salePrice) / product.price) * 100)}%
                </div>
              )}
            </div>

            {/* FIX LỖI 6133: Điều khiển số lượng thực tế */}
            <div className="mb-8">
              <h3 className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-3 tracking-widest">Số lượng mua</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-white border-2 border-gray-100 rounded-2xl p-1 shadow-sm">
                  <button onClick={decreaseQty} className="w-10 h-10 flex items-center justify-center font-bold hover:bg-gray-50 rounded-xl transition-colors">-</button>
                  <span className="w-12 text-center font-black text-gray-800">{quantity}</span>
                  <button onClick={increaseQty} className="w-10 h-10 flex items-center justify-center font-bold hover:bg-gray-50 rounded-xl transition-colors">+</button>
                </div>
              </div>
            </div>

            {/* FIX LỖI 6133: Nút thêm vào giỏ hàng sử dụng handleAddToCart */}
            <button
              onClick={handleAddToCart}
              disabled={product.stockQuantity === 0}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-5 rounded-[24px] font-black uppercase tracking-wider hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:bg-gray-300 disabled:shadow-none mb-8"
            >
              <ShoppingCart className="h-6 w-6" />
              Thêm vào giỏ hàng
            </button>

            {/* FIX LỖI 6133: Cam kết TechMart sử dụng đầy đủ Icon */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="flex flex-col items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm text-center">
                <Truck className="h-5 w-5 text-blue-600 mb-2" />
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">Giao hỏa tốc</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm text-center">
                <Shield className="h-5 w-5 text-blue-600 mb-2" />
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">12T Bảo hành</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm text-center">
                <RefreshCw className="h-5 w-5 text-blue-600 mb-2" />
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">7 Ngày đổi trả</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- CHI TIẾT & THÔNG SỐ --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-16 pt-12 border-t border-gray-100">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-black text-gray-800 uppercase italic tracking-tight mb-6">Mô tả sản phẩm</h2>
            <div className="prose prose-blue max-w-none text-gray-600 leading-relaxed whitespace-pre-line font-medium">
              {product.description}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-black text-gray-800 uppercase italic tracking-tight mb-6">Cấu hình chi tiết</h2>
            {product.specifications ? (
              <div className="bg-gray-50 rounded-[28px] overflow-hidden border border-gray-100 p-2">
                <div className="space-y-1">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-50">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-tighter">{key}</span>
                      <span className="text-sm font-bold text-gray-800">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-400 italic text-sm text-center py-10 bg-gray-50 rounded-[28px]">Đang cập nhật thông số...</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};