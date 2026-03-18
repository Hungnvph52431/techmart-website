import { Faq } from "@/components/common/Faq";
import { Feedback } from "@/components/common/Feedback";
import { Layout } from "@/components/layout/Layout";

export const ContactPage = () => {
  return (
    <Layout>

      <div
        className="w-full h-[600px] bg-cover bg-center flex items-center"
        style={{
          backgroundImage:
            "url(/brands/banner-lien-he2.png)",
        }}
      >
        <div className="container mx-auto px-4">

          <div className="bg-blue-900/90 backdrop-blur-md shadow-[0_30px_80px_rgba(0,0,0,0.7)] text-white p-8 rounded-lg w-[420px] ml-16">

            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="text-yellow-400 text-4xl">📱</span>
              <h2 className="text-4xl font-bold">
                <span className="text-white">Tech</span>
                <span className="text-yellow-400 ml-1">Mart</span>
              </h2>
            </div>

            <h3 className="text-xl font-bold mb-5 text-center leading-snug">
              <span className="text-yellow-400">ĐĂNG KÝ NHẬN ƯU ĐÃI</span>{" "}
              <span className="text-white">VÀ TƯ VẤN MIỄN PHÍ</span>
            </h3>

            <form className="space-y-4">

            <input
              type="text"
              placeholder="Họ và tên"
              required
              className="w-full p-2 rounded text-black"
            />

            <input
              type="tel"
              placeholder="Số điện thoại"
              required
              className="w-full p-2 rounded text-black"
            />

            <input
              type="text"
              placeholder="Địa chỉ"
              required
              className="w-full p-2 rounded text-black"
            />

            <p className="text-xs text-gray-200">
              *Vui lòng điền đầy đủ thông tin để TechMart có thể liên hệ tư vấn nhanh nhất.
            </p>

            <button className="bg-yellow-400 text-black font-semibold w-3/4 py-2.5 rounded-lg animate-pulseScale hover:scale-105 transition mx-auto block">
              ĐĂNG KÝ TƯ VẤN NGAY
            </button>

          </form>
          </div>

        </div>
      </div>
      
    < Feedback/>
    < Faq/>
    </Layout>
  );
};