import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  ArrowRight,
  ShoppingBag,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import api from "@/services/api";
import toast from "react-hot-toast";
import {
  applyPendingCheckoutCleanup,
  consumePendingCheckoutCleanup,
} from "@/features/orders/lib/checkoutSuccessCleanup";

type ResultStatus = "loading" | "success" | "cancel" | "failed" | "error";

const RESULT_CONFIG: Record<
  Exclude<ResultStatus, "loading">,
  {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    color: string;
    bg: string;
  }
> = {
  success: {
    icon: (
      <CheckCircle className="w-20 h-20 text-emerald-500" strokeWidth={1.5} />
    ),
    title: "Thanh toán thành công!",
    subtitle:
      "Đơn hàng của bạn đã được xác nhận. Chúng tôi sẽ xử lý và giao hàng sớm nhất.",
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
  },
  cancel: {
    icon: <XCircle className="w-20 h-20 text-rose-400" strokeWidth={1.5} />,
    title: "Đã hủy thanh toán",
    subtitle:
      "Giao dịch đã bị hủy. Đơn hàng vẫn còn hiệu lực, bạn có thể thanh toán lại trong vòng 10 phút.",
    color: "text-rose-600",
    bg: "bg-rose-50 border-rose-200",
  },
  failed: {
    icon: <XCircle className="w-20 h-20 text-rose-500" strokeWidth={1.5} />,
    title: "Thanh toán thất bại",
    subtitle:
      "Giao dịch không thành công. Vui lòng kiểm tra lại thông tin thẻ hoặc thử thanh toán lại.",
    color: "text-rose-600",
    bg: "bg-rose-50 border-rose-200",
  },
  error: {
    icon: <XCircle className="w-20 h-20 text-gray-400" strokeWidth={1.5} />,
    title: "Có lỗi xảy ra",
    subtitle:
      "Đã xảy ra lỗi trong quá trình xử lý. Vui lòng liên hệ hỗ trợ nếu tiền đã bị trừ.",
    color: "text-gray-600",
    bg: "bg-gray-50 border-gray-200",
  },
};

const REPAY_WINDOW_MINUTES = 10;
const SUCCESS_REDIRECT_DELAY_MS = 1600;

function DigitBlock({ value, label }: { value: string; label: string }) {
  const [prev, setPrev] = useState(value);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (value !== prev) {
      setFlipping(true);
      const t = setTimeout(() => {
        setPrev(value);
        setFlipping(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [value, prev]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-20 perspective">
        <div className="absolute inset-0 rounded-xl bg-slate-900 translate-y-0.5 translate-x-0.5" />

        <div
          className={`relative w-full h-full rounded-xl bg-gradient-to-b from-slate-700 to-slate-800 border border-slate-600/50 flex items-center justify-center overflow-hidden shadow-xl
            transition-transform duration-300 ease-in-out ${flipping ? "scale-y-90 opacity-80" : "scale-y-100 opacity-100"}`}
          style={{ transformOrigin: "top" }}
        >
          <div className="absolute inset-x-0 top-0 h-1/2 bg-white/5 rounded-t-xl" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-black/40" />

          <span
            className="font-black text-4xl text-white tabular-nums tracking-tight select-none"
            style={{
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
            }}
          >
            {flipping ? prev : value}
          </span>
        </div>
      </div>

      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </span>
    </div>
  );
}

function CountdownWidget({
  secondsLeft,
  totalSeconds,
  repaying,
  onRepay,
}: {
  secondsLeft: number;
  totalSeconds: number;
  repaying: boolean;
  onRepay: () => void;
}) {
  const urgent = secondsLeft <= 60;
  const pct = Math.max(0, (secondsLeft / totalSeconds) * 100);
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6 space-y-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Thời gian thanh toán lại
        </p>
        <span
          className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
            urgent
              ? "bg-red-50 text-red-500 border border-red-200"
              : "bg-blue-50 text-blue-500 border border-blue-200"
          }`}
        >
          {urgent ? "⚡ Sắp hết" : "Còn hiệu lực"}
        </span>
      </div>

      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <DigitBlock value={mm[0]} label="PHÚT" />
          <DigitBlock value={mm[1]} label="PHÚT" />
          <span className="text-4xl font-black text-slate-300 pb-8">:</span>
          <DigitBlock value={ss[0]} label="GIÂY" />
          <DigitBlock value={ss[1]} label="GIÂY" />
        </div>

        <div className="w-full max-w-[240px] h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${urgent ? "bg-red-400" : "bg-blue-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <button
        onClick={onRepay}
        disabled={repaying}
        className={`relative overflow-hidden flex items-center justify-center gap-2.5 w-full py-4 rounded-xl font-black uppercase tracking-wider text-sm text-white transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg
          ${
            urgent
              ? "bg-gradient-to-r from-red-500 to-rose-500 shadow-red-200 hover:from-red-600 hover:to-rose-600"
              : "bg-gradient-to-r from-blue-600 to-blue-500 shadow-blue-200 hover:from-blue-700 hover:to-blue-600"
          }`}
      >
        {!repaying && (
          <span className="absolute inset-0 bg-white/10 -skew-x-12 translate-x-[-200%] hover:translate-x-[200%] transition-transform duration-700" />
        )}
        {repaying ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <RefreshCw size={16} />
        )}
        {repaying ? "Đang chuyển hướng..." : "Thanh toán lại qua VNPay"}
      </button>
    </div>
  );
}

function ExpiredBanner() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50 px-6 py-6 text-center space-y-2">
      <p className="font-black text-rose-600 text-lg">
        Đã hết thời gian thanh toán lại
      </p>
      <p className="text-sm text-rose-500/80">
        Vui lòng liên hệ hỗ trợ hoặc tạo đơn hàng mới.
      </p>
    </div>
  );
}

export const PaymentResultPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [repaying, setRepaying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0); // khởi tạo = 0
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const statusParam = (searchParams.get("status") as ResultStatus) || "error";
  const orderId = searchParams.get("orderId");
  const orderCode = searchParams.get("orderCode");

  const canRepay =
    (statusParam === "cancel" || statusParam === "failed") && !!orderId;
  const shouldAutoRedirectToOrder =
    statusParam === "success" && !!orderId;

  const getStorageKey = (id: string) => `repay_expires_${id}`;

  // ==================== EFFECT 1: Khởi tạo thời gian hết hạn ====================
  useEffect(() => {
    if (!canRepay || !orderId) {
      if (orderId) localStorage.removeItem(getStorageKey(orderId));
      setSecondsLeft(0);
      return;
    }

    const key = getStorageKey(orderId);
    let storedExpires = localStorage.getItem(key);

    // Nếu chưa có thời gian (đơn mới) → tạo mới 10 phút
    if (!storedExpires) {
      const expiresAt = Date.now() + REPAY_WINDOW_MINUTES * 60 * 1000;
      localStorage.setItem(key, expiresAt.toString());
      storedExpires = expiresAt.toString();
    }

    const expiresAt = parseInt(storedExpires, 10);
    const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));

    setSecondsLeft(remaining);
  }, [canRepay, orderId]);

  // ==================== EFFECT 2: Chạy countdown timer ====================
  useEffect(() => {
    if (secondsLeft <= 0 || !orderId) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          localStorage.removeItem(getStorageKey(orderId));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [secondsLeft, orderId]);

  useEffect(() => {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }

    if (!shouldAutoRedirectToOrder || !orderId) {
      return;
    }

    redirectTimerRef.current = setTimeout(() => {
      navigate(`/orders/${orderId}`, { replace: true });
    }, SUCCESS_REDIRECT_DELAY_MS);

    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [navigate, orderId, shouldAutoRedirectToOrder]);

  // Effect xử lý success + animation
  useEffect(() => {
    if (statusParam === "success") {
      const cleanup = consumePendingCheckoutCleanup(orderId);
      if (cleanup) {
        applyPendingCheckoutCleanup(cleanup);
      }
    }
    const timeout = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timeout);
  }, [orderId, statusParam]);

  const handleRepay = async () => {
    if (!orderId || secondsLeft <= 0) return;

    try {
      setRepaying(true);
      const { data } = await api.post("/payment/vnpay/repay", {
        orderId: Number(orderId),
      });
      window.location.href = data.paymentUrl;
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Không thể tạo lại link thanh toán",
      );
      setRepaying(false);
    }
  };

  const displayStatus: Exclude<ResultStatus, "loading"> =
    statusParam === "loading" ? "error" : statusParam;

  const config = RESULT_CONFIG[displayStatus];
  const expired = secondsLeft <= 0;

  return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
        <div
          className={`w-full max-w-md text-center transition-all duration-500 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div className="flex items-center justify-center gap-3 mb-4 text-left">
            <div className="shrink-0">{config.icon}</div>

            <div>
              <h1
                className={`text-xl font-black ${config.color} leading-tight`}
              >
                {config.title}
              </h1>
              <p className="text-gray-500 text-sm leading-tight">
                {config.subtitle}
              </p>
            </div>
          </div>

          {(orderId || orderCode) && (
            <div
              className={`inline-flex flex-col items-center gap-1 px-4 py-3 rounded-xl border ${config.bg} mb-5`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Mã đơn hàng
              </p>
              <p className={`font-black text-base font-mono ${config.color}`}>
                #{orderCode || orderId}
              </p>
            </div>
          )}

          {shouldAutoRedirectToOrder && (
            <p className="mb-4 text-sm font-semibold text-emerald-600">
              Đang chuyển tới chi tiết đơn hàng...
            </p>
          )}

          <div className="space-y-2">
            {canRepay && orderId && (
              <div>
                {!expired ? (
                  <CountdownWidget
                    secondsLeft={secondsLeft}
                    totalSeconds={REPAY_WINDOW_MINUTES * 60}
                    repaying={repaying}
                    onRepay={handleRepay}
                  />
                ) : (
                  <ExpiredBanner />
                )}
              </div>
            )}

            {(statusParam === "success" ||
              statusParam === "cancel" ||
              statusParam === "failed") &&
              orderId && (
                <Link
                  to={`/orders/${orderId}`}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800"
                >
                  <ShoppingBag size={14} />
                  Xem chi tiết
                  <ArrowRight size={14} />
                </Link>
              )}

            <Link
              to="/"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};
