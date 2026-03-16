import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { orderService } from "@/services/order.service";
import api from "@/services/api";
import toast from "react-hot-toast";

// ====== CẤU HÌNH VIETQR - THAY THÔNG TIN CỦA BẠN VÀO ĐÂY ======
const BANK_ID = "TPB";
const ACCOUNT_NO = "00001302290";
const ACCOUNT_NAME = "BUI VIET KHANH";
// =================================================================

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, clearCart } = useCartStore();
  const { user } = useAuthStore();

  const [paymentMethod, setPaymentMethod] = useState<"cod" | "bank_transfer">("cod");
  const [loading, setLoading] = useState(false);

  // Voucher states
  const [voucherCode, setVoucherCode] = useState("");
  const [voucher, setVoucher] = useState<any>(null);
  const [voucherError, setVoucherError] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);

  const [form, setForm] = useState({
    shippingName: user?.fullName || "",
    shippingPhone: user?.phone || "",
    shippingAddress: "",
    shippingWard: "",
    shippingDistrict: "",
    shippingCity: "",
    customerNote: "",
  });

  // Tính tổng tiền
  const subtotal = items.reduce(
    (sum, item) => sum + (item.product.salePrice || item.product.price) * item.quantity,
    0
  );
  const shippingFee = 0;

  // Tính giảm giá từ voucher
  const discountAmount = voucher
    ? voucher.discount_type === "percent"
      ? Math.min(
          Math.round((subtotal * voucher.discount_value) / 100),
          voucher.max_discount || Infinity
        )
      : voucher.discount_value
    : 0;

  const total = subtotal + shippingFee - discountAmount;

  // Tạo URL QR VietQR động
  const qrDescription = `TechMart ${user?.userId || ""}`;
  const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${total}&addInfo=${encodeURIComponent(qrDescription)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Xử lý apply voucher
  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return;
    try {
      setVoucherLoading(true);
      setVoucherError("");
      setVoucher(null);

      const response = await api.post("/vouchers/validate", {
        code: voucherCode.toUpperCase(),
      });

      // Kiểm tra đơn tối thiểu
      if (
        response.data.min_order_amount &&
        subtotal < response.data.min_order_amount
      ) {
        setVoucherError(
          `Đơn hàng tối thiểu ${response.data.min_order_amount.toLocaleString("vi-VN")}₫ để dùng mã này!`
        );
        return;
      }

      setVoucher(response.data);
      toast.success("Áp dụng mã giảm giá thành công!");
    } catch (error: any) {
      setVoucherError(
        error.response?.data?.message || "Mã không hợp lệ!"
      );
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    setVoucher(null);
    setVoucherCode("");
    setVoucherError("");
  };

  const handleSubmit = async () => {
    if (
      !form.shippingName ||
      !form.shippingPhone ||
      !form.shippingAddress ||
      !form.shippingCity
    ) {
      toast.error("Vui lòng điền đầy đủ thông tin giao hàng!");
      return;
    }
    if (items.length === 0) {
      toast.error("Giỏ hàng trống!");
      return;
    }

    try {
      setLoading(true);

      const orderData = {
        items: items.map((item) => ({
          productId: item.product.productId,
          quantity: item.quantity,
          price: item.product.salePrice || item.product.price,
        })),
        shippingName: form.shippingName,
        shippingPhone: form.shippingPhone,
        shippingAddress: form.shippingAddress,
        shippingWard: form.shippingWard,
        shippingDistrict: form.shippingDistrict,
        shippingCity: form.shippingCity,
        shippingFee,
        paymentMethod,
        customerNote: form.customerNote,
        couponCode: voucher?.code || undefined,
      };

      const result = await orderService.create(orderData as any);
      clearCart();
      toast.success("Đặt hàng thành công!");
      navigate(`/orders/${result.orderId}`);
    } catch (error) {
      toast.error("Đặt hàng thất bại, vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-black uppercase italic tracking-tight text-gray-800 mb-10">
          Thanh toán
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* ===== CỘT TRÁI: FORM ===== */}
          <div className="lg:col-span-2 space-y-8">

            {/* Form địa chỉ */}
            <div className="bg-white rounded-3xl border-2 border-gray-100 p-8">
              <h2 className="text-lg font-black uppercase tracking-widest text-gray-700 mb-6">
                Thông tin giao hàng
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1 block">
                    Họ tên *
                  </label>
                  <input
                    name="shippingName"
                    value={form.shippingName}
                    onChange={handleChange}
                    placeholder="Nguyễn Văn A"
                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1 block">
                    Số điện thoại *
                  </label>
                  <input
                    name="shippingPhone"
                    value={form.shippingPhone}
                    onChange={handleChange}
                    placeholder="0901234567"
                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1 block">
                    Địa chỉ *
                  </label>
                  <input
                    name="shippingAddress"
                    value={form.shippingAddress}
                    onChange={handleChange}
                    placeholder="Số nhà, tên đường..."
                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1 block">
                    Phường/Xã
                  </label>
                  <input
                    name="shippingWard"
                    value={form.shippingWard}
                    onChange={handleChange}
                    placeholder="Phường Bến Nghé"
                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1 block">
                    Quận/Huyện
                  </label>
                  <input
                    name="shippingDistrict"
                    value={form.shippingDistrict}
                    onChange={handleChange}
                    placeholder="Quận 1"
                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1 block">
                    Tỉnh/Thành phố *
                  </label>
                  <input
                    name="shippingCity"
                    value={form.shippingCity}
                    onChange={handleChange}
                    placeholder="TP. Hồ Chí Minh"
                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1 block">
                    Ghi chú
                  </label>
                  <textarea
                    name="customerNote"
                    value={form.customerNote}
                    onChange={handleChange}
                    placeholder="Giao giờ hành chính, gọi trước khi giao..."
                    rows={3}
                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* ===== VOUCHER ===== */}
            <div className="bg-white rounded-3xl border-2 border-gray-100 p-8">
              <h2 className="text-lg font-black uppercase tracking-widest text-gray-700 mb-6">
                🎟️ Mã giảm giá
              </h2>

              {/* Input nhập mã */}
              {!voucher && (
                <div className="flex gap-3">
                  <input
                    value={voucherCode}
                    onChange={(e) => {
                      setVoucherCode(e.target.value.toUpperCase());
                      setVoucherError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyVoucher()}
                    placeholder="Nhập mã voucher..."
                    className="flex-1 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold uppercase tracking-widest focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleApplyVoucher}
                    disabled={voucherLoading || !voucherCode.trim()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all"
                  >
                    {voucherLoading ? "..." : "Áp dụng"}
                  </button>
                </div>
              )}

              {/* Hiện lỗi */}
              {voucherError && (
                <p className="mt-3 text-xs font-bold text-red-500">
                  ❌ {voucherError}
                </p>
              )}

              {/* Voucher hợp lệ */}
              {voucher && (
                <div className="flex items-center justify-between bg-green-50 border-2 border-green-200 rounded-2xl px-5 py-4">
                  <div>
                    <p className="text-sm font-black text-green-700 uppercase tracking-widest">
                      🎉 {voucher.code}
                    </p>
                    <p className="text-xs text-green-600 font-bold mt-1">
                      Giảm{" "}
                      {voucher.discount_type === "percent"
                        ? `${voucher.discount_value}%`
                        : `${Number(voucher.discount_value).toLocaleString("vi-VN")}₫`}
                      {voucher.max_discount
                        ? ` (tối đa ${Number(voucher.max_discount).toLocaleString("vi-VN")}₫)`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-green-700 text-lg">
                      -{discountAmount.toLocaleString("vi-VN")}₫
                    </span>
                    <button
                      onClick={handleRemoveVoucher}
                      className="text-gray-300 hover:text-red-500 font-black text-2xl transition-colors"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Chọn phương thức thanh toán */}
            <div className="bg-white rounded-3xl border-2 border-gray-100 p-8">
              <h2 className="text-lg font-black uppercase tracking-widest text-gray-700 mb-6">
                Phương thức thanh toán
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* COD */}
                <button
                  onClick={() => setPaymentMethod("cod")}
                  className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${
                    paymentMethod === "cod"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-100 hover:border-gray-300"
                  }`}
                >
                  <span className="text-3xl">💵</span>
                  <div className="text-left">
                    <p className="font-black text-sm uppercase tracking-widest">COD</p>
                    <p className="text-xs text-gray-400 font-bold">Thanh toán khi nhận hàng</p>
                  </div>
                  {paymentMethod === "cod" && (
                    <span className="ml-auto text-blue-600 font-black text-lg">✓</span>
                  )}
                </button>

                {/* QR Banking */}
                <button
                  onClick={() => setPaymentMethod("bank_transfer")}
                  className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${
                    paymentMethod === "bank_transfer"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-100 hover:border-gray-300"
                  }`}
                >
                  <span className="text-3xl">📱</span>
                  <div className="text-left">
                    <p className="font-black text-sm uppercase tracking-widest">Chuyển khoản QR</p>
                    <p className="text-xs text-gray-400 font-bold">VietQR - Tất cả ngân hàng</p>
                  </div>
                  {paymentMethod === "bank_transfer" && (
                    <span className="ml-auto text-blue-600 font-black text-lg">✓</span>
                  )}
                </button>
              </div>

              {/* Hiển thị QR khi chọn chuyển khoản */}
              {paymentMethod === "bank_transfer" && (
                <div className="mt-6 flex flex-col items-center bg-gray-50 rounded-3xl p-8 border-2 border-dashed border-gray-200">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">
                    Quét mã để thanh toán
                  </p>
                  <img
                    src={qrUrl}
                    alt="VietQR"
                    className="w-56 h-56 rounded-2xl shadow-lg"
                  />
                  <div className="mt-4 text-center space-y-1">
                    <p className="font-black text-sm text-gray-700">{ACCOUNT_NAME}</p>
                    <p className="text-xs text-gray-400 font-bold">
                      {BANK_ID} - {ACCOUNT_NO}
                    </p>
                    <p className="text-xs text-gray-400 font-bold">
                      Nội dung: {qrDescription}
                    </p>
                    <p className="font-black text-lg text-blue-600">
                      {total.toLocaleString("vi-VN")}₫
                    </p>
                  </div>
                  <p className="mt-4 text-[10px] text-gray-400 font-bold text-center uppercase tracking-widest">
                    Đơn hàng sẽ được xác nhận sau khi chuyển khoản thành công
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ===== CỘT PHẢI: TÓM TẮT ĐƠN HÀNG ===== */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 sticky top-6">
              <h2 className="text-lg font-black uppercase tracking-widest text-gray-700 mb-6">
                Đơn hàng ({items.length} sản phẩm)
              </h2>

              {/* Danh sách sản phẩm */}
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.product.productId} className="flex gap-3">
                    <img
                      src={item.product.mainImage || "/placeholder.jpg"}
                      alt={item.product.name}
                      className="w-16 h-16 object-contain rounded-2xl bg-gray-50 border border-gray-100"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-700 line-clamp-2">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-gray-400 font-bold mt-1">
                        x{item.quantity}
                      </p>
                    </div>
                    <p className="text-xs font-black text-red-600 whitespace-nowrap">
                      {(
                        (item.product.salePrice || item.product.price) *
                        item.quantity
                      ).toLocaleString("vi-VN")}
                      ₫
                    </p>
                  </div>
                ))}
              </div>

              {/* Tổng cộng */}
              <div className="border-t-2 border-gray-50 pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-bold">Tạm tính</span>
                  <span className="font-black">{subtotal.toLocaleString("vi-VN")}₫</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-bold">Phí vận chuyển</span>
                  <span className="font-black text-green-600">Miễn phí</span>
                </div>

                {/* Hiện giảm giá nếu có voucher */}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-bold">
                      Giảm giá ({voucher?.code})
                    </span>
                    <span className="font-black text-green-600">
                      -{discountAmount.toLocaleString("vi-VN")}₫
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-lg border-t-2 border-gray-50 pt-3">
                  <span className="font-black">Tổng cộng</span>
                  <span className="font-black text-red-600">
                    {total.toLocaleString("vi-VN")}₫
                  </span>
                </div>
              </div>

              {/* Nút đặt hàng */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="mt-6 w-full py-5 rounded-3xl bg-blue-600 text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Đang xử lý..." : "🛒 Xác nhận đặt hàng"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
