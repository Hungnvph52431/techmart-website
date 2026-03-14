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
    if (!slug) return;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await productService.getBySlug(slug);
        setProduct(data);
      } catch (error) {
        console.error("Fetch product error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  const handleAddToCart = () => {
    if (!product) return;

    addItem(product, quantity);
    toast.success("Đã thêm vào giỏ hàng!");
  };

  const increaseQty = () => {
    if (!product) return;
    setQuantity((prev) => Math.min(product.stock, prev + 1));
  };

  const decreaseQty = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-lg text-gray-500">Không tìm thấy sản phẩm</p>
        </div>
      </Layout>
    );
  }

  const images = product.images ?? [];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="mb-4">
              <img
                src={images[selectedImage] || "/placeholder.jpg"}
                alt={product.name}
                className="w-full h-96 object-cover rounded-lg"
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`${product.name}-${index}`}
                  onClick={() => setSelectedImage(index)}
                  className={`h-24 w-full cursor-pointer rounded-lg object-cover border-2 ${
                    selectedImage === index
                      ? "border-primary-600"
                      : "border-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

            <div className="flex items-center mb-4">
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <span className="ml-1 text-lg">{product.rating}</span>
              </div>

              <span className="mx-3 text-gray-400">|</span>

              <span className="text-gray-600">
                {product.reviewCount} đánh giá
              </span>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <div className="text-3xl font-bold text-red-600 mb-2">
                {product.price.toLocaleString("vi-VN")}₫
              </div>

              {product.originalPrice > product.price && (
                <div className="flex items-center gap-2">
                  <span className="text-lg text-gray-400 line-through">
                    {product.originalPrice.toLocaleString("vi-VN")}₫
                  </span>

                  <span className="bg-red-500 text-white px-2 py-1 rounded text-sm">
                    -
                    {Math.round(
                      ((product.originalPrice - product.price) /
                        product.originalPrice) *
                        100
                    )}
                    %
                  </span>
                </div>
              )}
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-3">Số lượng</h3>

              <div className="flex items-center gap-3">
                <button
                  onClick={decreaseQty}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  -
                </button>

                <span className="px-4 py-2 border rounded">{quantity}</span>

                <button
                  onClick={increaseQty}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  +
                </button>

                <span className="text-gray-500 ml-4">
                  Còn {product.stock} sản phẩm
                </span>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition disabled:bg-gray-400"
            >
              <ShoppingCart className="h-5 w-5" />
              Thêm vào giỏ hàng
            </button>

            <div className="grid grid-cols-3 gap-4 my-6">
              <div className="flex flex-col items-center p-3 bg-gray-50 rounded">
                <Truck className="h-6 w-6 text-primary-600 mb-1" />
                <span className="text-xs text-center">Giao hàng nhanh</span>
              </div>

              <div className="flex flex-col items-center p-3 bg-gray-50 rounded">
                <Shield className="h-6 w-6 text-primary-600 mb-1" />
                <span className="text-xs text-center">Bảo hành 12 tháng</span>
              </div>

              <div className="flex flex-col items-center p-3 bg-gray-50 rounded">
                <RefreshCw className="h-6 w-6 text-primary-600 mb-1" />
                <span className="text-xs text-center">Đổi trả 7 ngày</span>
              </div>
            </div>

            {product.specifications && (
              <div className="border-t pt-6">
                <h3 className="font-semibold mb-3">Thông số kỹ thuật</h3>

                <div className="space-y-2">
                  {Object.entries(product.specifications).map(
                    ([key, value]) => (
                      <div key={key} className="flex">
                        <span className="w-1/3 text-gray-600 capitalize">
                          {key}
                        </span>

                        <span className="w-2/3 font-medium">{value}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 border-t pt-8">
          <h2 className="text-2xl font-bold mb-4">Mô tả sản phẩm</h2>

          <p className="text-gray-700 whitespace-pre-line">
            {product.description}
          </p>
        </div>
      </div>
    </Layout>
  );
};