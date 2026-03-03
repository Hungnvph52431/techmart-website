import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import toast from "react-hot-toast";
import { useOrderStore } from "@/store/orderStore";
import { Order } from "@/types/order";

import {
  ArrowLeftIcon,
  TruckIcon,
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  UserIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

const statusConfig = {
  pending: { label: "Chờ xử lý", color: "bg-yellow-100 text-yellow-800", icon: ClockIcon },
  confirmed: { label: "Đã xác nhận", color: "bg-blue-100 text-blue-800", icon: CheckCircleIcon },
  processing: { label: "Đang xử lý", color: "bg-indigo-100 text-indigo-800", icon: ShoppingCartIcon },
  shipping: { label: "Đang giao", color: "bg-purple-100 text-purple-800", icon: TruckIcon },
  delivered: { label: "Đã giao", color: "bg-green-100 text-green-800", icon: CheckCircleIcon },
  cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-800", icon: XCircleIcon },
  returned: { label: "Đã trả hàng", color: "bg-gray-100 text-gray-800", icon: XCircleIcon },
};

const paymentConfig = {
  pending: { label: "Chưa thanh toán", color: "text-orange-600" },
  paid: { label: "Đã thanh toán", color: "text-green-600" },
  failed: { label: "Thất bại", color: "text-red-600" },
  refunded: { label: "Đã hoàn tiền", color: "text-gray-600" },
};

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { selectedOrder, orderDetails, fetchOrderDetails, updateStatus, setSelectedOrder } = useOrderStore();

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (orderId) {
      const numId = Number(orderId);
      const found = useOrderStore.getState().orders.find((o) => o.orderId === numId);
      if (found) setSelectedOrder(found);
      fetchOrderDetails(numId).finally(() => setLoading(false));
    }
  }, [orderId, fetchOrderDetails, setSelectedOrder]);

  const handleBack = () => navigate(-1);

  const handleUpdateStatus = async (newStatus: Order["status"]) => {
    if (!selectedOrder) return;

    if (!confirm(`Xác nhận chuyển trạng thái sang "${statusConfig[newStatus]?.label}"?`)) return;

    setUpdating(true);
    try {
      const success = await updateStatus(selectedOrder.orderId, newStatus);
      if (success) {
        toast.success("Cập nhật trạng thái thành công");
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      } else {
        toast.error("Cập nhật thất bại");
      }
    } catch (err) {
      toast.error("Có lỗi xảy ra");
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !selectedOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải thông tin đơn hàng...</p>
        </div>
      </div>
    );
  }

  const StatusIcon = statusConfig[selectedOrder.status]?.icon || ClockIcon;
  const StatusColor = statusConfig[selectedOrder.status]?.color || "bg-gray-100 text-gray-800";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 rounded-full bg-white shadow hover:bg-gray-100 transition"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Đơn hàng #{selectedOrder.orderCode}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Đặt ngày {format(new Date(selectedOrder.orderDate), "dd/MM/yyyy HH:mm", { locale: vi })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${StatusColor}`}>
              <StatusIcon className="h-5 w-5 mr-2" />
              {statusConfig[selectedOrder.status]?.label}
            </span>
          </div>
        </div>

        <div className="mb-10 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TruckIcon className="h-5 w-5 text-indigo-600" />
            Tiến trình đơn hàng
          </h2>
          <div className="relative pt-2">
            <div className="overflow-hidden h-2 bg-gray-200 rounded-full">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                style={{
                  width: `${((["pending", "confirmed", "processing", "shipping", "delivered"].indexOf(selectedOrder.status) + 1) / 5) * 100}%`,
                }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Chờ xử lý</span>
              <span>Đã xác nhận</span>
              <span>Đang xử lý</span>
              <span>Đang giao</span>
              <span>Đã giao</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-xl font-semibold mb-5 flex items-center gap-3">
                <MapPinIcon className="h-6 w-6 text-indigo-600" />
                Thông tin giao hàng
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Người nhận</p>
                  <p className="font-medium flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    {selectedOrder.shippingName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Số điện thoại</p>
                  <p className="font-medium flex items-center gap-2">
                    <PhoneIcon className="h-4 w-4 text-gray-500" />
                    {selectedOrder.shippingPhone}
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <p className="text-sm text-gray-500 mb-1">Địa chỉ giao hàng</p>
                <p className="font-medium">
                  {selectedOrder.shippingAddress}
                  {selectedOrder.shippingWard && `, ${selectedOrder.shippingWard}`}
                  {selectedOrder.shippingDistrict && `, ${selectedOrder.shippingDistrict}`}
                  {`, ${selectedOrder.shippingCity}`}
                </p>
              </div>
              {selectedOrder.customerNote && (
                <div className="mt-5 pt-5 border-t">
                  <p className="text-sm text-gray-500 mb-1">Ghi chú từ khách hàng</p>
                  <p className="text-gray-800 italic">"{selectedOrder.customerNote}"</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-xl font-semibold mb-5 flex items-center gap-3">
                <ShoppingCartIcon className="h-6 w-6 text-indigo-600" />
                Sản phẩm trong đơn hàng ({orderDetails?.length || 0})
              </h2>

              {orderDetails && orderDetails.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sản phẩm
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SL
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Đơn giá
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Thành tiền
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orderDetails.map((item) => (
                        <tr key={item.orderDetailId} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div className="font-medium text-gray-900">{item.productName}</div>
                            {item.variantName && (
                              <div className="text-sm text-gray-600 mt-1">Phân loại: {item.variantName}</div>
                            )}
                            {item.sku && <div className="text-xs text-gray-500 mt-0.5">SKU: {item.sku}</div>}
                          </td>
                          <td className="px-4 py-4 text-center font-medium">{item.quantity}</td>
                          <td className="px-4 py-4 text-right">{item.price.toLocaleString("vi-VN")} ₫</td>
                          <td className="px-4 py-4 text-right font-medium text-indigo-700">
                            {item.subtotal.toLocaleString("vi-VN")} ₫
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Không có thông tin sản phẩm
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 sticky top-6">
              <h2 className="text-xl font-semibold mb-5 flex items-center gap-3">
                <CreditCardIcon className="h-6 w-6 text-indigo-600" />
                Thanh toán & Trạng thái
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Phương thức</p>
                  <p className="font-medium uppercase">{selectedOrder.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tình trạng thanh toán</p>
                  <p className={`font-medium ${paymentConfig[selectedOrder.paymentStatus]?.color}`}>
                    {paymentConfig[selectedOrder.paymentStatus]?.label}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-gray-500 mb-2">Cập nhật trạng thái</p>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleUpdateStatus(e.target.value as Order["status"])}
                  disabled={
                    updating ||
                    selectedOrder.status === "delivered" ||
                    selectedOrder.status === "cancelled" ||
                    selectedOrder.status === "returned"
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  <option value={selectedOrder.status} disabled>
                    {statusConfig[selectedOrder.status]?.label}
                  </option>
                </select>

                {updating && (
                  <div className="mt-3 text-center text-sm text-indigo-600 animate-pulse">
                    Đang cập nhật...
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm p-6 border border-indigo-100">
              <h2 className="text-xl font-semibold mb-5 flex items-center gap-3 text-indigo-800">
                <CurrencyDollarIcon className="h-6 w-6" />
                Tổng kết
              </h2>
              <div className="space-y-3 text-gray-700">
                <div className="flex justify-between">
                  <span>Tạm tính sản phẩm</span>
                  <span>{selectedOrder.subtotal.toLocaleString("vi-VN")} ₫</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí vận chuyển</span>
                  <span>{selectedOrder.shippingFee.toLocaleString("vi-VN")} ₫</span>
                </div>
                <div className="flex justify-between">
                  <span>Giảm giá</span>
                  <span className="text-green-600">-{selectedOrder.discountAmount.toLocaleString("vi-VN")} ₫</span>
                </div>
                <div className="pt-4 border-t font-bold text-lg flex justify-between text-indigo-900">
                  <span>Tổng thanh toán</span>
                  <span>{selectedOrder.total.toLocaleString("vi-VN")} ₫</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}