import { Layout } from "@/components/layout/Layout";
import { ProductsFilter } from "../components/ProductFilter";

export const ProductListPage = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-black text-gray-800 uppercase italic tracking-tight mb-6">
          <a href="/products">Danh Sách Sản Phẩm</a>
        </h1>

        {/* ProductsFilter đã bao gồm sidebar brand + category + filter + danh sách sản phẩm */}
        <ProductsFilter />
      </div>
    </Layout>
  );
};