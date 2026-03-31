import { useState } from "react";

const BACKEND_URL = (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5001';
const getImageUrl = (url?: string | null) => {
  if (!url) return '/placeholder.jpg';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

interface Props {
  images: string[];
}

export const ProductGallery = ({ images }: Props) => {
  const [mainImage, setMainImage] = useState(images[0]);

  return (
    <div>

      <img
        src={getImageUrl(mainImage)}
        className="w-full h-[400px] object-cover rounded-lg"
      />

      <div className="flex gap-3 mt-4">

        {images.map((img, index) => (
          <img
            key={index}
            src={getImageUrl(img)}
            onClick={() => setMainImage(img)}
            className="w-20 h-20 object-cover rounded cursor-pointer border"
          />
        ))}

      </div>

    </div>
  );
};
