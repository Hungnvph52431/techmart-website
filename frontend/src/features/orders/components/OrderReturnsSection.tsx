import { RotateCcw } from "lucide-react";
import type { OrderReturnView } from "@/types/order";
import {
  formatDateTime,
  formatOrderItemVariantSummary,
  getImageUrl,
} from "../lib/orderFormatters";

const RSTATUS: Record<string, { label: string; style: string }> = {
  requested: {
    label: "Chờ duyệt",
    style: "bg-amber-100 text-amber-800",
  },
  approved: {
    label: "Đã duyệt",
    style: "bg-sky-100 text-sky-800",
  },
  rejected: {
    label: "Từ chối",
    style: "bg-rose-100 text-rose-800",
  },
  received: {
    label: "Đã nhận hàng",
    style: "bg-violet-100 text-violet-800",
  },
  refunded: {
    label: "Đã hoàn tiền",
    style: "bg-emerald-100 text-emerald-800",
  },
  closed: {
    label: "Đã đóng",
    style: "bg-gray-100 text-gray-600",
  },
  cancelled: {
    label: "Đã hủy",
    style: "bg-gray-200 text-gray-700",
  },
};

type Props = {
  returns: OrderReturnView[];
  submitting: string | null;
  onRequestCancel: (returnId: number) => void;
};

export const OrderReturnsSection = ({
  returns,
  submitting,
  onRequestCancel,
}: Props) => {
  if (returns.length === 0) return null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-black text-gray-900 uppercase italic flex items-center gap-2 mb-5">
        <RotateCcw size={18} className="text-orange-500" /> Yêu cầu hoàn/trả
        hàng
      </h3>
      <div className="space-y-4">
        {returns.map((ret) => {
          const cfg = RSTATUS[ret.status] ?? RSTATUS.requested;
          return (
            <div
              key={ret.orderReturnId}
              className="rounded-xl border border-gray-100 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-gray-800 text-sm">
                    {ret.requestCode}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Yêu cầu lúc{" "}
                    {ret.requestedAt ? formatDateTime(ret.requestedAt) : "—"}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase ${cfg.style}`}
                >
                  {cfg.label}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                <span className="font-bold text-gray-800">Lý do:</span>{" "}
                {ret.reason}
              </p>
              {ret.customerNote && (
                <p className="text-xs text-gray-500 italic">
                  "{ret.customerNote}"
                </p>
              )}
              {ret.evidenceImages && ret.evidenceImages.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-1.5">
                    Ảnh bằng chứng:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ret.evidenceImages.map((img, idx) => (
                      <a
                        key={idx}
                        href={getImageUrl(img)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-16 h-16 rounded-lg overflow-hidden border border-gray-200 hover:border-orange-400 transition-colors"
                      >
                        <img
                          src={getImageUrl(img)}
                          alt={`evidence-${idx}`}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {ret.items?.length > 0 && (
                <div className="space-y-1.5">
                  {ret.items.map((item) => {
                    const variantSummary = formatOrderItemVariantSummary(item);
                    return (
                      <div
                        key={item.orderReturnItemId}
                        className="text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-2"
                      >
                        <span className="font-bold">
                          {item.productName || `SP #${item.productId}`}
                        </span>
                        {variantSummary && (
                          <span className="text-gray-500">
                            {" "}
                            • {variantSummary}
                          </span>
                        )}{" "}
                        — SL: {item.quantity}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400 font-bold pt-1 border-t border-gray-50">
                {ret.approvedAt && (
                  <span>Duyệt: {formatDateTime(ret.approvedAt)}</span>
                )}
                {ret.rejectedAt && (
                  <span className="text-rose-400">
                    Từ chối: {formatDateTime(ret.rejectedAt)}
                  </span>
                )}
                {ret.receivedAt && (
                  <span>Nhận hàng: {formatDateTime(ret.receivedAt)}</span>
                )}
                {ret.refundedAt && (
                  <span className="text-emerald-500">
                    Hoàn tiền: {formatDateTime(ret.refundedAt)}
                  </span>
                )}
                {ret.closedAt && (
                  <span>Đóng: {formatDateTime(ret.closedAt)}</span>
                )}
                {ret.cancelledAt && (
                  <span className="text-gray-500">
                    Hủy: {formatDateTime(ret.cancelledAt)}
                  </span>
                )}
              </div>
              {ret.status === "requested" && (
                <div className="pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => onRequestCancel(ret.orderReturnId)}
                    disabled={
                      submitting === `cancel-return-${ret.orderReturnId}`
                    }
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Hủy yêu cầu
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
