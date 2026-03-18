import { Layout } from "@/components/layout/Layout";
import { Feedback } from "@/components/common/Feedback";
import { Faq } from "@/components/common/Faq";

const news = [
  {
    title: "Khuyến mãi mùa hè giảm giá 50%",
    image: "/brands/tintuckhuyenmai.jpg",
  },
  {
    title: "Điện thoại Iphone chính hãng giá rẻ, bảo hành một đổi một",
    image: "/brands/dienthoaichinhhang.jpg",
  },
  {
    title: "Top 5 điện thoại đáng mua",
    image: "/brands/top5dienthoai.jpg",
  },
];

export const NewsPage = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">

        <h1 className="text-3xl font-bold mb-10">
          Tin tức mới nhất
        </h1>

        <div className="grid md:grid-cols-3 gap-8">

          {news.map((item, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-lg shadow group"
            >
              <div className="overflow-hidden">
                <img
                  src={item.image}
                  className="w-full h-52 object-cover transform group-hover:scale-110 transition duration-500"
                />
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-lg">
                  {item.title}
                </h3>
              </div>

            </div>
          ))}

        </div>

      </div>
      <Feedback />
      <Faq/>
      
    </Layout>
  );
};