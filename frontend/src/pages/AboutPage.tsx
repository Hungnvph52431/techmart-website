import { Faq } from "@/components/common/Faq";
import { Feedback } from "@/components/common/Feedback";
import { Layout } from "@/components/layout/Layout";
import { FaPhoneAlt } from "react-icons/fa";

export const AboutPage = () => {
  return (
    <Layout>
      <div className="container mx-auto px-8 py-16">

        <div className="grid md:grid-cols-2 gap-10 items-center">
          <img
            src="/brands/banner-gioi-thieu.png"
            className="rounded-lg w-11/12 "
          />
          <div>
            <p className="text-s font-bold text-black mb-2 tracking-wide">
              VỀ CHÚNG TÔI
            </p>
            <h2 className="text-2xl font-bold text-blue-800 mb-4 leading-snug">
              TECHMART – CỬA HÀNG ĐIỆN THOẠI CHÍNH HÃNG
              UY TÍN VÀ CHẤT LƯỢNG
            </h2>

            <p className="text-black mb-6 text-m leading-relaxed text-justify">
              TechMart là cửa hàng chuyên cung cấp các dòng điện thoại chính hãng từ
              những thương hiệu hàng đầu như Apple, Samsung, Xiaomi và nhiều hãng khác.
              Chúng tôi cam kết mang đến cho khách hàng những sản phẩm chất lượng,
              giá cả cạnh tranh cùng dịch vụ hỗ trợ tận tâm. Với nhiều năm kinh nghiệm
              trong lĩnh vực công nghệ, TechMart luôn mong muốn giúp khách hàng lựa chọn
              được chiếc điện thoại phù hợp nhất với nhu cầu sử dụng.
            </p>
            <ul className="space-y-3 text-black text-sm">

              <li className="flex items-center gap-2">
                <span className="text-yellow-500">✔</span>
                Điện thoại chính hãng 100%, đầy đủ bảo hành từ nhà sản xuất
              </li>

              <li className="flex items-center gap-2">
                <span className="text-yellow-500">✔</span>
                Giá cả cạnh tranh, nhiều chương trình ưu đãi hấp dẫn
              </li>

              <li className="flex items-center gap-2">
                <span className="text-yellow-500">✔</span>
                Hỗ trợ tư vấn chọn điện thoại phù hợp với nhu cầu
              </li>

              <li className="flex items-center gap-2">
                <span className="text-yellow-500">✔</span>
                Giao hàng nhanh chóng, hỗ trợ đổi trả theo chính sách
              </li>

            </ul>

            <div className="mt-6 flex gap-6 items-center">

              <button className="bg-blue-800 font-bold text-white px-6 py-2 rounded transition hover:bg-yellow-500">
                XEM THÔNG TIN
              </button>

              <p className="text-blue-800 font-bold flex items-center gap-2">
                <FaPhoneAlt className="text-blue-800" /> 
                (+84) 987 654 321
              </p>

            </div>

          </div>

        </div>

      </div>
      <Feedback />
      <Faq/>
    </Layout>
  );
};