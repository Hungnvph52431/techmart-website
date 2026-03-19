import { Layout } from '@/components/layout/Layout';
import { ShieldCheck, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export const PolicyPage = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <ShieldCheck className="h-12 w-12 text-blue-600 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Chính Sách Bảo Hành</h1>
          <p className="text-gray-500">Cam kết bảo hành chính hãng tại TechMart</p>
        </div>

        <div className="space-y-8">
          {/* Điều kiện bảo hành */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Điều kiện bảo hành
            </h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✔</span>
                Sản phẩm còn trong thời hạn bảo hành (tính từ ngày mua hàng)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✔</span>
                Tem bảo hành, phiếu bảo hành còn nguyên vẹn, không bị rách hay tẩy xoá
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✔</span>
                Sản phẩm bị lỗi do nhà sản xuất (lỗi phần cứng, lỗi phần mềm gốc)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✔</span>
                Có hoá đơn mua hàng hoặc thông tin đơn hàng trên hệ thống TechMart
              </li>
            </ul>
          </section>

          {/* Thời gian bảo hành */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Thời gian bảo hành
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-blue-50 text-blue-800">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Loại sản phẩm</th>
                    <th className="px-4 py-3">Thời gian bảo hành</th>
                    <th className="px-4 py-3 rounded-tr-lg">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 divide-y">
                  <tr>
                    <td className="px-4 py-3">Điện thoại chính hãng</td>
                    <td className="px-4 py-3 font-semibold">12 tháng</td>
                    <td className="px-4 py-3">Bảo hành tại TTBH hãng hoặc TechMart</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Phụ kiện chính hãng</td>
                    <td className="px-4 py-3 font-semibold">6 tháng</td>
                    <td className="px-4 py-3">Tai nghe, sạc, cáp đi kèm máy</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Phụ kiện khác</td>
                    <td className="px-4 py-3 font-semibold">3 tháng</td>
                    <td className="px-4 py-3">Ốp lưng, kính cường lực, sạc dự phòng</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Pin thay thế</td>
                    <td className="px-4 py-3 font-semibold">6 tháng</td>
                    <td className="px-4 py-3">Áp dụng pin chính hãng do TechMart cung cấp</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Không bảo hành */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Các trường hợp KHÔNG được bảo hành
            </h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">✘</span>
                Sản phẩm hết thời hạn bảo hành
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">✘</span>
                Sản phẩm bị hư hỏng do tác động bên ngoài: rơi vỡ, vào nước, cháy nổ
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">✘</span>
                Tem bảo hành bị rách, mất hoặc có dấu hiệu tháo lắp bởi bên thứ ba
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">✘</span>
                Sản phẩm đã bị root, jailbreak hoặc cài đặt phần mềm không chính thống
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">✘</span>
                Hư hỏng do thiên tai, sét đánh, điện áp không ổn định
              </li>
            </ul>
          </section>

          {/* Quy trình bảo hành */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Quy trình bảo hành
            </h2>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { step: '1', title: 'Liên hệ', desc: 'Gọi hotline 1900 xxxx hoặc mang sản phẩm đến cửa hàng' },
                { step: '2', title: 'Kiểm tra', desc: 'Nhân viên kỹ thuật kiểm tra và xác nhận lỗi sản phẩm' },
                { step: '3', title: 'Xử lý', desc: 'Sửa chữa hoặc đổi mới sản phẩm (tuỳ mức độ lỗi)' },
                { step: '4', title: 'Hoàn trả', desc: 'Nhận lại sản phẩm trong 3-7 ngày làm việc' },
              ].map((item) => (
                <div key={item.step} className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-blue-800 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Lưu ý */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            <strong>Lưu ý:</strong> Thời gian xử lý bảo hành có thể kéo dài hơn dự kiến trong trường hợp
            cần đặt linh kiện từ hãng. TechMart sẽ thông báo và cập nhật tiến độ cho quý khách thường xuyên.
          </div>
        </div>
      </div>
    </Layout>
  );
};
