import { useState } from "react";

interface Props {
  images: string[];
}

export const ProductGallery = ({ images }: Props) => {
  const [mainImage, setMainImage] = useState(images[0]);

  return (
    <div>

      <img
        src={mainImage}
        className="w-full h-[400px] object-cover rounded-lg"
      />

      <div className="flex gap-3 mt-4">

        {images.map((img, index) => (
          <img
            key={index}
            src={img}
            onClick={() => setMainImage(img)}
            className="w-20 h-20 object-cover rounded cursor-pointer border"
          />
        ))}

      </div>

    </div>
  );
};