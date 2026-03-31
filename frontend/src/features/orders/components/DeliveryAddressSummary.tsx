import React from 'react';
import { DeliveryForm } from '../hooks/useCheckoutAddress';

interface Props {
  form: DeliveryForm;
  onChangeClick: () => void;
  onNoteChange: (note: string) => void;
}

export const DeliveryAddressSummary: React.FC<Props> = ({ form, onChangeClick, onNoteChange }) => {
  const hasAddress = form.shippingName && form.shippingAddress && form.shippingCity;

  return (
    <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 shadow-sm relative overflow-hidden">
      {/* Shopee style border top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-red-500 to-blue-500 opacity-80"></div>
      
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
          <span className="text-2xl">📍</span> Địa Chỉ Nhận Hàng
        </h2>
        <button
          onClick={onChangeClick}
          className="text-sm font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider"
        >
          Thay đổi
        </button>
      </div>

      {hasAddress ? (
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 text-gray-800">
          <div className="font-black whitespace-nowrap text-base">
            {form.shippingName} {form.shippingPhone && `(+84) ${form.shippingPhone.replace(/^0/, '')}`}
          </div>
          <div className="text-sm font-medium text-gray-600">
            {`${form.shippingAddress}, ${form.shippingWard}, ${form.shippingDistrict ? form.shippingDistrict + ', ' : ''}${form.shippingCity}`}
          </div>
        </div>
      ) : (
        <div className="text-red-500 text-sm font-bold italic">
          Vui lòng chọn hoặc thêm địa chỉ giao hàng!
        </div>
      )}

      {/* Tách phần Ghi chú ra đây cho gọn UI */}
      <div className="mt-6 pt-4 border-t border-gray-100">
         <input
            type="text"
            value={form.customerNote}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Lưu ý cho người bán (Giao giờ hành chính, gọi trước khi giao...)"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
          />
      </div>
    </div>
  );
};