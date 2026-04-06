import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useCartStore } from "@/store/cartStore";
import { useCheckoutSessionStore } from "@/store/checkoutSessionStore";
import { useAuthStore } from "@/store/authStore";
import { orderService } from "@/services/order.service";
import { walletService } from "@/services/wallet.service";
import { type Address } from "@/services/address.service";
import api from "@/services/api";
import toast from "react-hot-toast";
import { getCartSelectionKey } from "@/features/cart/lib/cartQuantity";
import {
  applyPendingCheckoutCleanup,
  buildPendingCheckoutCleanup,
  persistPendingCheckoutCleanup,
} from "../lib/checkoutSuccessCleanup";

// Sửa đường dẫn import: Đi lùi 1 cấp (../) để ra khỏi thư mục pages/, rồi vào components/ và hooks/
import { useCheckoutAddress } from "../hooks/useCheckoutAddress";
import { DeliveryAddressSummary } from "../components/DeliveryAddressSummary";
import { AddressSelectionModal } from "../components/AddressSelectionModal";
import { AddressFormModal } from "../components/AddressFormModal";

const BACKEND_URL = (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5001';
const getImageUrl = (url?: string | null) => {
  if (!url) return '/placeholder.jpg';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

// ─── Voucher Popup (Giữ nguyên của bạn) ──────────────────────────────────────────────────────────
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

const VoucherPopup = ({ open, onClose, onSelect, subtotal }: { open: boolean; onClose: () => void; onSelect: (coupon: CouponItem) => void; subtotal: number; }) => {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get('/coupons/available').then((res) => setCoupons(res.data)).catch(() => {}).finally(() => setLoading(false));
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
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-black uppercase tracking-widest text-gray-800">Chọn mã giảm giá</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
        </div>
        <div className="px-6 pt-4">
          <div className="flex gap-2">
            <input value={manualCode} onChange={(e) => { setManualCode(e.target.value.toUpperCase()); setManualError(""); }} onKeyDown={(e) => e.key === "Enter" && handleManualApply()} placeholder="Nhập mã voucher..." className="flex-1 border-2 border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold uppercase tracking-wider focus:outline-none focus:border-blue-500" />
            <button onClick={handleManualApply} disabled={!manualCode.trim()} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all">Áp dụng</button>
          </div>
          {manualError && <p className="text-xs text-red-500 font-bold mt-1">{manualError}</p>}
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? <p className="text-center text-sm text-gray-400 py-8">Đang tải...</p> : coupons.length === 0 ? <p className="text-center text-sm text-gray-400 py-8">Không có mã giảm giá nào</p> : (
            coupons.map((c) => {
              const isEligible = subtotal >= c.minOrderValue;
              return (
                <button key={c.couponId} onClick={() => { if (isEligible) { onSelect(c); onClose(); } }} disabled={!isEligible} className={`w-full text-left flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${isEligible ? 'border-gray-100 hover:border-blue-400 hover:bg-blue-50 cursor-pointer' : 'border-gray-50 bg-gray-50 opacity-60 cursor-not-allowed'}`}>
                  <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex flex-col items-center justify-center text-white">
                    {c.discountType === 'percentage' ? (<><span className="font-black text-lg leading-none">{c.discountValue}%</span><span className="text-[9px] font-bold">GIẢM</span></>) : (<><span className="font-black text-xs leading-none">{(c.discountValue / 1000).toFixed(0)}K</span><span className="text-[9px] font-bold">GIẢM</span></>)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-gray-800">{c.code}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{c.description || (c.discountType === 'percentage' ? `Giảm ${c.discountValue}%${c.maxDiscountAmount ? ` tối đa ${c.maxDiscountAmount.toLocaleString('vi-VN')}đ` : ''}` : `Giảm ${c.discountValue.toLocaleString('vi-VN')}đ`)}</p>
                    {c.minOrderValue > 0 && <p className={`text-[10px] mt-1 font-bold ${isEligible ? 'text-green-600' : 'text-red-500'}`}>{isEligible ? '✓' : '✗'} Đơn tối thiểu {c.minOrderValue.toLocaleString('vi-VN')}đ</p>}
                    {c.validTo && <p className="text-[10px] text-gray-400 mt-0.5">HSD: {new Date(c.validTo).toLocaleDateString('vi-VN')}</p>}
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

// ─── Main Checkout Page ──────────────────────────────────────────────────────────
export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, getSelectedItems } = useCartStore();
  const { directItems } = useCheckoutSessionStore();
  const { user, updateUser } = useAuthStore();
  const pendingSuccessOrderIdRef = useRef<number | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<"cod" | "vnpay" | "wallet">("cod");
  const [loading, setLoading] = useState(false);
  
  // Voucher states
  const [voucher, setVoucher] = useState<any>(null);
  const [showVoucherPopup, setShowVoucherPopup] = useState(false);

  // Hook quản lý địa chỉ mới ráp vào
  const {
    deliveryForm, updateForm, updateNote, savedAddresses, applySavedAddress,
    provinces, wards, selectedProvinceCode, selectedWardCode,
    loadingProvinces, loadingWards, locationError,
    handleProvinceChange, handleWardChange, isLocationSelected
  } = useCheckoutAddress(user);

  // State quản lý Modals
  const [showListModal, setShowListModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);

  useEffect(() => {
    walletService.getBalance().then((balance) => updateUser({ walletBalance: balance })).catch(() => {});
  }, []);

  const selectedItems = getSelectedItems();
  const checkoutSource = directItems.length > 0
    ? 'direct'
    : selectedItems.length > 0
      ? 'selected_cart'
      : items.length > 0
        ? 'cart'
        : 'empty';
  const checkoutItems = checkoutSource === 'direct'
    ? directItems
    : checkoutSource === 'selected_cart'
      ? selectedItems
      : items;

  const getCheckoutItemUnitPrice = (item: typeof checkoutItems[number]) => {
    if (item.selectedVariantPrice != null) {
      return Number(item.selectedVariantPrice);
    }

    const basePrice = Number(item.product.salePrice || item.product.price);
    if (!item.selectedVariantId || !item.product.variants) {
      return basePrice;
    }

    const variant = item.product.variants.find(
      (productVariant) =>
        productVariant.variantId === item.selectedVariantId ||
        (productVariant as any).id === item.selectedVariantId
    );

    if ((variant as any)?.price != null) {
      return Number((variant as any).price);
    }

    if (variant?.priceAdjustment != null) {
      return basePrice + Number(variant.priceAdjustment);
    }

    return basePrice;
  };

  useEffect(() => {
    if (checkoutItems.length === 0 && !pendingSuccessOrderIdRef.current) {
      navigate('/cart', { replace: true });
    }
  }, [checkoutItems.length, navigate]);

  const subtotal = checkoutItems.reduce(
    (sum, item) => sum + getCheckoutItemUnitPrice(item) * item.quantity,
    0
  );
  const shippingFee = 0;
  const discountAmount = voucher ? (voucher.discountType === "percentage" ? Math.min(Math.round((subtotal * voucher.discountValue) / 100), voucher.maxDiscountAmount || Infinity) : voucher.discountValue) : 0;
  const total = subtotal + shippingFee - discountAmount;

  const handleSelectVoucher = (coupon: CouponItem) => {
    setVoucher(coupon);
    toast.success(`Áp dụng mã ${coupon.code} thành công!`);
  };

  const handleRemoveVoucher = () => {
    setVoucher(null);
  };

  const handleSubmit = async () => {
    if (!deliveryForm.shippingName || !deliveryForm.shippingPhone || !deliveryForm.shippingAddress || !deliveryForm.shippingCity) {
      toast.error("Vui lòng điền đầy đủ thông tin giao hàng!"); return;
    }
    if (!isLocationSelected) {
      toast.error("Vui lòng chọn khu vực giao hàng hợp lệ!"); return;
    }
    if (checkoutItems.length === 0) {
      toast.error("Không có sản phẩm để thanh toán!"); return;
    }
    if (paymentMethod === "wallet" && (user?.walletBalance ?? 0) < total) {
      toast.error("Số dư ví không đủ để thanh toán!"); return;
    }

    try {
      setLoading(true);
      const orderData = {
        items: checkoutItems.map((item) => {
          const price = getCheckoutItemUnitPrice(item);
          return { productId: item.product.productId, quantity: item.quantity, price, variantId: item.selectedVariantId };
        }),
        ...deliveryForm, // Trải data từ Hook Form vào đây
        shippingFee,
        paymentMethod: paymentMethod,
        couponCode: voucher?.code || undefined,
      };

      const result = await orderService.create(orderData);
      const cleanup = buildPendingCheckoutCleanup(
        result.orderId,
        checkoutSource,
        checkoutItems,
      );
      pendingSuccessOrderIdRef.current = result.orderId;

      if (paymentMethod === 'vnpay') {
        if (cleanup) {
          persistPendingCheckoutCleanup(cleanup);
        }
        const { data } = await api.post('/payment/vnpay/create', { orderId: result.orderId });
        window.location.href = data.paymentUrl;
        return;
      }

      if (cleanup) {
        applyPendingCheckoutCleanup(cleanup);
      }

      toast.success("Đặt hàng thành công!");
      navigate(`/orders/${result.orderId}`, { replace: true });
    } catch (error) {
      toast.error("Đặt hàng thất bại, vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 bg-gray-50 min-h-screen">
        <h1 className="text-3xl font-black uppercase italic tracking-tight text-gray-800 mb-10">Thanh toán</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            
            {/* TÓM TẮT ĐỊA CHỈ */}
            <DeliveryAddressSummary 
               form={deliveryForm} 
               onNoteChange={updateNote}
               onChangeClick={() => setShowListModal(true)} 
            />

            {/* VOUCHER */}
            <div className="bg-white rounded-3xl border-2 border-gray-100 p-8">
              <h2 className="text-lg font-black uppercase tracking-widest text-gray-700 mb-6">🎟️ Mã giảm giá</h2>
              {!voucher && (
                <button onClick={() => setShowVoucherPopup(true)} className="w-full flex items-center justify-between border-2 border-dashed border-blue-300 rounded-2xl px-5 py-4 hover:bg-blue-50 transition-all group">
                  <span className="text-sm font-bold text-blue-600 group-hover:text-blue-700">Chọn hoặc nhập mã giảm giá</span>
                  <span className="text-blue-500 font-black text-lg">&rsaquo;</span>
                </button>
              )}
              {voucher && (
                <div className="flex items-center justify-between bg-green-50 border-2 border-green-200 rounded-2xl px-5 py-4">
                  <div>
                    <p className="text-sm font-black text-green-700 uppercase tracking-widest">🎉 {voucher.code}</p>
                    <p className="text-xs text-green-600 font-bold mt-1">Giảm {voucher.discountType === "percentage" ? `${voucher.discountValue}%` : `${Number(voucher.discountValue).toLocaleString("vi-VN")}₫`} {voucher.maxDiscountAmount ? ` (tối đa ${Number(voucher.maxDiscountAmount).toLocaleString("vi-VN")}₫)` : ""}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-green-700 text-lg">-{discountAmount.toLocaleString("vi-VN")}₫</span>
                    <button onClick={handleRemoveVoucher} className="text-gray-300 hover:text-red-500 font-black text-2xl transition-colors">×</button>
                  </div>
                </div>
              )}
            </div>

            {/* PHƯƠNG THỨC THANH TOÁN */}
            <div className="bg-white rounded-3xl border-2 border-gray-100 p-8">
              <h2 className="text-lg font-black uppercase tracking-widest text-gray-700 mb-6">Phương thức thanh toán</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => setPaymentMethod("cod")} className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${paymentMethod === "cod" ? "border-blue-600 bg-blue-50" : "border-gray-100 hover:border-gray-300"}`}>
                  <span className="text-3xl">💵</span>
                  <div className="text-left">
                    <p className="font-black text-sm uppercase tracking-widest">COD</p>
                    <p className="text-xs text-gray-400 font-bold">Thanh toán khi nhận hàng</p>
                  </div>
                  {paymentMethod === "cod" && <span className="ml-auto text-blue-600 font-black text-lg">✓</span>}
                </button>

                <button onClick={() => setPaymentMethod("wallet")} className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${paymentMethod === "wallet" ? "border-orange-500 bg-orange-50" : "border-gray-100 hover:border-gray-300"}`}>
                  <span className="text-3xl">👛</span>
                  <div className="text-left flex-1">
                    <p className="font-black text-sm uppercase tracking-widest text-orange-600">Ví TechMart</p>
                    <p className="text-xs font-bold mt-0.5">Số dư: <span className={`${(user?.walletBalance ?? 0) >= total ? "text-green-600" : "text-red-500"}`}>{(user?.walletBalance ?? 0).toLocaleString("vi-VN")}₫</span></p>
                    {(user?.walletBalance ?? 0) > 0 && (user?.walletBalance ?? 0) < total && <p className="text-[10px] text-red-400 font-bold mt-0.5">Không đủ số dư</p>}
                  </div>
                  {paymentMethod === "wallet" && <span className="ml-auto text-orange-500 font-black text-lg">✓</span>}
                </button>

                <button onClick={() => setPaymentMethod("vnpay")} className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${paymentMethod === "vnpay" ? "border-[#005BAA] bg-blue-50" : "border-gray-100 hover:border-gray-300"}`}>
                  <div className="w-10 h-10 rounded-xl bg-[#005BAA] flex items-center justify-center flex-shrink-0"><span className="text-white font-black text-xs">VN</span></div>
                  <div className="text-left">
                    <p className="font-black text-sm uppercase tracking-widest text-[#005BAA]">VNPay</p>
                    <p className="text-xs text-gray-400 font-bold">Thanh toán qua cổng VNPay</p>
                  </div>
                  {paymentMethod === "vnpay" && <span className="ml-auto text-[#005BAA] font-black text-lg">✓</span>}
                </button>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: TÓM TẮT ĐƠN HÀNG */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 sticky top-6">
              <h2 className="text-lg font-black uppercase tracking-widest text-gray-700 mb-6">Đơn hàng ({checkoutItems.length} sản phẩm)</h2>
              <div className="space-y-4 mb-6">
                {checkoutItems.map((item) => (
                  <div
                    key={getCartSelectionKey(item.product.productId, item.selectedVariantId)}
                    className="flex gap-3"
                  >
                    <img src={getImageUrl(item.product.mainImage)} alt={item.product.name} className="w-16 h-16 object-contain rounded-2xl bg-gray-50 border border-gray-100" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-700 line-clamp-2">{item.product.name}</p>
                      {item.selectedVariantName && (
                        <p className="text-[11px] text-gray-500 font-semibold mt-1 line-clamp-2">
                          {item.selectedVariantName}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 font-bold mt-1">x{item.quantity}</p>
                    </div>
                    <p className="text-xs font-black text-red-600 whitespace-nowrap">
                      {(getCheckoutItemUnitPrice(item) * item.quantity).toLocaleString("vi-VN")}₫
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t-2 border-gray-50 pt-4 space-y-3">
                <div className="flex justify-between text-sm"><span className="text-gray-400 font-bold">Tạm tính</span><span className="font-black">{subtotal.toLocaleString("vi-VN")}₫</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400 font-bold">Phí vận chuyển</span><span className="font-black text-green-600">Miễn phí</span></div>
                {discountAmount > 0 && <div className="flex justify-between text-sm"><span className="text-gray-400 font-bold">Giảm giá ({voucher?.code})</span><span className="font-black text-green-600">-{discountAmount.toLocaleString("vi-VN")}₫</span></div>}
                <div className="flex justify-between text-lg border-t-2 border-gray-50 pt-3"><span className="font-black">Tổng cộng</span><span className="font-black text-red-600">{total.toLocaleString("vi-VN")}₫</span></div>
              </div>
              
              {/* Nút đặt hàng gọi hàm handleSubmit */}
              <button onClick={handleSubmit} disabled={loading || !isLocationSelected} className="mt-6 w-full py-5 rounded-3xl bg-blue-600 text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? "Đang xử lý..." : "🛒 Xác nhận đặt hàng"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP MODALS */}
      <VoucherPopup open={showVoucherPopup} onClose={() => setShowVoucherPopup(false)} onSelect={handleSelectVoucher} subtotal={subtotal} />
      
      <AddressSelectionModal
        open={showListModal}
        addresses={savedAddresses}
        currentFormAddress={deliveryForm.shippingAddress}
        onClose={() => setShowListModal(false)}
        onSelect={(addr: Address) => applySavedAddress(addr)}
        onAddNew={() => { setShowListModal(false); setShowFormModal(true); }}
      />

      <AddressFormModal
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        form={deliveryForm}
        updateForm={updateForm}
        provinces={provinces} wards={wards}
        selectedProvinceCode={selectedProvinceCode} selectedWardCode={selectedWardCode}
        loadingProvinces={loadingProvinces} loadingWards={loadingWards} locationError={locationError}
        onProvinceChange={handleProvinceChange} onWardChange={handleWardChange}
        onSubmit={() => {
           if(!isLocationSelected || !deliveryForm.shippingName || !deliveryForm.shippingPhone || !deliveryForm.shippingAddress) {
              toast.error("Vui lòng điền đủ thông tin"); return;
           }
           setShowFormModal(false);
           toast.success("Đã áp dụng địa chỉ mới");
        }}
      />
    </Layout>
  );
};
