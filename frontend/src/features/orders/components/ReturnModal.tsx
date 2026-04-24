import { useState } from "react";
import toast from "react-hot-toast";
import {
  Camera,
  ImageIcon,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { orderService } from "@/services/order.service";
import {
  formatCurrency,
  formatOrderItemVariantSummary,
} from "../lib/orderFormatters";
import { RETURN_REASONS } from "../lib/orderLabels";

type Props = {
  items: any[];
  order: any;
  orderId: number;
  returnedOrderDetailIds?: Set<number>;
  refundedOrderDetailIds?: Set<number>;
  rejectedOrderDetailIds?: Set<number>;
  onClose: () => void;
  onSubmitted: () => void;
};

export const ReturnModal = ({
  items,
  order,
  orderId,
  returnedOrderDetailIds = new Set(),
  refundedOrderDetailIds = new Set(),
  rejectedOrderDetailIds: _rejectedOrderDetailIds = new Set(),
  onClose,
  onSubmitted,
}: Props) => {
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [selected, setSelected] = useState<
    Record<number, { checked: boolean; quantity: number }>
  >(() =>
    Object.fromEntries(
      items.map((it) => [
        it.orderDetailId,
        {
          checked: !returnedOrderDetailIds.has(it.orderDetailId),
          quantity: it.quantity ?? 1,
        },
      ]),
    ),
  );
  const [submitting, setSubmitting] = useState(false);

  const subtotal = Number(order?.subtotal ?? 0);
  const discountAmount = Number(
    order?.discountAmount ?? order?.discount_amount ?? 0,
  );

  const finalReason = reason === "Khác" ? customReason : reason;

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setEvidenceFiles((prev) => [...prev, ...files].slice(0, 5));
    e.target.value = "";
  };

  const removeImage = (idx: number) =>
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== idx));
  const toggleItem = (id: number) =>
    setSelected((p) => ({ ...p, [id]: { ...p[id], checked: !p[id].checked } }));
  const setQty = (id: number, qty: number) =>
    setSelected((p) => ({ ...p, [id]: { ...p[id], quantity: qty } }));

  const canSubmit =
    finalReason.trim().length > 0 && evidenceFiles.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!finalReason.trim()) {
      toast.error("Vui lòng chọn lý do hoàn hàng");
      return;
    }
    if (evidenceFiles.length === 0) {
      toast.error(
        "Vui lòng upload ít nhất 1 ảnh/video bằng chứng sản phẩm lỗi",
      );
      return;
    }
    const returnItems = items
      .filter((it) => selected[it.orderDetailId]?.checked)
      .map((it) => ({
        orderDetailId: it.orderDetailId,
        quantity: selected[it.orderDetailId].quantity,
      }));
    if (returnItems.length === 0) {
      toast.error("Vui lòng chọn ít nhất một sản phẩm");
      return;
    }
    try {
      setSubmitting(true);
      await orderService.createReturn(orderId, {
        reason: finalReason.trim(),
        customerNote: customerNote.trim() || undefined,
        items: returnItems,
        evidenceImages: evidenceFiles.length > 0 ? evidenceFiles : undefined,
      });
      toast.success("Đã gửi yêu cầu hoàn hàng! Chúng tôi sẽ phản hồi sớm.");
      onSubmitted();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Không thể gửi yêu cầu, vui lòng thử lại",
      );
    } finally {
      setSubmitting(false);
    }
  };

  let totalEstimatedRefund = 0;
  let totalOriginalRefund = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-slate-100 rounded-t-3xl z-10">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <RotateCcw size={16} className="text-orange-500" /> Yêu cầu
              hoàn/trả hàng
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Chọn sản phẩm và lý do hoàn trả
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={17} className="text-slate-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-slate-700">
                Sản phẩm cần hoàn trả
              </p>
              {discountAmount > 0 && (
                <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                  Đơn hàng có Voucher
                </span>
              )}
            </div>
            <div className="space-y-3">
              {items.map((item) => {
                const id = item.orderDetailId;
                const name = item.productName ?? `Sản phẩm #${id}`;
                const img = item.productImage ?? "";
                const variantSummary = formatOrderItemVariantSummary(item);
                const maxQty = item.quantity ?? 1;
                const price = Number(item.price ?? 0);
                const sel = selected[id];
                const isReturned = returnedOrderDetailIds.has(id);

                const selectedQty = sel?.checked ? sel.quantity : 0;
                const itemBaseTotal = price * selectedQty;

                let itemRefund = itemBaseTotal;
                let itemDiscountShare = 0;

                if (subtotal > 0 && discountAmount > 0 && sel?.checked) {
                  const ratio = itemBaseTotal / subtotal;
                  itemDiscountShare = ratio * discountAmount;
                  itemRefund = itemBaseTotal - itemDiscountShare;
                }

                totalEstimatedRefund += itemRefund;
                totalOriginalRefund += itemBaseTotal;

                return (
                  <label
                    key={id}
                    className={`flex items-start gap-3 p-3 rounded-2xl border-2 transition-colors ${
                      isReturned
                        ? "border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed"
                        : sel?.checked
                          ? "border-orange-400 bg-orange-50 cursor-pointer"
                          : "border-slate-100 bg-slate-50 cursor-pointer"
                    }`}
                  >
                    <div className="pt-3">
                      <input
                        type="checkbox"
                        checked={sel?.checked ?? false}
                        onChange={() => !isReturned && toggleItem(id)}
                        disabled={isReturned}
                        className="w-4 h-4 accent-orange-500 flex-shrink-0 disabled:cursor-not-allowed"
                      />
                    </div>

                    <img
                      src={img || "/placeholder.jpg"}
                      alt={name}
                      className="w-14 h-14 mt-1 rounded-xl object-cover bg-white flex-shrink-0 border border-slate-100"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.onerror = null;
                        el.src = "/placeholder.jpg";
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800 line-clamp-2">
                          {name}
                        </p>
                        {isReturned && (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide flex-shrink-0 ${
                              refundedOrderDetailIds.has(id)
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-300 text-slate-600"
                            }`}
                          >
                            {refundedOrderDetailIds.has(id)
                              ? "Đã hoàn hàng"
                              : "Đang hoàn hàng"}
                          </span>
                        )}
                      </div>
                      {variantSummary && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {variantSummary}
                        </p>
                      )}

                      <div className="mt-2 flex items-end justify-between">
                        {sel?.checked && maxQty > 1 ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setQty(id, Math.max(1, sel.quantity - 1));
                              }}
                              className="w-6 h-6 rounded border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-100"
                            >
                              −
                            </button>
                            <span className="w-6 text-center text-sm font-bold text-slate-800">
                              {sel.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setQty(
                                  id,
                                  Math.min(maxQty, sel.quantity + 1),
                                );
                              }}
                              className="w-6 h-6 rounded border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-100"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">
                            Số lượng: {maxQty}
                          </p>
                        )}

                        {sel?.checked && (
                          <div className="text-right">
                            {itemDiscountShare > 0 && (
                              <p className="text-xs text-slate-400 line-through mb-0.5">
                                {formatCurrency(itemBaseTotal)}
                              </p>
                            )}
                            <p className="text-sm font-black text-orange-600">
                              + {formatCurrency(itemRefund)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">
              Lý do hoàn trả <span className="text-rose-500">*</span>
            </p>
            <div className="space-y-2">
              {RETURN_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-colors ${reason === r ? "border-orange-400 bg-orange-50" : "border-slate-100 hover:border-slate-200"}`}
                >
                  <input
                    type="radio"
                    name="return-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm text-slate-700">{r}</span>
                </label>
              ))}
            </div>
            {reason === "Khác" && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Nhập lý do cụ thể..."
                rows={2}
                className="mt-2 w-full border-2 border-orange-300 rounded-xl px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none resize-none"
              />
            )}
          </div>

          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">
              Ghi chú thêm{" "}
              <span className="text-slate-400 font-normal">
                (không bắt buộc)
              </span>
            </p>
            <textarea
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="Mô tả chi tiết tình trạng sản phẩm..."
              rows={3}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none resize-none transition-colors"
            />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">
              <Camera size={14} className="inline mr-1 text-orange-500" />
              Ảnh/Video bằng chứng <span className="text-rose-500">*</span>{" "}
              <span className="text-slate-400 font-normal">
                (tối đa 5 file)
              </span>
            </p>
            {evidenceFiles.length === 0 && (
              <p className="text-xs text-rose-500 mb-2 font-medium">
                Bạn cần upload ít nhất 1 ảnh/video chụp sản phẩm lỗi để gửi yêu
                cầu hoàn trả.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {evidenceFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="relative group w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-200"
                >
                  {file.type.startsWith("video/") ? (
                    <video
                      src={URL.createObjectURL(file)}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`evidence-${idx}`}
                      className="w-full h-full object-cover"
                    />
                  )}
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
                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-orange-400 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  <ImageIcon size={20} className="text-slate-400" />
                  <span className="text-[10px] text-slate-400 font-bold mt-0.5">
                    Thêm ảnh
                  </span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleAddImages}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-100 rounded-b-3xl">
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 space-y-1.5">
            {discountAmount > 0 &&
              totalOriginalRefund !== totalEstimatedRefund && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Giá gốc:</span>
                    <span className="text-sm text-slate-400 line-through">
                      {formatCurrency(totalOriginalRefund)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Giảm giá voucher:
                    </span>
                    <span className="text-sm font-semibold text-green-600">
                      −{" "}
                      {formatCurrency(
                        totalOriginalRefund - totalEstimatedRefund,
                      )}
                    </span>
                  </div>
                </>
              )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600">
                Hoàn tiền dự kiến:
              </span>
              <span className="text-lg font-black text-orange-600">
                {formatCurrency(totalEstimatedRefund)}
              </span>
            </div>
          </div>

          <div className="flex gap-3 px-6 pb-6 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 py-3 rounded-2xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={15} />
              {submitting
                ? "Đang gửi..."
                : evidenceFiles.length === 0
                  ? "Cần upload ảnh bằng chứng"
                  : "Gửi yêu cầu"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
