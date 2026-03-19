import { Layout } from '@/components/layout/Layout';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  // Đặt hàng
  {
    category: 'Đặt hàng',
    question: 'Làm thế nào để đặt hàng trên TechMart?',
    answer: 'Bạn chọn sản phẩm muốn mua, thêm vào giỏ hàng, sau đó nhấn "Thanh toán". Điền thông tin giao hàng và chọn phương thức thanh toán phù hợp. Đơn hàng sẽ được xác nhận qua SMS/email.',
  },
  {
    category: 'Đặt hàng',
    question: 'Tôi có thể đặt hàng mà không cần đăng ký tài khoản không?',
    answer: 'Hiện tại TechMart yêu cầu đăng ký tài khoản để đặt hàng. Việc này giúp bạn dễ dàng theo dõi đơn hàng, tích điểm thưởng và nhận ưu đãi dành riêng cho thành viên.',
  },
  {
    category: 'Đặt hàng',
    question: 'Tôi có thể huỷ đơn hàng sau khi đặt không?',
    answer: 'Bạn có thể huỷ đơn hàng khi đơn đang ở trạng thái "Chờ xác nhận" hoặc "Đã xác nhận". Sau khi đơn đã được chuyển sang giai đoạn đóng gói hoặc vận chuyển, bạn không thể huỷ mà cần liên hệ hotline để được hỗ trợ.',
  },
  // Thanh toán
  {
    category: 'Thanh toán',
    question: 'TechMart hỗ trợ những phương thức thanh toán nào?',
    answer: 'TechMart hỗ trợ: Thanh toán khi nhận hàng (COD), Chuyển khoản ngân hàng, VNPay, Ví MoMo và Ví TechMart. Bạn có thể xem chi tiết tại trang Phương thức thanh toán.',
  },
  {
    category: 'Thanh toán',
    question: 'Thanh toán online có an toàn không?',
    answer: 'Tuyệt đối an toàn. TechMart sử dụng mã hoá SSL 256-bit, không lưu trữ thông tin thẻ và mọi giao dịch đều cần xác thực OTP. Chúng tôi hợp tác với các cổng thanh toán uy tín như VNPay.',
  },
  {
    category: 'Thanh toán',
    question: 'Tôi có thể thanh toán trả góp không?',
    answer: 'TechMart hỗ trợ trả góp 0% lãi suất qua VNPay với các đối tác ngân hàng. Áp dụng cho đơn hàng từ 3.000.000đ trở lên. Vui lòng chọn phương thức VNPay khi thanh toán để xem các gói trả góp.',
  },
  // Giao hàng
  {
    category: 'Giao hàng',
    question: 'Thời gian giao hàng là bao lâu?',
    answer: 'Nội thành TP.HCM & Hà Nội: 1-2 giờ (hoả tốc) hoặc trong ngày (tiêu chuẩn). Các tỉnh thành khác: 2-4 ngày (tiêu chuẩn) hoặc 1-2 ngày (giao nhanh).',
  },
  {
    category: 'Giao hàng',
    question: 'Phí giao hàng là bao nhiêu?',
    answer: 'Miễn phí giao hàng nội thành HCM/HN. Các tỉnh khác phí từ 30.000đ. Miễn phí toàn quốc cho đơn từ 2.000.000đ. Chi tiết xem tại trang Chính sách giao hàng.',
  },
  {
    category: 'Giao hàng',
    question: 'Tôi có thể theo dõi đơn hàng ở đâu?',
    answer: 'Đăng nhập tài khoản → vào mục "Đơn hàng của tôi" để xem trạng thái và dòng thời gian chi tiết của đơn hàng. TechMart cũng gửi thông báo cập nhật qua SMS.',
  },
  // Bảo hành & Đổi trả
  {
    category: 'Bảo hành & Đổi trả',
    question: 'Sản phẩm được bảo hành bao lâu?',
    answer: 'Điện thoại chính hãng: 12 tháng. Phụ kiện chính hãng: 6 tháng. Phụ kiện khác: 3 tháng. Chi tiết xem tại trang Chính sách bảo hành.',
  },
  {
    category: 'Bảo hành & Đổi trả',
    question: 'Tôi muốn đổi trả sản phẩm thì làm sao?',
    answer: 'Vào "Đơn hàng của tôi" → chọn đơn cần đổi trả → nhấn "Yêu cầu hoàn trả". Kèm hình ảnh minh chứng lỗi sản phẩm. TechMart sẽ phản hồi trong 24 giờ.',
  },
  {
    category: 'Bảo hành & Đổi trả',
    question: 'Hoàn tiền mất bao lâu?',
    answer: 'Ví TechMart: ngay lập tức. Chuyển khoản ngân hàng: 1-3 ngày làm việc. VNPay/MoMo: 3-5 ngày làm việc.',
  },
  // Tài khoản
  {
    category: 'Tài khoản',
    question: 'Quên mật khẩu thì phải làm sao?',
    answer: 'Nhấn "Quên mật khẩu" tại trang đăng nhập, nhập email đã đăng ký. TechMart sẽ gửi link đặt lại mật khẩu qua email. Link có hiệu lực trong 30 phút.',
  },
  {
    category: 'Tài khoản',
    question: 'Ví TechMart là gì? Nạp tiền như thế nào?',
    answer: 'Ví TechMart là ví điện tử nội bộ giúp bạn thanh toán nhanh chóng. Nạp tiền bằng chuyển khoản ngân hàng theo hướng dẫn tại mục "Ví của tôi". Số dư được cập nhật sau khi admin xác nhận.',
  },
];

export const FAQPage = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('Tất cả');

  const categories = ['Tất cả', ...Array.from(new Set(faqData.map((f) => f.category)))];
  const filtered = activeCategory === 'Tất cả' ? faqData : faqData.filter((f) => f.category === activeCategory);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <HelpCircle className="h-12 w-12 text-blue-600 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Câu Hỏi Thường Gặp</h1>
          <p className="text-gray-500">Tìm câu trả lời nhanh cho các thắc mắc phổ biến</p>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setOpenIndex(null); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ accordion */}
        <div className="space-y-3">
          {filtered.map((item, index) => (
            <div key={index} className="bg-white rounded-lg shadow overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition"
              >
                <div className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold mt-0.5">Q</span>
                  <span className="font-medium text-gray-900">{item.question}</span>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-gray-400 transition-transform flex-shrink-0 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4 border-t">
                  <div className="flex items-start gap-3 pt-3">
                    <span className="text-green-600 font-bold">A</span>
                    <p className="text-gray-700 text-sm leading-relaxed">{item.answer}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-10 text-center bg-blue-50 rounded-lg p-8">
          <h2 className="text-xl font-bold text-blue-800 mb-2">Không tìm thấy câu trả lời?</h2>
          <p className="text-gray-600 mb-4">Liên hệ với chúng tôi để được hỗ trợ trực tiếp</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="tel:1900xxxx" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition">
              Gọi 1900 xxxx
            </a>
            <a href="/contact" className="bg-white text-blue-600 border border-blue-600 px-6 py-2.5 rounded-lg font-medium hover:bg-blue-50 transition">
              Gửi liên hệ
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
};
