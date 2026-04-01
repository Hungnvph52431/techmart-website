import { useState, useEffect } from 'react';
import { X, Check, ShoppingCart, Minus, Plus } from 'lucide-react';
import { Product } from '@/types';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';
import {
  CART_QUANTITY_EXCEEDED_MESSAGE,
  getProductPurchaseStockLimit,
  getRemainingProductQuantity,
} from '@/features/cart/lib/cartQuantity';

const BACKEND_URL = (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5001';
const getImageUrl = (url?: string): string => {
  if (!url) return '/placeholder.jpg';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
};

interface VariantPickerModalProps {
  product: Product;
  open: boolean;
  onClose: () => void;
}

export const VariantPickerModal = ({
  product,
  open,
  onClose,
}: VariantPickerModalProps) => {
  const { addItem, items } = useCartStore();
  const variants = product.variants ?? [];

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [quantityDraft, setQuantityDraft] = useState('1');

  // Auto-chọn variant đầu tiên khi mở
  useEffect(() => {
    if (open && variants.length > 0) {
      setSelectedVariantId(variants[0].variantId ?? (variants[0] as any).id);
      setQuantity(1);
    }
  }, [open]);

  const selectedVariant = variants.find(
    (v: any) => (v.variantId ?? v.id) === selectedVariantId
  );

  // Parse variant name → color + storage
  const parseVariantName = (name: string) => {
    const storageMatch = name.match(/(\d+(?:GB|TB))/i);
    const dashIdx = name.indexOf(' - ');
    const color = dashIdx >= 0 ? name.slice(dashIdx + 3).trim() : '';
    return { storage: storageMatch?.[1] || '', color };
  };

  const getVarColor = (v: any): string => {
    const vName = v.variantName || v.name || '';
    return parseVariantName(vName).color || v.attributes?.color || '';
  };
  const getVarStorage = (v: any): string => {
    const vName = v.variantName || v.name || '';
    return parseVariantName(vName).storage || v.attributes?.storage || '';
  };

  const getUniqueValues = (getter: (v: any) => string): string[] => {
    const seen = new Set<string>();
    return variants
      .map(getter)
      .filter((val: string) => { if (!val || seen.has(val)) return false; seen.add(val); return true; });
  };

  const colorValues = getUniqueValues(getVarColor);
  const storageValues = getUniqueValues(getVarStorage);

  const getVariantByAttrs = (color?: string, storage?: string) => {
    return variants.find((v: any) => {
      const vColor = getVarColor(v);
      const vStorage = getVarStorage(v);
      return (!color || vColor === color) && (!storage || vStorage === storage);
    });
  };

  const selectedColor = selectedVariant ? getVarColor(selectedVariant) : colorValues[0];
  const selectedStorage = selectedVariant ? getVarStorage(selectedVariant) : storageValues[0];

  const handleSelectColor = (color: string) => {
    const v = getVariantByAttrs(color, selectedStorage);
    if (v) setSelectedVariantId((v as any).variantId ?? (v as any).id);
  };
  const handleSelectStorage = (storage: string) => {
    const v = getVariantByAttrs(selectedColor, storage);
    if (v) setSelectedVariantId((v as any).variantId ?? (v as any).id);
  };

  // Tính giá
  const basePrice = Number(product.salePrice || product.price || 0);
  const displayPrice = selectedVariant
    ? ((selectedVariant as any).priceAdjustment != null && !isNaN(Number((selectedVariant as any).priceAdjustment))
        ? basePrice + Number((selectedVariant as any).priceAdjustment)
        : Number((selectedVariant as any).price || basePrice))
    : basePrice;

  // Tính stock
  const stockToUse = selectedVariant
    ? getProductPurchaseStockLimit(product, selectedVariant)
    : product.stockQuantity;
  const availableStock = getRemainingProductQuantity(items, product, selectedVariant);
  const isDisabled = stockToUse <= 0 || availableStock <= 0;

  useEffect(() => {
    if (!open) return;

    setQuantity((currentQuantity) => {
      if (availableStock <= 0) {
        return 0;
      }

      if (currentQuantity < 1) {
        return 1;
      }

      if (currentQuantity > availableStock) {
        return availableStock;
      }

      return currentQuantity;
    });
  }, [availableStock, open]);

  useEffect(() => {
    if (!open) return;
    setQuantityDraft(String(quantity));
  }, [open, quantity]);

  const handleQuantityDraftChange = (rawValue: string) => {
    if (!/^\d*$/.test(rawValue)) {
      return;
    }

    if (rawValue !== '' && Number(rawValue) > availableStock) {
      toast.error(CART_QUANTITY_EXCEEDED_MESSAGE);
      return;
    }

    setQuantityDraft(rawValue);
  };

  const resolveQuantityDraft = () => {
    const fallbackQuantity = availableStock > 0
      ? Math.min(Math.max(quantity, 1), availableStock)
      : 0;

    if (quantityDraft === '') {
      return fallbackQuantity;
    }

    const parsedQuantity = Number(quantityDraft);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      return fallbackQuantity;
    }

    if (parsedQuantity > availableStock) {
      toast.error(CART_QUANTITY_EXCEEDED_MESSAGE);
      return fallbackQuantity;
    }

    return availableStock > 0 ? Math.max(1, parsedQuantity) : 0;
  };

  const commitQuantityDraft = () => {
    const nextQuantity = resolveQuantityDraft();
    setQuantity(nextQuantity);
    setQuantityDraft(String(nextQuantity));
    return nextQuantity;
  };

  if (!open) return null;

  const handleAdd = () => {
    if (!selectedVariantId) {
      toast.error('Vui lòng chọn phiên bản');
      return;
    }
    const nextQuantity = commitQuantityDraft();
    if (nextQuantity <= 0 || nextQuantity > availableStock) {
      toast.error(CART_QUANTITY_EXCEEDED_MESSAGE);
      return;
    }
    addItem(product, nextQuantity, selectedVariantId);
    toast.success(`Đã thêm ${product.name} vào giỏ hàng!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-4 p-5 border-b border-gray-100">
          <img
            src={getImageUrl(product.mainImage)}
            alt={product.name}
            className="w-20 h-20 object-contain rounded-2xl bg-gray-50 p-2"
            onError={e => { (e.target as HTMLImageElement).src = '/placeholder.jpg'; }}
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 text-sm line-clamp-2">{product.name}</h3>
            <p className="text-xl font-black text-red-600 mt-1">
              {displayPrice.toLocaleString('vi-VN')}₫
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Kho: {stockToUse} • Có thể thêm: {availableStock}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Chọn màu sắc */}
          {colorValues.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                Màu sắc: <span className="text-gray-800">{selectedColor}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {colorValues.map(color => {
                  const isAvailable = !!getVariantByAttrs(color, selectedStorage);
                  const isSelected = selectedColor === color;
                  return (
                    <button key={color} onClick={() => handleSelectColor(color)}
                      disabled={!isAvailable}
                      className={`px-3.5 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                          : isAvailable
                            ? 'border-gray-200 text-gray-700 hover:border-blue-300 bg-white'
                            : 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed line-through'
                      }`}>
                      {isSelected && <Check size={12} className="inline mr-1" />}
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chọn dung lượng */}
          {storageValues.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                Dung lượng: <span className="text-gray-800">{selectedStorage}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {storageValues.map(storage => {
                  const isAvailable = !!getVariantByAttrs(selectedColor, storage);
                  const isSelected = selectedStorage === storage;
                  return (
                    <button key={storage} onClick={() => handleSelectStorage(storage)}
                      disabled={!isAvailable}
                      className={`px-3.5 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : isAvailable
                            ? 'border-gray-200 text-gray-700 hover:border-blue-300 bg-white'
                            : 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed line-through'
                      }`}>
                      {storage}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Số lượng */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">Số lượng</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => quantity > 1 && setQuantity(q => q - 1)}
                  disabled={quantity <= 1 || isDisabled}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition-colors">
                  <Minus size={16} />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  value={quantityDraft}
                  disabled={isDisabled}
                  onChange={(event) => handleQuantityDraftChange(event.target.value)}
                  onBlur={commitQuantityDraft}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.currentTarget.blur();
                    }
                  }}
                  className="w-12 bg-transparent text-center font-bold text-gray-800 outline-none disabled:text-gray-400"
                  aria-label={`Số lượng ${product.name}`}
                />
                <button onClick={() => quantity < availableStock && setQuantity(q => q + 1)}
                  disabled={quantity >= availableStock || isDisabled}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition-colors">
                  <Plus size={16} />
                </button>
              </div>
              <span className="text-xs text-gray-400">
                {availableStock > 0
                  ? `Còn có thể thêm ${availableStock} sản phẩm`
                  : 'Đã đạt tối đa trong giỏ hàng'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={handleAdd}
            disabled={isDisabled || quantity <= 0}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg shadow-blue-100">
            <ShoppingCart size={16} />
            Thêm vào giỏ hàng — {(displayPrice * quantity).toLocaleString('vi-VN')}₫
          </button>
        </div>
      </div>
    </div>
  );
};
