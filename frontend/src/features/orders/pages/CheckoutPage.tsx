import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { orderService } from "@/services/order.service";
import { walletService } from "@/services/wallet.service";
import { addressService, type Address } from "@/services/address.service";
import api from "@/services/api";
import toast from "react-hot-toast";

const BACKEND_URL = (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5001';
const getImageUrl = (url?: string | null) => {
  if (!url) return '/placeholder.jpg';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

// ─── Voucher Popup ──────────────────────────────────────────────────────────
interface CouponItem {
  couponId: number;
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  validTo?: string;
}

const VoucherPopup = ({
  open,
  onClose,
  onSelect,
  subtotal,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (coupon: CouponItem) => void;
  subtotal: number;
}) => {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get('/coupons/available')
      .then((res) => setCoupons(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const handleManualApply = async () => {
    if (!manualCode.trim()) return;
    setManualError("");
    try {
      const res = await api.post('/coupons/validate', { code: manualCode.toUpperCase(), orderTotal: subtotal });
      onSelect(res.data.coupon);
      onClose();
    } catch (err: any) {
      setManualError(err.response?.data?.message || 'Mã không hợp lệ');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-black uppercase tracking-widest text-gray-800">Chọn mã giảm giá</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
        </div>

        {/* Nhập mã thủ công */}
        <div className="px-6 pt-4">
          <div className="flex gap-2">
            <input
              value={manualCode}
              onChange={(e) => { setManualCode(e.target.value.toUpperCase()); setManualError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleManualApply()}
              placeholder="Nhập mã voucher..."
              className="flex-1 border-2 border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold uppercase tracking-wider focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleManualApply}
              disabled={!manualCode.trim()}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              Áp dụng
            </button>
          </div>
          {manualError && <p className="text-xs text-red-500 font-bold mt-1">{manualError}</p>}
        </div>

        {/* Danh sách coupon */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-8">Đang tải...</p>
          ) : coupons.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Không có mã giảm giá nào</p>
          ) : (
            coupons.map((c) => {
              const isEligible = subtotal >= c.minOrderValue;
              return (
                <button
                  key={c.couponId}
                  onClick={() => { if (isEligible) { onSelect(c); onClose(); } }}
                  disabled={!isEligible}
                  className={`w-full text-left flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                    isEligible
                      ? 'border-gray-100 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                      : 'border-gray-50 bg-gray-50 opacity-60 cursor-not-allowed'
                  }`}
                >
                  {/* Badge giảm giá */}
                  <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex flex-col items-center justify-center text-white">
                    {c.discountType === 'percentage' ? (
                      <>
                        <span className="font-black text-lg leading-none">{c.discountValue}%</span>
                        <span className="text-[9px] font-bold">GIẢM</span>
                      </>
                    ) : (
                      <>
                        <span className="font-black text-xs leading-none">{(c.discountValue / 1000).toFixed(0)}K</span>
                        <span className="text-[9px] font-bold">GIẢM</span>
                      </>
                    )}
                  </div>

                  {/* Thông tin */}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-gray-800">{c.code}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{c.description || (
                      c.discountType === 'percentage'
                        ? `Giảm ${c.discountValue}%${c.maxDiscountAmount ? ` tối đa ${c.maxDiscountAmount.toLocaleString('vi-VN')}đ` : ''}`
                        : `Giảm ${c.discountValue.toLocaleString('vi-VN')}đ`
                    )}</p>
                    {c.minOrderValue > 0 && (
                      <p className={`text-[10px] mt-1 font-bold ${isEligible ? 'text-green-600' : 'text-red-500'}`}>
                        {isEligible ? '✓' : '✗'} Đơn tối thiểu {c.minOrderValue.toLocaleString('vi-VN')}đ
                      </p>
                    )}
                    {c.validTo && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        HSD: {new Date(c.validTo).toLocaleDateString('vi-VN')}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, clearCart, getSelectedItems } = useCartStore();
  const { user, updateUser } = useAuthStore();

  useEffect(() => {
    walletService.getBalance().then((balance) => updateUser({ walletBalance: balance })).catch(() => {});
  }, []);

  const [paymentMethod, setPaymentMethod] = useState<"cod" | "bank_transfer" | "vnpay" | "wallet">("cod");
  const [loading, setLoading] = useState(false);

  // Voucher states
  const [voucher, setVoucher] = useState<any>(null);
  const [showVoucherPopup, setShowVoucherPopup] = useState(false);

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  const [form, setForm] = useState({
    shippingName: user?.fullName || "",
    shippingPhone: user?.phone || "",
    shippingAddress: "",
    shippingWard: "",
    shippingDistrict: "",
    shippingCity: "",
    customerNote: "",
  });

  // Load saved addresses & auto-fill default
  useEffect(() => {
    addressService.getMyAddresses().then((addrs) => {
      setSavedAddresses(addrs);
      const defaultAddr = addrs.find(a => a.isDefault) || addrs[0];
      if (defaultAddr) {
        setForm(prev => ({
          ...prev,
          shippingName: prev.shippingName || defaultAddr.fullName,
          shippingPhone: prev.shippingPhone || defaultAddr.phone,
          shippingAddress: defaultAddr.addressLine,
          shippingWard: defaultAddr.ward,
          shippingDistrict: defaultAddr.district,
          shippingCity: defaultAddr.city,
        }));
      }
    }).catch(() => {});
  }, []);

  // Chỉ thanh toán các sản phẩm đang được chọn trong giỏ.
  const selectedItems = getSelectedItems();
  // Fallback: nếu không có sản phẩm nào được chọn (vd: localStorage cũ), dùng tất cả
  const checkoutItems = selectedItems.length > 0 ? selectedItems : items;

  // Nếu vào checkout mà giỏ hàng trống (vd: bấm Back sau khi đã đặt) → redirect
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Chỉ chạy 1 lần khi mount, không chạy lại khi clearCart

  // Tính tổng tiền
  const subtotal = checkoutItems.reduce(
    (sum, item) => sum + (item.product.salePrice || item.product.price) * item.quantity,
    0
  );
  const shippingFee = 0;

  // Tính giảm giá từ voucher
  const discountAmount = voucher
    ? voucher.discountType === "percentage"
      ? Math.min(
          Math.round((subtotal * voucher.discountValue) / 100),
          voucher.maxDiscountAmount || Infinity
        )
      : voucher.discountValue
    : 0;

  const total = subtotal + shippingFee - discountAmount;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSelectVoucher = (coupon: CouponItem) => {
    setVoucher(coupon);
    toast.success(`Áp dụng mã ${coupon.code} thành công!`);
  };

  const handleRemoveVoucher = () => {
    setVoucher(null);
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

    if (checkoutItems.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 sản phẩm để thanh toán!");
      return;
    }

    if (paymentMethod === "wallet" && (user?.walletBalance ?? 0) < total) {
      toast.error("Số dư ví không đủ để thanh toán đơn hàng này!");
      return;
    }

    try {
      setLoading(true);

      const orderData = {
        items: checkoutItems.map((item) => ({
          productId: item.product.productId,
          quantity: item.quantity,
          price: item.product.salePrice || item.product.price,
          variantId: item.selectedVariantId,
        })),
        shippingName: form.shippingName,
        shippingPhone: form.shippingPhone,
        shippingAddress: form.shippingAddress,
        shippingWard: form.shippingWard,
        shippingDistrict: form.shippingDistrict,
        shippingCity: form.shippingCity,
        shippingFee,
        paymentMethod: paymentMethod,
        customerNote: form.customerNote,
        couponCode: voucher?.code || undefined,
      };

      const result = await orderService.create(orderData as any);

      // VNPay / Chuyển khoản: KHÔNG xóa cart ở đây
      // Cart sẽ được xóa trên trang kết quả thanh toán khi payment thành công
      if (paymentMethod === 'vnpay') {
        const { data } = await api.post('/payment/vnpay/create', {
          orderId: result.orderId,
        });
        window.location.href = data.paymentUrl;
        return;
      }

      if (paymentMethod === 'bank_transfer') {
        navigate(`/payment/bank-transfer/${result.orderId}`);
        return;
      }

      // COD / Wallet → xóa giỏ hàng và chuyển trang
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
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black uppercase tracking-widest text-gray-700">
                  Thông tin giao hàng
                </h2>
                {savedAddresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAddressPicker(!showAddressPicker)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-xl transition-all"
                  >
                    {showAddressPicker ? 'Ẩn' : `Chọn từ ${savedAddresses.length} địa chỉ đã lưu`}
                  </button>
                )}
              </div>

              {/* Address picker */}
              {showAddressPicker && (
                <div className="mb-6 space-y-2 max-h-48 overflow-y-auto">
                  {savedAddresses.map((addr) => (
                    <button
                      key={addr.addressId}
                      type="button"
                      onClick={() => {
                        setForm(prev => ({
                          ...prev,
                          shippingName: addr.fullName,
                          shippingPhone: addr.phone,
                          shippingAddress: addr.addressLine,
                          shippingWard: addr.ward,
                          shippingDistrict: addr.district,
                          shippingCity: addr.city,
                        }));
                        setShowAddressPicker(false);
                        toast.success('Đã chọn địa chỉ');
                      }}
                      className={`w-full text-left p-3 rounded-2xl border-2 transition-all hover:border-blue-400 hover:bg-blue-50 ${
                        form.shippingAddress === addr.addressLine && form.shippingCity === addr.city
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-800">{addr.fullName}</p>
                        <span className="text-xs text-gray-400">|</span>
                        <p className="text-xs text-gray-500">{addr.phone}</p>
                        {addr.isDefault && (
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">Mặc định</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{addr.addressLine}, {addr.ward}, {addr.district}, {addr.city}</p>
                    </button>
                  ))}
                </div>
              )}

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

              {/* Chưa chọn voucher → nút mở popup */}
              {!voucher && (
                <button
                  onClick={() => setShowVoucherPopup(true)}
                  className="w-full flex items-center justify-between border-2 border-dashed border-blue-300 rounded-2xl px-5 py-4 hover:bg-blue-50 transition-all group"
                >
                  <span className="text-sm font-bold text-blue-600 group-hover:text-blue-700">
                    Chọn hoặc nhập mã giảm giá
                  </span>
                  <span className="text-blue-500 font-black text-lg">&rsaquo;</span>
                </button>
              )}

              {/* Voucher đã chọn */}
              {voucher && (
                <div className="flex items-center justify-between bg-green-50 border-2 border-green-200 rounded-2xl px-5 py-4">
                  <div>
                    <p className="text-sm font-black text-green-700 uppercase tracking-widest">
                      🎉 {voucher.code}
                    </p>
                    <p className="text-xs text-green-600 font-bold mt-1">
                      Giảm{" "}
                      {voucher.discountType === "percentage"
                        ? `${voucher.discountValue}%`
                        : `${Number(voucher.discountValue).toLocaleString("vi-VN")}₫`}
                      {voucher.maxDiscountAmount
                        ? ` (tối đa ${Number(voucher.maxDiscountAmount).toLocaleString("vi-VN")}₫)`
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

            {/* Voucher Popup */}
            <VoucherPopup
              open={showVoucherPopup}
              onClose={() => setShowVoucherPopup(false)}
              onSelect={handleSelectVoucher}
              subtotal={subtotal}
            />

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

                {/* Ví TechMart */}
                <button
                  onClick={() => setPaymentMethod("wallet")}
                  className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${
                    paymentMethod === "wallet"
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-100 hover:border-gray-300"
                  }`}
                >
                  <span className="text-3xl">👛</span>
                  <div className="text-left flex-1">
                    <p className="font-black text-sm uppercase tracking-widest text-orange-600">Ví TechMart</p>
                    <p className="text-xs font-bold mt-0.5">
                      Số dư:{" "}
                      <span className={`${(user?.walletBalance ?? 0) >= total ? "text-green-600" : "text-red-500"}`}>
                        {(user?.walletBalance ?? 0).toLocaleString("vi-VN")}₫
                      </span>
                    </p>
                    {(user?.walletBalance ?? 0) > 0 && (user?.walletBalance ?? 0) < total && (
                      <p className="text-[10px] text-red-400 font-bold mt-0.5">Không đủ số dư</p>
                    )}
                  </div>
                  {paymentMethod === "wallet" && (
                    <span className="ml-auto text-orange-500 font-black text-lg">✓</span>
                  )}
                </button>

                {/* VNPay */}
                <button
                  onClick={() => setPaymentMethod("vnpay")}
                  className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${
                    paymentMethod === "vnpay"
                      ? "border-[#005BAA] bg-blue-50"
                      : "border-gray-100 hover:border-gray-300"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#005BAA] flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-black text-xs">VN</span>
                  </div>
                  <div className="text-left">
                    <p className="font-black text-sm uppercase tracking-widest text-[#005BAA]">VNPay</p>
                    <p className="text-xs text-gray-400 font-bold">Thanh toán qua cổng VNPay</p>
                  </div>
                  {paymentMethod === "vnpay" && (
                    <span className="ml-auto text-[#005BAA] font-black text-lg">✓</span>
                  )}
                </button>
              </div>

              {/* Thông báo khi chọn chuyển khoản */}
              {paymentMethod === "bank_transfer" && (
                <div className="mt-6 flex items-center gap-3 bg-blue-50 rounded-2xl p-4 border border-blue-200">
                  <span className="text-2xl">📱</span>
                  <p className="text-xs font-bold text-blue-700">
                    Sau khi đặt hàng, bạn sẽ được chuyển đến trang mã QR để thanh toán qua ngân hàng.
                  </p>
                </div>
              )}

            </div>
          </div>

          {/* ===== CỘT PHẢI: TÓM TẮT ĐƠN HÀNG ===== */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 sticky top-6">
              <h2 className="text-lg font-black uppercase tracking-widest text-gray-700 mb-6">
                Đơn hàng ({checkoutItems.length} sản phẩm)
              </h2>

              {/* Danh sách sản phẩm */}
              <div className="space-y-4 mb-6">
                {checkoutItems.map((item) => (
                  <div key={item.product.productId} className="flex gap-3">
                    <img
                      src={getImageUrl(item.product.mainImage)}
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
