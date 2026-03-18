export const Feedback = () => {
  const feedbacks = [
    {
      name: "Anh Minh Tuấn",
      location: "Hải Phòng",
      content:
        "Tôi mua điện thoại tại TechMart và rất hài lòng với chất lượng sản phẩm. Nhân viên tư vấn rất nhiệt tình và giúp tôi chọn được chiếc điện thoại phù hợp.",
      image: "/brands/feedback1.png",
    },
    {
      name: "Anh Hoàng Nam",
      location: "Hà Nội",
      content:
        "TechMart có nhiều dòng điện thoại chính hãng với giá rất tốt. Dịch vụ hỗ trợ khách hàng nhanh chóng và bảo hành rõ ràng.",
      image: "/brands/feedback2.png",
    },
  ];

  return (
    <section className="py-16">

      <h2 className="text-center text-3xl font-bold mb-12">
        <span className="text-yellow-500">FEEDBACK</span>{" "}
        <span className="text-[#184E86]">TỪ KHÁCH HÀNG</span>
      </h2>

      {/* khung nhỏ lại */}
      <div className="max-w-7xl m-10 grid md:grid-cols-2 gap-10">

        {feedbacks.map((item, index) => (
          <div
        key={index}
        className="relative text-white py-8 px-2 flex items-center overflow-hidden"
        style={{
          background:
            "linear-gradient(108deg, white 0 90px, #facc15 90px 96px, #184E86 96px)",
        }}
      >
        {/* tam giác vàng góc phải */}
        <div className="absolute right-0 bottom-0 w-24 h-24 bg-yellow-500 rotate-45 translate-x-12 translate-y-12"></div>

        {/* avatar */}
        <img
          src={item.image}
          className="w-28 h-28 object-cover border border-white mr-10"
        />

        <div>
          <p className="leading-relaxed mb-4">{item.content}</p>

          <p className="text-yellow-500 font-bold text-lg">
            {item.name}
          </p>

          <p className="text-gray-200">
            {item.location}
          </p>
        </div>
      </div>
              ))}
            </div>
          </section>
        );
      };