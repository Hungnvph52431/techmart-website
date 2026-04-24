import { Package } from "lucide-react";
import {
  formatCurrency,
  formatOrderItemVariantSummary,
  getImageUrl,
} from "../lib/orderFormatters";

type Props = {
  items: any[];
  total: number;
  returnedOrderDetailIds: Set<number>;
  refundedOrderDetailIds: Set<number>;
  rejectedOrderDetailIds: Set<number>;
};

export const OrderItemsList = ({
  items,
  total,
  returnedOrderDetailIds,
  refundedOrderDetailIds,
  rejectedOrderDetailIds,
}: Props) => {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-black text-gray-900 uppercase italic flex items-center gap-2">
          <Package size={18} className="text-blue-600" /> Sản phẩm trong đơn
        </h3>
        <p className="text-sm font-black text-gray-900">
          {formatCurrency(total)}
        </p>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Không có sản phẩm</p>
        ) : (
          items.map((item: any, idx: number) => {
            const name =
              item.productName ??
              item.product_name ??
              `Sản phẩm #${idx + 1}`;
            const variant = formatOrderItemVariantSummary(item);
            const qty = item.quantity ?? 1;
            const price = Number(item.price ?? 0);
            const sub = Number(item.subtotal ?? price * qty);
            const img =
              getImageUrl(
                item.productImage ?? item.product_image ?? item.image,
              ) || "/placeholder.jpg";
            const isItemReturned = returnedOrderDetailIds.has(
              item.orderDetailId,
            );
            const isItemRefunded = refundedOrderDetailIds.has(
              item.orderDetailId,
            );
            const isItemRejected = rejectedOrderDetailIds.has(
              item.orderDetailId,
            );
            return (
              <div
                key={item.orderDetailId ?? idx}
                className={`flex gap-4 rounded-2xl border p-4 ${isItemReturned ? "border-gray-100 bg-gray-50 opacity-50" : "border-gray-100"}`}
              >
                <img
                  src={img}
                  alt={name}
                  className="h-16 w-16 rounded-xl object-cover flex-shrink-0 bg-gray-50"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.onerror = null;
                    el.src = "/placeholder.jpg";
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-900 truncate">{name}</p>
                    {isItemReturned && !isItemRefunded && (
                      <span className="inline-flex rounded-full bg-gray-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600 flex-shrink-0">
                        Đang hoàn hàng
                      </span>
                    )}
                    {isItemRefunded && (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700 flex-shrink-0">
                        Đã hoàn hàng
                      </span>
                    )}
                    {isItemRejected && !isItemReturned && (
                      <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600 flex-shrink-0">
                        Từ chối hoàn hàng
                      </span>
                    )}
                  </div>
                  {variant && (
                    <p className="text-xs text-gray-500 mt-0.5">{variant}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Số lượng: {qty}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-gray-900">
                    {formatCurrency(sub)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatCurrency(price)}/sp
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
