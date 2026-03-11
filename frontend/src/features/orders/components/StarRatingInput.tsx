import { Star } from 'lucide-react';

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const StarRatingInput = ({
  value,
  onChange,
  disabled = false,
}: StarRatingInputProps) => {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => {
        const ratingValue = index + 1;
        const active = ratingValue <= value;

        return (
          <button
            key={ratingValue}
            type="button"
            onClick={() => onChange(ratingValue)}
            disabled={disabled}
            className="rounded p-1 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Star
              className={`h-5 w-5 ${
                active ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};
