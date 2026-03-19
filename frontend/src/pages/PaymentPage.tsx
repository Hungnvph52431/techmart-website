import { Layout } from '@/components/layout/Layout';
import { CreditCard, Banknote, Smartphone, Wallet, ShieldCheck } from 'lucide-react';

export const PaymentPage = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <CreditCard className="h-12 w-12 text-blue-600 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Phương Thức Thanh Toán</h1>
          <p className="text-gray-500">Đa dạng hình thức thanh toán, an toàn và tiện lợi</p>
        </div>

        <div className="space-y-8">
          {/* Các phương thức */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* COD */}
            <section className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Banknote className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Thanh toán khi nhận hàng (COD)</h2>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Phổ biến nhất</span>
                </div>
              </div>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>- Thanh toán bằng tiền mặt khi nhận hàng</li>
                <li>- Kiểm tra sản phẩm trước khi thanh toán</li>
                <li>- Áp dụng cho tất cả đơn hàng</li>
                <li>- Không phát sinh phí bổ sung</li>
              </ul>
            </section>

            {/* Chuyển khoản */}
            <section className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Chuyển khoản ngân hàng</h2>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Nhanh chóng</span>
                </div>
              </div>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>- Chuyển khoản qua Internet Banking / Mobile Banking</li>
                <li>- Hỗ trợ tất cả ngân hàng nội địa</li>
                <li>- Xác nhận tự động qua mã QR</li>
                <li>- Đơn hàng được xử lý ngay sau khi nhận tiền</li>
              </ul>
            </section>

            {/* VNPay */}
            <section className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">VNPay</h2>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Ưu đãi thường xuyên</span>
                </div>
              </div>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>- Thanh toán qua ứng dụng VNPay-QR</li>
                <li>- Hỗ trợ thẻ ATM nội địa & thẻ quốc tế</li>
                <li>- Thanh toán trả góp 0% lãi suất</li>
                <li>- Nhiều khuyến mãi cashback hấp dẫn</li>
              </ul>
            </section>

            {/* MoMo */}
            <section className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-pink-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Ví MoMo</h2>
                  <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">Tiện lợi</span>
                </div>
              </div>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>- Thanh toán nhanh bằng ví MoMo</li>
                <li>- Quét mã QR hoặc nhập số điện thoại</li>
                <li>- Xác nhận giao dịch qua ứng dụng MoMo</li>
                <li>- Hoàn tiền dễ dàng về ví MoMo</li>
              </ul>
            </section>

            {/* Ví TechMart */}
            <section className="bg-white rounded-lg shadow p-6 md:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Ví TechMart</h2>
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Nội bộ</span>
                </div>
              </div>
              <p className="text-sm text-gray-700">
                Sử dụng số dư trong ví TechMart để thanh toán. Nạp tiền vào ví qua chuyển khoản
                ngân hàng và tận hưởng ưu đãi dành riêng cho thành viên. Hoàn tiền đổi trả cũng
                được trả về ví TechMart nhanh chóng.
              </p>
            </section>
          </div>

          {/* Bảo mật */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-500" />
              Cam kết bảo mật thanh toán
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-1">Mã hoá SSL 256-bit</h3>
                <p className="text-xs text-gray-600">Mọi giao dịch được mã hoá đầu-cuối</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-1">Không lưu thẻ</h3>
                <p className="text-xs text-gray-600">TechMart không lưu trữ thông tin thẻ</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-1">Xác thực 2 lớp</h3>
                <p className="text-xs text-gray-600">OTP xác nhận mọi giao dịch online</p>
              </div>
            </div>
          </section>

          {/* Lưu ý */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            <strong>Lưu ý:</strong> Nếu gặp vấn đề trong quá trình thanh toán, vui lòng liên hệ hotline
            <strong> 1900 xxxx</strong> hoặc nhắn tin qua Zalo để được hỗ trợ ngay.
          </div>
        </div>
      </div>
    </Layout>
  );
};
