import { Layout } from '@/components/layout/Layout';
import { RotateCcw, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export const ReturnPage = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <RotateCcw className="h-12 w-12 text-blue-600 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Đổi Trả & Hoàn Tiền</h1>
          <p className="text-gray-500">Chính sách đổi trả minh bạch, bảo vệ quyền lợi khách hàng</p>
        </div>

        <div className="space-y-8">
          {/* Chính sách đổi trả */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Điều kiện đổi trả
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-green-700 mb-2">Đổi sản phẩm (trong 7 ngày)</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✔</span>
                    Sản phẩm bị lỗi kỹ thuật từ nhà sản xuất
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✔</span>
                    Giao sai sản phẩm, sai màu sắc, sai dung lượng
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✔</span>
                    Sản phẩm còn nguyên seal, chưa kích hoạt bảo hành
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✔</span>
                    Đầy đủ hộp, phụ kiện, quà tặng kèm theo
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-blue-700 mb-2">Trả hàng & hoàn tiền (trong 3 ngày)</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">✔</span>
                    Sản phẩm lỗi nặng, không thể sửa chữa
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">✔</span>
                    Đã đổi 1 lần nhưng vẫn gặp lỗi tương tự
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">✔</span>
                    Sản phẩm không đúng mô tả trên website
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Không áp dụng */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Trường hợp KHÔNG áp dụng đổi trả
            </h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">✘</span>
                Sản phẩm đã qua sử dụng, có dấu hiệu trầy xước do người dùng
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">✘</span>
                Không còn đầy đủ hộp, phụ kiện, quà tặng đi kèm
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">✘</span>
                Sản phẩm hư hỏng do lỗi người dùng (rơi vỡ, vào nước...)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">✘</span>
                Sản phẩm khuyến mãi, thanh lý, giảm giá đặc biệt (có ghi chú riêng)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">✘</span>
                Quá thời hạn đổi trả theo quy định
              </li>
            </ul>
          </section>

          {/* Quy trình */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-blue-800 mb-4">Quy trình đổi trả</h2>
            <div className="flex flex-col md:flex-row items-center justify-between gap-2">
              {[
                { step: '1', title: 'Yêu cầu', desc: 'Gửi yêu cầu đổi trả qua trang Đơn hàng' },
                { step: '2', title: 'Xác nhận', desc: 'TechMart xem xét và phản hồi trong 24h' },
                { step: '3', title: 'Gửi hàng', desc: 'Gửi sản phẩm về TechMart (miễn phí ship)' },
                { step: '4', title: 'Hoàn tất', desc: 'Đổi mới hoặc hoàn tiền trong 3-5 ngày' },
              ].map((item, index) => (
                <div key={item.step} className="flex items-center gap-2">
                  <div className="text-center p-4 bg-blue-50 rounded-lg min-w-[140px]">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                      {item.step}
                    </div>
                    <h3 className="font-semibold text-blue-800 text-sm">{item.title}</h3>
                    <p className="text-xs text-gray-600 mt-1">{item.desc}</p>
                  </div>
                  {index < 3 && <ArrowRight className="h-5 w-5 text-gray-400 hidden md:block" />}
                </div>
              ))}
            </div>
          </section>

          {/* Hoàn tiền */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-blue-800 mb-4">Hình thức hoàn tiền</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <h3 className="font-semibold text-gray-800 mb-1">Ví TechMart</h3>
                <p className="text-blue-600 font-bold">Ngay lập tức</p>
                <p className="text-xs text-gray-500 mt-1">Hoàn vào ví để mua hàng lần sau</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <h3 className="font-semibold text-gray-800 mb-1">Chuyển khoản</h3>
                <p className="text-blue-600 font-bold">1-3 ngày làm việc</p>
                <p className="text-xs text-gray-500 mt-1">Hoàn về tài khoản ngân hàng</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <h3 className="font-semibold text-gray-800 mb-1">VNPay / MoMo</h3>
                <p className="text-blue-600 font-bold">3-5 ngày làm việc</p>
                <p className="text-xs text-gray-500 mt-1">Hoàn về nguồn thanh toán ban đầu</p>
              </div>
            </div>
          </section>

          {/* Lưu ý */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            <strong>Lưu ý:</strong> Mọi yêu cầu đổi trả cần có hình ảnh/video minh chứng lỗi sản phẩm.
            Quý khách vui lòng giữ nguyên hiện trạng sản phẩm cho đến khi hoàn tất quy trình đổi trả.
          </div>
        </div>
      </div>
    </Layout>
  );
};
