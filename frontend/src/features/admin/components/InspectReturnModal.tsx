import { type ChangeEvent, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ImageIcon,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { adminOrderService } from "@/services/admin/order.service";
import { useEscapeKey } from "@/hooks/useEscapeKey";

const BACKEND_URL =
  (import.meta.env.VITE_API_URL as string)?.replace("/api", "") ||
  "http://localhost:5001";

const getImageUrl = (url?: string | null) => {
  if (!url) return "/placeholder.jpg";
  if (url.startsWith("http")) return url;
  return `${BACKEND_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount,
  );

type InspectionResult = "good" | "defective" | "damaged_by_customer";

type ItemState = {
  result: InspectionResult | null;
  note: string;
  refundAmount: number; // số tiền hoàn cho item này (admin có thể override)
};

type Props = {
  orderId: number;
  returnId: number;
  items: Array<{
    orderReturnItemId: number;
    productId: number;
    productName?: string;
    variantName?: string;
    sku?: string;
    productImage?: string;
    price?: number;
    quantity: number;
  }>;
  onClose: () => void;
  onDone: () => void;
};

const RESULT_OPTIONS: Array<{
  value: InspectionResult;
  label: string;
  desc: string;
  color: string;
  icon: typeof CheckCircle2;
}> = [
  {
    value: "good",
    label: "Tốt",
    desc: "Sản phẩm còn nguyên vẹn — cộng lại kho, hoàn tiền đầy đủ",
    color: "emerald",
    icon: CheckCircle2,
  },
  {
    value: "defective",
    label: "Lỗi do shop / NSX",
    desc: "Lỗi từ nhà sản xuất — KHÔNG cộng kho, hoàn tiền đầy đủ",
    color: "amber",
    icon: AlertTriangle,
  },
  {
    value: "damaged_by_customer",
    label: "Khách làm hỏng",
    desc: "Hỏng do sử dụng sai — KHÔNG cộng kho, KHÔNG hoàn tiền (mặc định)",
    color: "rose",
    icon: XCircle,
  },
];

export const InspectReturnModal = ({
  orderId,
  returnId,
  items,
  onClose,
  onDone,
}: Props) => {
  useEscapeKey(onClose);
  const [states, setStates] = useState<Record<number, ItemState>>(() =>
    Object.fromEntries(
      items.map((it) => [
        it.orderReturnItemId,
        { result: null, note: "", refundAmount: 0 },
      ]),
    ),
  );
  const [overallNote, setOverallNote] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const setItemResult = (id: number, result: InspectionResult) => {
    const item = items.find((it) => it.orderReturnItemId === id);
    const fullRefund = (item?.price ?? 0) * (item?.quantity ?? 1);
    setStates((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        result,
        // auto-fill refund: damaged_by_customer = 0, khác = full
        refundAmount:
          result === "damaged_by_customer" ? 0 : fullRefund,
      },
    }));
  };

  const setItemNote = (id: number, note: string) => {
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], note } }));
  };

  const setItemRefund = (id: number, amount: number) => {
    setStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], refundAmount: Math.max(0, amount) },
    }));
  };

  const handleAddImages = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setEvidenceFiles((prev) => [...prev, ...files].slice(0, 5));
    e.target.value = "";
  };

  const removeImage = (idx: number) =>
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== idx));

  const totalRefund = items.reduce(
    (sum, it) => sum + (states[it.orderReturnItemId]?.refundAmount ?? 0),
    0,
  );
  const allChecked = items.every(
    (it) => states[it.orderReturnItemId]?.result != null,
  );
  const willAutoReject = allChecked && totalRefund === 0;
  const hasDamagedItem = items.some(
    (it) => states[it.orderReturnItemId]?.result === "damaged_by_customer",
  );
  // Bắt buộc note khi có sp damaged_by_customer (cần ghi chi tiết để trả lại khách)
  const damagedItemsMissingNote = items.some(
    (it) =>
      states[it.orderReturnItemId]?.result === "damaged_by_customer" &&
      !states[it.orderReturnItemId]?.note.trim(),
  );

  const canSubmit =
    allChecked && !damagedItemsMissingNote && !submitting;

  const handleSubmit = async () => {
    if (!allChecked) {
      toast.error("Vui lòng kiểm tra tất cả sản phẩm");
      return;
    }
    if (damagedItemsMissingNote) {
      toast.error("Sản phẩm 'khách làm hỏng' bắt buộc phải có ghi chú chi tiết");
      return;
    }

    try {
      setSubmitting(true);
      await adminOrderService.inspectReturn(orderId, returnId, {
        inspectionNote: overallNote.trim() || undefined,
        inspectionEvidenceImages:
          evidenceFiles.length > 0 ? evidenceFiles : undefined,
        items: items.map((it) => ({
          orderReturnItemId: it.orderReturnItemId,
          inspectionResult: states[it.orderReturnItemId].result!,
          inspectionNote:
            states[it.orderReturnItemId].note.trim() || undefined,
          refundAmount: states[it.orderReturnItemId].refundAmount,
        })),
      });

      if (willAutoReject) {
        toast.success(
          "Đã ghi nhận kiểm tra. Phiếu hoàn bị từ chối (tất cả do khách làm hỏng).",
        );
      } else {
        toast.success("Đã lưu kết quả kiểm tra. Tiếp tục sang bước hoàn tiền.");
      }
      onDone();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Không thể lưu kết quả, vui lòng thử lại",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 rounded-t-3xl">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Kiểm tra hàng hoàn trả
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Đánh giá tình trạng từng sản phẩm để quyết định hoàn tiền và cộng kho
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 transition-colors hover:bg-slate-100"
          >
            <X size={17} className="text-slate-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Items list */}
          {items.map((item) => {
            const st = states[item.orderReturnItemId];
            const fullPrice = (item.price ?? 0) * item.quantity;
            return (
              <div
                key={item.orderReturnItemId}
                className="rounded-2xl border-2 border-slate-100 p-4 space-y-3"
              >
                {/* Sản phẩm */}
                <div className="flex items-start gap-3">
                  <img
                    src={getImageUrl(item.productImage)}
                    alt={item.productName ?? ""}
                    className="h-16 w-16 rounded-xl object-cover bg-slate-50 border border-slate-100 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800">
                      {item.productName ?? `SP #${item.productId}`}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-slate-500">
                      {item.variantName && <span>{item.variantName}</span>}
                      {item.sku && <span>SKU: {item.sku}</span>}
                      <span>SL: {item.quantity}</span>
                      {item.price != null && (
                        <span>Giá: {formatCurrency(fullPrice)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3 lựa chọn kết quả */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {RESULT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const selected = st?.result === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setItemResult(item.orderReturnItemId, opt.value)
                        }
                        className={`text-left rounded-xl border-2 p-3 transition-all ${
                          selected
                            ? `border-${opt.color}-400 bg-${opt.color}-50`
                            : "border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon
                            size={16}
                            className={
                              selected
                                ? `text-${opt.color}-600`
                                : "text-slate-400"
                            }
                          />
                          <span
                            className={`text-sm font-bold ${
                              selected
                                ? `text-${opt.color}-700`
                                : "text-slate-700"
                            }`}
                          >
                            {opt.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          {opt.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Note + refund per-item */}
                {st?.result && (
                  <div className="space-y-2 pt-2 border-t border-slate-50">
                    <textarea
                      value={st.note}
                      onChange={(e) =>
                        setItemNote(item.orderReturnItemId, e.target.value)
                      }
                      placeholder={
                        st.result === "damaged_by_customer"
                          ? "Bắt buộc: ghi rõ tình trạng (vd: vỡ màn hình, vào nước, có vết va đập...)"
                          : "Ghi chú (không bắt buộc)"
                      }
                      rows={2}
                      className={`w-full text-sm rounded-xl border-2 px-3 py-2 resize-none focus:outline-none ${
                        st.result === "damaged_by_customer" && !st.note.trim()
                          ? "border-rose-300 focus:border-rose-400"
                          : "border-slate-200 focus:border-blue-400"
                      }`}
                    />

                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs text-slate-500">
                        Số tiền hoàn (có thể chỉnh):
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={fullPrice}
                        value={st.refundAmount}
                        onChange={(e) =>
                          setItemRefund(
                            item.orderReturnItemId,
                            Number(e.target.value),
                          )
                        }
                        className="w-32 text-right text-sm font-bold text-slate-800 rounded-lg border-2 border-slate-200 px-3 py-1.5 focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Note tổng */}
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-700">
              Ghi chú tổng (kết luận chung)
            </p>
            <textarea
              value={overallNote}
              onChange={(e) => setOverallNote(e.target.value)}
              placeholder="Tóm tắt kết quả kiểm tra..."
              rows={2}
              className="w-full text-sm rounded-xl border-2 border-slate-200 px-3 py-2 resize-none focus:border-blue-400 focus:outline-none"
            />
          </div>

          {/* Ảnh bằng chứng */}
          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-700">
              <Camera size={14} className="inline mr-1 text-blue-500" /> Ảnh
              bằng chứng kiểm tra{" "}
              <span className="text-slate-400 font-normal">(tối đa 5 ảnh)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {evidenceFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="relative group w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-200"
                >
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`evidence-${idx}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <Trash2 size={16} className="text-white" />
                  </button>
                </div>
              ))}
              {evidenceFiles.length < 5 && (
                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  <ImageIcon size={20} className="text-slate-400" />
                  <span className="text-[10px] text-slate-400 font-bold mt-0.5">
                    Thêm ảnh
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleAddImages}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 rounded-b-3xl">
          {/* Tổng refund */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600">
                Tổng tiền hoàn dự kiến:
              </span>
              <span
                className={`text-lg font-black ${
                  willAutoReject ? "text-rose-600" : "text-blue-600"
                }`}
              >
                {formatCurrency(totalRefund)}
              </span>
            </div>
            {willAutoReject && (
              <p className="text-xs text-rose-600 mt-1 font-medium">
                ⚠ Tất cả sp đều do khách làm hỏng → phiếu hoàn sẽ tự bị TỪ CHỐI.
                Cần liên hệ khách trả lại hàng (xử lý ngoài hệ thống).
              </p>
            )}
            {hasDamagedItem && !willAutoReject && (
              <p className="text-xs text-amber-600 mt-1 font-medium">
                ⚠ Có sp do khách làm hỏng — chỉ refund phần hợp lệ. Liên hệ
                khách về sp bị từ chối.
              </p>
            )}
          </div>

          <div className="flex gap-3 px-6 pb-6 pt-4">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting
                ? "Đang lưu..."
                : !allChecked
                  ? "Cần kiểm tra tất cả sp"
                  : damagedItemsMissingNote
                    ? "Cần ghi rõ lý do hỏng"
                    : "Xác nhận kết quả kiểm tra"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
