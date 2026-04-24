import { Clock } from "lucide-react";
import { formatDateTime } from "../lib/orderFormatters";
import {
  ORDER_EVENT_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  PAYMENT_BADGE_STYLES,
  PAYMENT_STATUS_LABELS,
  RETURN_STATUS_LABELS,
  RETURN_STATUS_STYLES,
} from "../lib/orderLabels";

type Props = {
  timeline: any[];
};

export const OrderTimeline = ({ timeline }: Props) => {
  if (timeline.length === 0) return null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-black text-gray-900 uppercase italic flex items-center gap-2 mb-5">
        <Clock size={18} className="text-blue-600" /> Lịch sử xử lý
      </h3>
      <div className="space-y-4">
        {timeline.map((event: any, idx: number) => (
          <div key={event.orderEventId ?? idx} className="flex gap-3">
            <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-gray-900">
                {ORDER_EVENT_LABELS[event.eventType ?? event.type] ??
                  event.eventType ??
                  event.type ??
                  "Cập nhật trạng thái"}
              </p>
              {(event.fromStatus || event.toStatus) && (
                <p className="mt-1 flex items-center gap-1 flex-wrap">
                  {event.fromStatus && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${ORDER_STATUS_STYLES[event.fromStatus] ?? RETURN_STATUS_STYLES[event.fromStatus] ?? PAYMENT_BADGE_STYLES[event.fromStatus] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {ORDER_STATUS_LABELS[event.fromStatus] ??
                        RETURN_STATUS_LABELS[event.fromStatus] ??
                        PAYMENT_STATUS_LABELS[event.fromStatus] ??
                        event.fromStatus}
                    </span>
                  )}
                  {event.fromStatus && event.toStatus && (
                    <svg
                      className="w-2.5 h-2.5 text-gray-400 flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  )}
                  {event.toStatus && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${ORDER_STATUS_STYLES[event.toStatus] ?? RETURN_STATUS_STYLES[event.toStatus] ?? PAYMENT_BADGE_STYLES[event.toStatus] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {ORDER_STATUS_LABELS[event.toStatus] ??
                        RETURN_STATUS_LABELS[event.toStatus] ??
                        PAYMENT_STATUS_LABELS[event.toStatus] ??
                        event.toStatus}
                    </span>
                  )}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">
                {event.createdAt ? formatDateTime(event.createdAt) : ""}
              </p>
              {event.note && (
                <p className="text-xs text-gray-600 mt-1">{event.note}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
