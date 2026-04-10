import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";

interface RepayButtonProps {
  orderId: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
}

export const RepayButton = ({
  orderId,
  paymentMethod,
  paymentStatus,
  orderStatus,
}: RepayButtonProps) => {
  const [loading, setLoading] = useState(false);

  const canRepay =
    paymentMethod === "vnpay" &&
    paymentStatus !== "paid" &&
    orderStatus !== "cancelled";

  if (!canRepay) return null;

  const handleRepay = async () => {
    try {
      setLoading(true);
      const { data } = await api.post("/payment/vnpay/repay", { orderId });
      window.location.href = data.paymentUrl;
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Không thể tạo link thanh toán",
      );
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRepay}
      disabled={loading}
      className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <RefreshCw size={16} />
      )}
      {loading ? "Đang chuyển hướng..." : "Thanh toán lại"}
    </button>
  );
};
