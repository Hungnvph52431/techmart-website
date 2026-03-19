import { useState } from "react";
import { ChevronDown } from "lucide-react";

export const Faq = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const questions = [
    {
      q: "TechMart bán những loại điện thoại nào?",
      a: "TechMart cung cấp các dòng điện thoại chính hãng từ các thương hiệu nổi tiếng như Apple, Samsung, Xiaomi, Oppo và nhiều hãng khác.",
    },
    {
      q: "Sản phẩm tại TechMart có phải chính hãng không?",
      a: "Tất cả điện thoại tại TechMart đều là hàng chính hãng 100%, có đầy đủ hóa đơn và bảo hành từ nhà sản xuất.",
    },
    {
      q: "TechMart có hỗ trợ trả góp không?",
      a: "Có. TechMart hỗ trợ trả góp qua thẻ tín dụng hoặc các công ty tài chính với thủ tục nhanh chóng.",
    },
    {
      q: "Chính sách bảo hành của TechMart như thế nào?",
      a: "Sản phẩm được bảo hành theo chính sách của hãng và TechMart luôn hỗ trợ khách hàng trong suốt thời gian bảo hành.",
    },
    {
      q: "TechMart có giao hàng tận nơi không?",
      a: "Có. TechMart hỗ trợ giao hàng toàn quốc, đảm bảo nhanh chóng và an toàn.",
    },
    {
      q: "Tôi có thể đổi trả sản phẩm không?",
      a: "TechMart hỗ trợ đổi trả theo chính sách của cửa hàng nếu sản phẩm gặp lỗi từ nhà sản xuất.",
    },
    {
      q: "Làm sao để chọn điện thoại phù hợp?",
      a: "Bạn có thể liên hệ đội ngũ tư vấn của TechMart để được hỗ trợ chọn sản phẩm phù hợp với nhu cầu và ngân sách.",
    },
    {
      q: "TechMart có bán phụ kiện điện thoại không?",
      a: "Có. Chúng tôi cung cấp nhiều phụ kiện như tai nghe, ốp lưng, sạc nhanh và kính cường lực.",
    },
    {
      q: "Tôi có thể đặt hàng online không?",
      a: "Bạn có thể đặt hàng trực tiếp trên website TechMart hoặc liên hệ qua hotline để được hỗ trợ.",
    },
    {
      q: "TechMart có chương trình khuyến mãi không?",
      a: "TechMart thường xuyên có các chương trình giảm giá và ưu đãi hấp dẫn dành cho khách hàng.",
    },
  ];

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const left = questions.slice(0, 5);
  const right = questions.slice(5);

  return (
    <section className="py-16 bg-gray-100">

      <h2 className="text-center text-3xl font-bold mb-10 text-blue-900">
        GIẢI ĐÁP <span className="text-yellow-500">THẮC MẮC</span>
      </h2>

      <div className="container mx-auto px-4 md:px-8 grid md:grid-cols-2 gap-8">

        {/* Left column */}
        <div className="space-y-4">
          {left.map((item, index) => (
            <FaqItem
              key={index}
              item={item}
              index={index}
              openIndex={openIndex}
              toggle={toggle}
            />
          ))}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {right.map((item, index) => (
            <FaqItem
              key={index}
              item={item}
              index={index + 5}
              openIndex={openIndex}
              toggle={toggle}
            />
          ))}
        </div>

      </div>

    </section>
  );
};

const FaqItem = ({ item, index, openIndex, toggle }: any) => {
  return (
    <div>

      <button
        onClick={() => toggle(index)}
        className="w-full flex justify-between items-center bg-yellow-500
        px-4 py-3 text-left  hover:text-blue-900 transition rounded-lg"
      >
        {index + 1}. {item.q}

        <ChevronDown
          className={`transition-transform duration-300 ${
            openIndex === index ? "rotate-180" : ""
          }`}
        />
      </button>

      {openIndex === index && (
        <div className="bg-gray-200 px-4 py-4 text-gray-700">
          {item.a}
        </div>
      )}

    </div>
  );
};