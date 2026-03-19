import { Layout } from '@/components/layout/Layout';
import { Truck, MapPin, Clock, CreditCard } from 'lucide-react';

export const ShippingPage = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <Truck className="h-12 w-12 text-blue-600 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Chính Sách Giao Hàng</h1>
          <p className="text-gray-500">Giao hàng nhanh chóng, đảm bảo an toàn trên toàn quốc</p>
        </div>

        <div className="space-y-8">
          {/* Phạm vi giao hàng */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              Phạm vi giao hàng
            </h2>
            <p className="text-gray-700 mb-4">
              TechMart hỗ trợ giao hàng trên toàn quốc thông qua các đối tác vận chuyển uy tín.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-green-700 mb-2">Nội thành TP.HCM & Hà Nội</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>- Giao hàng trong 1-2 giờ (đơn trước 17h)</li>
                  <li>- Hỗ trợ giao hoả tốc trong ngày</li>
                </ul>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-700 mb-2">Các tỉnh thành khác</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>- Giao hàng tiêu chuẩn: 2-4 ngày</li>
                  <li>- Giao nhanh: 1-2 ngày</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Phí giao hàng */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-500" />
              Phí giao hàng
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-blue-50 text-blue-800">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Hình thức</th>
                    <th className="px-4 py-3">Khu vực</th>
                    <th className="px-4 py-3 rounded-tr-lg">Phí vận chuyển</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 divide-y">
                  <tr>
                    <td className="px-4 py-3">Tiêu chuẩn</td>
                    <td className="px-4 py-3">Nội thành HCM/HN</td>
                    <td className="px-4 py-3 font-semibold text-green-600">MIỄN PHÍ</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Tiêu chuẩn</td>
                    <td className="px-4 py-3">Các tỉnh thành khác</td>
                    <td className="px-4 py-3 font-semibold">30.000đ</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Hoả tốc (2h)</td>
                    <td className="px-4 py-3">Nội thành HCM/HN</td>
                    <td className="px-4 py-3 font-semibold">25.000đ</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Giao nhanh</td>
                    <td className="px-4 py-3">Các tỉnh thành khác</td>
                    <td className="px-4 py-3 font-semibold">50.000đ</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              * Miễn phí giao hàng toàn quốc cho đơn hàng từ <strong>2.000.000đ</strong>
            </p>
          </section>

          {/* Thời gian giao hàng */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Thời gian xử lý đơn hàng
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { title: 'Xác nhận đơn', time: '15 - 30 phút', desc: 'Sau khi đặt hàng thành công' },
                { title: 'Đóng gói', time: '1 - 2 giờ', desc: 'Kiểm tra & đóng gói cẩn thận' },
                { title: 'Bàn giao vận chuyển', time: 'Trong ngày', desc: 'Với đơn đặt trước 15h' },
              ].map((item) => (
                <div key={item.title} className="text-center p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-1">{item.title}</h3>
                  <p className="text-blue-600 font-bold text-lg">{item.time}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Lưu ý */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            <strong>Lưu ý:</strong> Thời gian giao hàng có thể thay đổi trong các dịp lễ, Tết hoặc khi có
            sự cố bất khả kháng. TechMart sẽ chủ động liên hệ và cập nhật tình trạng đơn hàng qua SMS/Zalo.
          </div>
        </div>
      </div>
    </Layout>
  );
};
