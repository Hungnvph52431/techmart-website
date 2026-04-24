import { CreditCard, FileText, MapPin } from "lucide-react";
import { formatCurrency } from "../lib/orderFormatters";

type Props = {
  shipping: any;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  customerNote?: string;
  cancelReason?: string;
};

export const OrderSummaryAside = ({
  shipping,
  subtotal,
  shippingFee,
  discount,
  total,
  customerNote,
  cancelReason,
}: Props) => {
  return (
    <aside className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-black text-gray-900 uppercase italic flex items-center gap-2 mb-4">
          <MapPin size={16} className="text-blue-600" /> Thông tin giao hàng
        </h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <span className="font-bold text-gray-900">Người nhận:</span>{" "}
            {shipping.name ?? shipping.receiverName ?? "—"}
          </p>
          <p>
            <span className="font-bold text-gray-900">SĐT:</span>{" "}
            {shipping.phone ?? shipping.receiverPhone ?? "—"}
          </p>
          <p>
            <span className="font-bold text-gray-900">Địa chỉ:</span>{" "}
            {shipping.fullAddress ?? shipping.address ?? "—"}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-black text-gray-900 uppercase italic flex items-center gap-2 mb-4">
          <CreditCard size={16} className="text-blue-600" /> Tổng kết thanh toán
        </h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Tạm tính</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Phí vận chuyển</span>
            <span>{formatCurrency(shippingFee)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Giảm giá</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="border-t border-gray-100 pt-2 flex justify-between font-black text-gray-900 text-base">
            <span>Tổng cộng</span>
            <span className="text-blue-600">{formatCurrency(total)}</span>
          </div>
        </div>
      </section>

      {(customerNote || cancelReason) && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-black text-gray-900 uppercase italic flex items-center gap-2 mb-4">
            <FileText size={16} className="text-blue-600" /> Ghi chú
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            {customerNote && (
              <p>
                <span className="font-bold text-gray-900">Ghi chú:</span>{" "}
                {customerNote}
              </p>
            )}
            {cancelReason && (
              <p>
                <span className="font-bold text-rose-700">Lý do hủy:</span>{" "}
                {cancelReason}
              </p>
            )}
          </div>
        </section>
      )}
    </aside>
  );
};
