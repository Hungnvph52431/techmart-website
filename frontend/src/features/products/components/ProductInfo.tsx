import { Product } from "@/types";

interface Props {
  product: Product;
}

export const ProductInfo = ({ product }: Props) => {
  return (
    <div>

      <h1 className="text-3xl font-bold mb-4">
        {product.name}
      </h1>

      <p className="text-gray-500 mb-4">
        Brand: {product.brand}
      </p>

      <p className="text-2xl text-red-500 font-bold mb-6">
        ${product.price}
      </p>

      <p className="text-gray-700 mb-6">
        {product.description}
      </p>

      <button className="bg-black text-white px-6 py-3 rounded hover:bg-gray-800">
        Add to cart
      </button>

    </div>
  );
};