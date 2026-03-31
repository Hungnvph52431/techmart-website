import React from 'react';
import { VietnamLocationPicker } from "@/features/locations/components/VietnamLocationPicker";
import { DeliveryForm } from '../hooks/useCheckoutAddress';

interface Props {
  open: boolean;
  onClose: () => void;
  // Truyền các state và hàm từ Hook vào đây
  form: DeliveryForm;
  updateForm: (field: keyof Omit<DeliveryForm, 'customerNote'>, value: string) => void;
  provinces: any[];
  wards: any[];
  selectedProvinceCode: string;
  selectedWardCode: string;
  loadingProvinces: boolean;
  loadingWards: boolean;
  locationError: string | null;
  onProvinceChange: (code: string) => void;
  onWardChange: (code: string) => void;
  onSubmit: () => void; // Hàm xác nhận dùng tạm form này
}

export const AddressFormModal: React.FC<Props> = ({ 
  open, onClose, form, updateForm, 
  provinces, wards, selectedProvinceCode, selectedWardCode, 
  loadingProvinces, loadingWards, locationError, 
  onProvinceChange, onWardChange, onSubmit
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-2xl mx-4 p-8" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-black uppercase tracking-widest text-gray-800 mb-6">Địa chỉ mới</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-black uppercase text-gray-400 mb-1 block">Họ tên *</label>
            <input
              value={form.shippingName}
              onChange={(e) => updateForm('shippingName', e.target.value)}
              placeholder="Họ và tên"
              className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-black uppercase text-gray-400 mb-1 block">Số điện thoại *</label>
            <input
              value={form.shippingPhone}
              onChange={(e) => updateForm('shippingPhone', e.target.value)}
              placeholder="Số điện thoại"
              className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none"
            />
          </div>
          
          <div className="md:col-span-2 mt-2">
             <VietnamLocationPicker
                provinceCode={selectedProvinceCode}
                wardCode={selectedWardCode}
                provinces={provinces}
                wards={wards}
                loadingProvinces={loadingProvinces}
                loadingWards={loadingWards}
                error={locationError}
                onProvinceChange={onProvinceChange}
                onWardChange={onWardChange}
              />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-black uppercase text-gray-400 mb-1 block">Địa chỉ cụ thể *</label>
            <input
              value={form.shippingAddress}
              onChange={(e) => updateForm('shippingAddress', e.target.value)}
              placeholder="Số nhà, tên đường..."
              className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-3 rounded-xl text-sm font-bold bg-gray-100 text-gray-600 hover:bg-gray-200">Trở lại</button>
          <button onClick={onSubmit} className="px-6 py-3 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 shadow-md">Hoàn thành</button>
        </div>
      </div>
    </div>
  );
};