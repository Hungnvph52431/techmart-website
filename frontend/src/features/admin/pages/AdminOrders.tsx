import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import toast from "react-hot-toast";
import { useOrderStore } from "@/store/orderStore";
import { Order, OrderStatus } from "@/types/order";

const statusLabels: Record<OrderStatus, string> = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  processing: "Đang xử lý",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
  returned: "Đã trả hàng",
};

const statusColors: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipping: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  returned: "bg-gray-100 text-gray-800",
};

const paymentLabels: Record<Order["paymentStatus"], string> = {
  pending: "Chưa thanh toán",
  paid: "Đã thanh toán",
  failed: "Thanh toán thất bại",
  refunded: "Đã hoàn tiền",
};

const statusFlow: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipping",
  "delivered",
];

export default function AdminOrders() {
  const { orders, loading, error, fetchAllOrders, updateStatus } =
    useOrderStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  const handleStatusChange = async (
    orderId: number,
    newStatus: OrderStatus,
  ) => {
    const order = orders.find((o) => o.orderId === orderId);
    if (!order) return;

    const currentIndex = statusFlow.indexOf(order.status as OrderStatus);
    const nextIndex = statusFlow.indexOf(newStatus);

    if (newStatus === "cancelled") {
      if (order.status !== "pending") {
        toast.error("Chỉ có thể hủy đơn khi đang ở trạng thái 'Chờ xử lý'");
        return;
      }
    } else if (nextIndex !== currentIndex + 1) {
      toast.error(
        "Phải cập nhật trạng thái theo thứ tự: " +
          statusFlow.map((s) => statusLabels[s]).join(" → "),
      );
      return;
    }

    if (
      !confirm(`Xác nhận đổi trạng thái thành "${statusLabels[newStatus]}"?`)
    ) {
      return;
    }

    const success = await updateStatus(orderId, newStatus);
    if (success) {
      toast.success(`Đã cập nhật: ${statusLabels[newStatus]}`);
    } else {
      toast.error("Cập nhật thất bại");
    }
  };

  const getAllowedNextStatus = (current: OrderStatus): OrderStatus[] => {
    const currentIndex = statusFlow.indexOf(current);
    if (currentIndex === -1 || currentIndex >= statusFlow.length - 1) {
      return [];
    }
    return [statusFlow[currentIndex + 1]];
  };

  const filteredOrders = orders.filter((order) =>
    filter === "all" ? true : order.status === filter,
  );

  const handleViewDetail = (orderId: number) => {
    navigate(`/admin/orders/${orderId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-lg text-gray-600 animate-pulse">Đang tải...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-600">
        {error}
        <button
          onClick={() => fetchAllOrders()}
          className="ml-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Quản lý đơn hàng
        </h1>
        <div className="text-sm text-gray-600">
          Hiển thị: <strong>{filteredOrders.length}</strong> / Tổng:{" "}
          {orders.length}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white border hover:bg-gray-50"
          }`}
        >
          Tất cả ({orders.length})
        </button>
        {(
          [
            "pending",
            "confirmed",
            "processing",
            "shipping",
            "delivered",
            "cancelled",
          ] as OrderStatus[]
        ).map((st) => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === st
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white border hover:bg-gray-50"
            }`}
          >
            {statusLabels[st]} ({orders.filter((o) => o.status === st).length})
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                  Mã đơn
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                  Khách hàng
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">
                  Tổng tiền
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                  Ngày đặt
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                  Trạng thái
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                  Thanh toán
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr
                  key={order.orderId}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td
                    className="px-6 py-4 whitespace-nowrap font-medium"
                    onClick={() => handleViewDetail(order.orderId)}
                  >
                    {order.orderCode}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{order.shippingName}</div>
                    <div className="text-sm text-gray-600">
                      {order.shippingPhone}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                    {order.total.toLocaleString("vi-VN")} ₫
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {format(new Date(order.orderDate), "dd/MM/yyyy HH:mm", {
                      locale: vi,
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${statusColors[order.status]}`}
                    >
                      {statusLabels[order.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium">
                      {order.paymentMethod.toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {paymentLabels[order.paymentStatus]}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <select
                      value={order.status}
                      onChange={(e) =>
                        handleStatusChange(
                          order.orderId,
                          e.target.value as OrderStatus,
                        )
                      }
                      disabled={
                        order.status === "delivered" ||
                        order.status === "cancelled" ||
                        order.status === "returned"
                      }
                      className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      <option value={order.status} disabled>
                        {statusLabels[order.status]}
                      </option>

                      {getAllowedNextStatus(order.status as OrderStatus).map(
                        (next) => (
                          <option key={next} value={next}>
                            → {statusLabels[next]}
                          </option>
                        ),
                      )}

                      {order.status === "pending" && (
                        <option
                          value="cancelled"
                          className="text-red-600 font-medium"
                        >
                          Hủy đơn
                        </option>
                      )}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="py-16 text-center text-gray-500">
            {filter === "all"
              ? "Chưa có đơn hàng nào"
              : `Không có đơn hàng nào ở trạng thái "${statusLabels[filter as OrderStatus]}"`}
          </div>
        )}
      </div>
    </div>
  );
}
