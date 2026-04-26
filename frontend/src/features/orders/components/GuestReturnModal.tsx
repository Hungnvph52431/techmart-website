import { type ChangeEvent, useState } from "react";
import toast from "react-hot-toast";
import { Camera, ImageIcon, RotateCcw, Trash2, X } from "lucide-react";
import { orderService } from "@/services/order.service";
import type { OrderDetailView } from "@/types/order";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { formatCurrency } from "../lib/orderFormatters";

const BACKEND_URL =
  (import.meta.env.VITE_API_URL as string)?.replace("/api", "") ||
  "http://localhost:5001";

const getImageUrl = (url?: string | null) => {
  if (!url) return "/placeholder.jpg";
  if (url.startsWith("http")) return url;
  return `${BACKEND_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const RETURN_REASONS = [
  "Sản phẩm bị lỗi / hư hỏng",
  "Sản phẩm không đúng mô tả",
  "Giao sai sản phẩm / màu sắc / dung lượng",
  "Sản phẩm không như mong đợi",
  "Khác",
];

const formatVariantSummary = (item: {
  variantName?: string;
  sku?: string;
}) => {
  if (item.variantName && item.sku) {
    return `${item.variantName} • SKU: ${item.sku}`;
  }
  if (item.variantName) {
    return item.variantName;
  }
  if (item.sku) {
    return `SKU: ${item.sku}`;
  }
  return "";
};

type Props = {
  items: OrderDetailView["items"];
  orderCode: string;
  accessToken: string;
  returnedOrderDetailIds: Set<number>;
  onClose: () => void;
  onSubmitted: () => void;
};

export const GuestReturnModal = ({
  items,
  orderCode,
  accessToken,
  returnedOrderDetailIds,
  onClose,
  onSubmitted,
}: Props) => {
  useEscapeKey(onClose);
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [selected, setSelected] = useState<
    Record<number, { checked: boolean; quantity: number }>
  >(() =>
    Object.fromEntries(
      items.map((item) => [
        item.orderDetailId,
        {
          checked: !returnedOrderDetailIds.has(item.orderDetailId),
          quantity: item.quantity ?? 1,
        },
      ]),
    ),
  );
  const [submitting, setSubmitting] = useState(false);

  const finalReason = reason === "Khác" ? customReason.trim() : reason.trim();

  const handleAddImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setEvidenceFiles((prev) => [...prev, ...files].slice(0, 5));
    event.target.value = "";
  };

  const removeImage = (index: number) => {
    setEvidenceFiles((prev) => prev.filter((_, current) => current !== index));
  };

  const toggleItem = (orderDetailId: number) => {
    setSelected((prev) => ({
      ...prev,
      [orderDetailId]: {
        ...prev[orderDetailId],
        checked: !prev[orderDetailId]?.checked,
      },
    }));
  };

  const setQuantity = (orderDetailId: number, quantity: number) => {
    setSelected((prev) => ({
      ...prev,
      [orderDetailId]: {
        ...prev[orderDetailId],
        quantity,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!finalReason) {
      toast.error("Vui lòng chọn lý do hoàn hàng");
      return;
    }

    const returnItems = items
      .filter((item) => selected[item.orderDetailId]?.checked)
      .map((item) => ({
        orderDetailId: item.orderDetailId,
        quantity: selected[item.orderDetailId].quantity,
      }));

    if (returnItems.length === 0) {
      toast.error("Vui lòng chọn ít nhất một sản phẩm");
      return;
    }

    if (evidenceFiles.length === 0) {
      toast.error("Vui lòng tải lên ít nhất 1 ảnh bằng chứng");
      return;
    }

    try {
      setSubmitting(true);
      await orderService.createGuestReturn(
        orderCode,
        {
          reason: finalReason,
          customerNote: customerNote.trim() || undefined,
          items: returnItems,
          evidenceImages: evidenceFiles,
        },
        accessToken,
      );
      toast.success("Đã gửi yêu cầu hoàn hàng");
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 rounded-t-3xl">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
              <RotateCcw size={16} className="text-orange-500" />
              Yêu cầu hoàn hàng
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Chọn sản phẩm và cung cấp bằng chứng hoàn trả
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 transition-colors hover:bg-slate-100"
          >
            <X size={17} className="text-slate-400" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <p className="mb-2 text-sm font-bold text-slate-700">
              Sản phẩm cần hoàn trả
            </p>
            <div className="space-y-3">
              {items.map((item) => {
                const selectedState = selected[item.orderDetailId];
                const disabled = returnedOrderDetailIds.has(item.orderDetailId);
                return (
                  <label
                    key={item.orderDetailId}
                    className={`flex gap-3 rounded-2xl border p-3 ${
                      disabled
                        ? "border-gray-100 bg-gray-50 opacity-50"
                        : selectedState?.checked
                          ? "border-orange-300 bg-orange-50"
                          : "border-slate-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(selectedState?.checked)}
                      disabled={disabled}
                      onChange={() => toggleItem(item.orderDetailId)}
                      className="mt-1 h-4 w-4 rounded accent-orange-500"
                    />
                    <img
                      src={getImageUrl(item.productImage)}
                      alt={item.productName}
                      className="h-14 w-14 rounded-xl bg-slate-50 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">
                        {item.productName}
                      </p>
                      {formatVariantSummary(item) && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatVariantSummary(item)}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-3">
                        {selectedState?.checked && item.quantity > 1 ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                setQuantity(
                                  item.orderDetailId,
                                  Math.max(1, selectedState.quantity - 1),
                                );
                              }}
                              className="h-6 w-6 rounded border border-slate-300 bg-white text-slate-700"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-sm font-bold text-slate-800">
                              {selectedState.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                setQuantity(
                                  item.orderDetailId,
                                  Math.min(
                                    item.quantity,
                                    selectedState.quantity + 1,
                                  ),
                                );
                              }}
                              className="h-6 w-6 rounded border border-slate-300 bg-white text-slate-700"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">
                            Số lượng: {item.quantity}
                          </p>
                        )}
                        <span className="text-sm font-black text-orange-600">
                          {formatCurrency(item.price)}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-slate-700">
              Lý do hoàn trả
            </p>
            <div className="space-y-2">
              {RETURN_REASONS.map((item) => (
                <label
                  key={item}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-2.5 transition-colors ${
                    reason === item
                      ? "border-orange-400 bg-orange-50"
                      : "border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="guest-return-reason"
                    value={item}
                    checked={reason === item}
                    onChange={() => setReason(item)}
                    className="h-4 w-4 accent-orange-500"
                  />
                  <span className="text-sm text-slate-700">{item}</span>
                </label>
              ))}
            </div>
            {reason === "Khác" && (
              <textarea
                value={customReason}
                onChange={(event) => setCustomReason(event.target.value)}
                rows={2}
                placeholder="Nhập lý do cụ thể..."
                className="mt-2 w-full resize-none rounded-xl border-2 border-orange-300 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none"
              />
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-slate-700">
              Ghi chú thêm
            </p>
            <textarea
              value={customerNote}
              onChange={(event) => setCustomerNote(event.target.value)}
              rows={3}
              placeholder="Mô tả chi tiết tình trạng sản phẩm..."
              className="w-full resize-none rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm transition-colors focus:border-orange-400 focus:outline-none"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-slate-700">
              <Camera size={14} className="mr-1 inline text-orange-500" />
              Ảnh/video bằng chứng
            </p>
            <div className="flex flex-wrap gap-2">
              {evidenceFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="group relative h-20 w-20 overflow-hidden rounded-xl border-2 border-slate-200"
                >
                  {file.type.startsWith("video/") ? (
                    <video
                      src={URL.createObjectURL(file)}
                      className="h-full w-full object-cover"
                      muted
                    />
                  ) : (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`evidence-${index}`}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 size={16} className="text-white" />
                  </button>
                </div>
              ))}
              {evidenceFiles.length < 5 && (
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 transition-colors hover:border-orange-400">
                  <ImageIcon size={20} className="text-slate-400" />
                  <span className="mt-0.5 text-[10px] font-bold text-slate-400">
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

        <div className="sticky bottom-0 flex gap-3 border-t border-slate-100 bg-white px-6 pb-6 pt-4 rounded-b-3xl">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3 text-sm font-bold text-white transition-all hover:bg-orange-600 disabled:opacity-50"
          >
            <RotateCcw size={15} />
            {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
          </button>
        </div>
      </div>
    </div>
  );
};
