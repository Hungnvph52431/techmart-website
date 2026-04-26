import { AlertTriangle, X } from "lucide-react";
import { useEscapeKey } from "@/hooks/useEscapeKey";

type Props = {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Custom modal thay cho window.confirm() mặc định của browser.
 * Dùng khi cần xác nhận hành động có rủi ro (xóa, đóng, ...).
 */
export const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  variant = "default",
  onConfirm,
  onCancel,
}: Props) => {
  useEscapeKey(() => {
    if (open) onCancel();
  });

  if (!open) return null;

  const danger = variant === "danger";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3 mb-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                danger ? "bg-rose-100" : "bg-blue-100"
              }`}
            >
              <AlertTriangle
                size={20}
                className={danger ? "text-rose-600" : "text-blue-600"}
              />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-gray-900">{title}</h3>
              {message && (
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                  {message}
                </p>
              )}
            </div>
            <button
              onClick={onCancel}
              className="p-1 hover:bg-slate-100 rounded-lg flex-shrink-0"
            >
              <X size={16} className="text-slate-400" />
            </button>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition-all ${
              danger
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
