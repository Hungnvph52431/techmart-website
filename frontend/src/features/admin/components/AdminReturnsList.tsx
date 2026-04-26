import {
  AlertCircle,
  CheckCircle,
  CreditCard,
  RotateCcw,
  Search,
  Truck,
  XCircle,
} from "lucide-react";

const BACKEND_URL =
  (import.meta.env.VITE_API_URL as string)?.replace("/api", "") ||
  "http://localhost:5001";

const getImageUrl = (url?: string | null) => {
  if (!url) return "/placeholder.jpg";
  if (url.startsWith("http")) return url;
  return `${BACKEND_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const fmtDate = (d?: string) =>
  d
    ? new Date(d).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const RETURN_STATUS_LABELS: Record<string, string> = {
  requested: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  received: "Đã nhận hàng",
  inspected: "Đã kiểm tra",
  refunded: "Đã hoàn tiền",
  closed: "Đã đóng",
  cancelled: "Khách hủy",
};

const RETURN_STATUS_STYLES: Record<string, string> = {
  requested: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  rejected: "bg-rose-100 text-rose-700",
  received: "bg-violet-100 text-violet-700",
  inspected: "bg-indigo-100 text-indigo-700",
  refunded: "bg-emerald-100 text-emerald-700",
  closed: "bg-gray-100 text-gray-600",
  cancelled: "bg-gray-200 text-gray-700",
};

const INSPECTION_BADGE: Record<string, { label: string; cls: string }> = {
  good: { label: "🟢 Tốt", cls: "bg-emerald-100 text-emerald-700" },
  defective: { label: "🟡 Lỗi do shop", cls: "bg-amber-100 text-amber-700" },
  damaged_by_customer: {
    label: "🔴 Khách làm hỏng",
    cls: "bg-rose-100 text-rose-700",
  },
};

type Props = {
  returns: any[];
  isCodUnpaid: boolean;
  submitting: string | null;
  onReview: (returnId: number, decision: "approved" | "rejected") => void;
  onReceive: (returnId: number) => void;
  onInspect: (returnId: number) => void;
  onRefund: (returnId: number) => void;
  onClose: (returnId: number) => void;
};

export const AdminReturnsList = ({
  returns,
  isCodUnpaid,
  submitting,
  onReview,
  onReceive,
  onInspect,
  onRefund,
  onClose,
}: Props) => {
  if (returns.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50">
        <h2 className="font-black text-gray-800 uppercase text-sm tracking-wider flex items-center gap-2">
          <RotateCcw size={16} className="text-rose-500" /> Yêu cầu hoàn/trả
          hàng
        </h2>
      </div>
      <div className="p-5 space-y-5">
        {returns.map((ret) => (
          <div
            key={ret.orderReturnId}
            className="rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden"
          >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white px-5 py-3 border-b border-gray-100">
              <div>
                <p className="font-black text-gray-900 tracking-tight">
                  #{ret.requestCode}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Yêu cầu lúc {fmtDate(ret.requestedAt)}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase ${RETURN_STATUS_STYLES[ret.status]}`}
              >
                {RETURN_STATUS_LABELS[ret.status]}
              </span>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              <p className="text-sm text-gray-600">
                <span className="font-bold text-gray-800">Lý do:</span>{" "}
                {ret.reason}
              </p>

              {ret.items?.length > 0 && (
                <div className="space-y-2">
                  {ret.items.map((item: any) => {
                    const badge = item.inspectionResult
                      ? INSPECTION_BADGE[item.inspectionResult]
                      : null;
                    return (
                      <div
                        key={item.orderReturnItemId}
                        className="bg-gray-50 rounded-xl px-3 py-2 space-y-1"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                          <span className="font-bold text-gray-800">
                            {item.productName || `SP #${item.productId}`}
                          </span>
                          <span>— SL: {item.quantity}</span>
                          {item.reason && (
                            <span className="text-gray-500">| {item.reason}</span>
                          )}
                          {badge && (
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}
                            >
                              {badge.label}
                            </span>
                          )}
                          {item.refundAmount != null && item.inspectionResult && (
                            <span
                              className={`ml-auto text-xs font-black ${
                                Number(item.refundAmount) > 0
                                  ? "text-blue-600"
                                  : "text-gray-400"
                              }`}
                            >
                              Hoàn:{" "}
                              {Number(item.refundAmount).toLocaleString(
                                "vi-VN",
                              )}
                              đ
                            </span>
                          )}
                        </div>
                        {item.inspectionNote && (
                          <p className="text-[11px] text-gray-500 italic pl-1">
                            "{item.inspectionNote}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Ảnh khách gửi */}
              {ret.evidenceImages?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-1.5">
                    Ảnh khách gửi ({ret.evidenceImages.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ret.evidenceImages.map((img: string, idx: number) => (
                      <a
                        key={idx}
                        href={getImageUrl(img)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-100 hover:border-blue-400 transition-colors"
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

              {/* Block kết quả kiểm tra của admin */}
              {(ret.inspectedAt ||
                ret.inspectionNote ||
                ret.inspectionEvidenceImages?.length > 0) && (
                <div className="rounded-xl border-2 border-indigo-100 bg-indigo-50/40 p-3 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-xs font-black text-indigo-700 uppercase tracking-wide">
                      🔍 Kết quả kiểm tra (admin)
                    </p>
                    {ret.inspectedAt && (
                      <p className="text-[10px] text-indigo-500 font-medium">
                        {fmtDate(ret.inspectedAt)}
                      </p>
                    )}
                  </div>
                  {ret.inspectionNote && (
                    <p className="text-xs text-gray-700 italic">
                      "{ret.inspectionNote}"
                    </p>
                  )}
                  {ret.inspectionEvidenceImages?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-indigo-600 mb-1">
                        Ảnh test ({ret.inspectionEvidenceImages.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {ret.inspectionEvidenceImages.map(
                          (img: string, idx: number) => (
                            <a
                              key={idx}
                              href={getImageUrl(img)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-16 h-16 rounded-lg overflow-hidden border-2 border-indigo-200 hover:border-indigo-400 transition-colors"
                            >
                              <img
                                src={getImageUrl(img)}
                                alt={`inspect-${idx}`}
                                className="w-full h-full object-cover"
                              />
                            </a>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                  {ret.refundAmount != null && (
                    <p className="text-xs text-gray-600">
                      <span className="font-bold">Tổng tiền hoàn:</span>{" "}
                      <span
                        className={
                          Number(ret.refundAmount) > 0
                            ? "text-blue-600 font-black"
                            : "text-rose-600 font-black"
                        }
                      >
                        {Number(ret.refundAmount).toLocaleString("vi-VN")}đ
                      </span>
                      {Number(ret.refundAmount) === 0 && (
                        <span className="ml-2 text-[10px] uppercase font-bold text-rose-500">
                          (Không hoàn — khách làm hỏng)
                        </span>
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Action buttons theo trạng thái */}
              <div className="flex flex-wrap gap-2 pt-1">
                {ret.status === "requested" && (
                  <>
                    <button
                      onClick={() => onReview(ret.orderReturnId, "approved")}
                      disabled={!!submitting}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <CheckCircle size={13} /> Duyệt
                    </button>
                    <button
                      onClick={() => onReview(ret.orderReturnId, "rejected")}
                      disabled={!!submitting}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-black uppercase hover:bg-rose-700 disabled:opacity-60"
                    >
                      <XCircle size={13} /> Từ chối
                    </button>
                  </>
                )}
                {ret.status === "approved" && (
                  <button
                    onClick={() => onReceive(ret.orderReturnId)}
                    disabled={!!submitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-black uppercase hover:bg-violet-700 disabled:opacity-60"
                  >
                    <Truck size={13} /> Xác nhận nhận hàng
                  </button>
                )}
                {ret.status === "received" && (
                  <button
                    onClick={() => onInspect(ret.orderReturnId)}
                    disabled={!!submitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase hover:bg-indigo-700 disabled:opacity-60"
                  >
                    <Search size={13} /> Kiểm tra hàng
                  </button>
                )}
                {ret.status === "inspected" && !isCodUnpaid && (
                  <button
                    onClick={() => onRefund(ret.orderReturnId)}
                    disabled={!!submitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase hover:bg-blue-700 disabled:opacity-60"
                  >
                    <CreditCard size={13} /> Hoàn tiền{" "}
                    {ret.refundAmount != null
                      ? `(${Number(ret.refundAmount).toLocaleString("vi-VN")}đ)`
                      : ""}
                  </button>
                )}
                {ret.status === "inspected" && isCodUnpaid && (
                  <button
                    onClick={() => onClose(ret.orderReturnId)}
                    disabled={!!submitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-600 text-white rounded-xl text-xs font-black uppercase hover:bg-slate-700 disabled:opacity-60"
                  >
                    <AlertCircle size={13} /> Đóng yêu cầu
                  </button>
                )}
                {(ret.status === "refunded" || ret.status === "rejected") && (
                  <button
                    onClick={() => onClose(ret.orderReturnId)}
                    disabled={!!submitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-600 text-white rounded-xl text-xs font-black uppercase hover:bg-slate-700 disabled:opacity-60"
                  >
                    <AlertCircle size={13} /> Đóng yêu cầu
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
